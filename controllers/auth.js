var _ = require('underscore');
var bcrypt = require('bcrypt');
var db = require('../db');
var email = require('../mandrill');
var logger = require('../logger');
var passwords = require('../lib/passwords');
var usernames = require('../lib/usernames');
var url = require('url');
var _ = require('underscore');

var learners = db.model('Learner');
var guardians = db.model('Guardian');
var signupTokens = db.model('SignupToken');
var passwordTokens = db.model('PasswordToken');

var ADULT_MIN_AGE = process.env.ADULT_MIN_AGE || 13;
var BCRYPT_SEED_ROUNDS = process.env.BCRYPT_SEED_ROUNDS || 10;
var CSOL_HOST = process.env.CSOL_HOST;
try {
  var CSOL_EMAIL_DOMAIN = process.env.CSOL_EMAIL_DOMAIN || url.parse(CSOL_HOST).hostname;
} catch (e) {
  console.log(e);
  var CSOL_EMAIL_DOMAIN = ''
}

function FieldError (field, message) {
  Object.defineProperties(this, {
    message: {
      enumerable: false,
      value: message
    },
    field: {
      enumerable: true,
      value: field
    }
  });
  Error.call(this, this.message);
}
FieldError.prototype = new Error();
FieldError.prototype.constructor = FieldError;
FieldError.prototype.toString = function () {
  return '[FieldException: ' + this.message + ' (' + this.field + ')]';
}

if (!CSOL_EMAIL_DOMAIN)
  throw new Error('Must specify valid CSOL_HOST or CSOL_EMAIL_DOMAIN in the environment');

function getFullUrl(origin, path) {
  if (!path) {
    path = origin;
    origin = CSOL_HOST;
  }

  if (!_.isObject(origin))
    origin = url.parse(origin);

  path = path || '';
  path = path.replace(/^\/?/, '');

  return url.format(_.extend(
    origin,
    { pathname: origin.path + path }));
}

function validateEmail (email) {
  if (!email.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/)) {
      return 'Invalid email address';
  }
  return true;
}

function generateUsername () {
  return usernames.generate();
}

function validateUsername (username) {
  try {
    return !!usernames.validate(username);
  } catch (e) {
    return e.message || e;
  }
}

function normalizeUsername (username) {
  return usernames.normalize(username);
}

function generatePassword () {
  return passwords.generate();
}

function validatePassword (password) {
  try {
    return !!passwords.validate(password);
  } catch (e) {
    return e.message || e;
  }
}

function validateAdultAgeCompliance (birthday) {
  var today = new Date();

  var cutoff = new Date(
    today.getFullYear() - ADULT_MIN_AGE,
    today.getMonth(),
    today.getDate()
  );

  return cutoff >= birthday;
}

function generateToken () {
  // There must be better ways of doing it than this!
  var now = Date.now();
  return ((Math.random() * now).toString(36) + '-' + (Math.random() * now).toString(36)).replace(/[^a-z0-9-]/ig, '-');
}

function extractUserData (user) {
  // This won't exist in actual user objects,
  // so assume it's one we've already built
  if ('home' in user) return user;

  var userType = user.daoFactoryName.toLowerCase();
  var userHome = (userType === 'learner') ? '/mybadges' : '/dashboard';

  return {
    id: user.id,
    username: user.username || user.email,
    email: user.email,
    type: userType,
    favorites: [],
    dependents: [],
    home: userHome,
    underage: user.underage
  };
}

function redirectUser (req, res, user, status) {
  req.session.user = extractUserData(user);
  var target = req.session.user.home;
  if (req.session.afterLogin) {
    target = req.session.afterLogin;
    delete req.session.afterLogin;
  }
  return res.redirect(status || 303, target);
}

function clearUser (req, res) {
  delete req.session.user;
  delete res.locals.user;
}

function processInitialLearnerSignup (req, res, next) {
  var signup = req.session.signup || {};
  var normalizedUsername = normalizeUsername(req.body['username']);

  signup.birthday_year = parseInt(req.body['birthday_year'], 10);
  signup.birthday_month = parseInt(req.body['birthday_month'], 10);
  signup.birthday_day = parseInt(req.body['birthday_day'], 10);
  signup.username = req.body['username'];

  var birthday = new Date(
    signup.birthday_year,
    signup.birthday_month - 1, // JS dates have 0-indexed months
    signup.birthday_day
  );

  function fail (err) {
    _.reduce(arguments, function(genericErrorShown, err) {
      if (!(err instanceof FieldError)) {
        req.flash('error', err);
        return genericErrorShown;
      }

      if (!genericErrorShown)
        req.flash('error', 'There were some problems signing you up - check the form below.')

      req.flash('field-error', err);

      return true;
    }, false);

    req.session.signup = signup;
    res.render('auth/signup.html', signup);
  }

  function finish (user) {
    signup.state = user.underage ? 'child' : 'more';
    signup.profileId = user.id;
    signup.passwordGenerated = false;
    signup.password = signup.generatedPassword = generatePassword();

    req.session.signup = signup;
    res.redirect(303, '/signup');
  }

  var errors = [];

  var isValidUsername = validateUsername(signup.username);
  if (isValidUsername !== true)
    errors.push(new FieldError('username', isValidUsername || 'This is not a valid username'));

  // Check for accidental February 30ths, etc
  var isValidDate = birthday.getFullYear() === signup.birthday_year
        && birthday.getMonth() === signup.birthday_month - 1
        && birthday.getDate() === signup.birthday_day;

  if (!isValidDate)
    errors.push(new FieldError('birthday', 'This is not a valid date.'));

  if (errors.length)
    return fail.apply(null, errors);

  var underage = !validateAdultAgeCompliance(birthday);

  // Due to sign-up being a two-step process, we're creating the user now to prevent
  // race conditions on usernames - even if the username does not exist now, it may
  // well have been created by the time sign-up is complete.
  // This will fail if the username is already being used
  learners.find({where: {username: normalizedUsername}})
    .error(fail)
    .success(function(user) {
      if (!user) {
        if (signup.profileId) {
          // Releasing previous user profile, which they might have created if
          // they've gone backwards in the sign-up process and started with
          // another username
          learners.find(signup.profileId).success(function(profile) {
            if (profile && !profile.complete)
              profile.destroy();
          });
        }

        return learners.create({
          username: normalizedUsername,
          password: '',
          underage: underage,
          birthday: birthday
        }).error(fail).success(finish);
      }

      if (user.id !== signup.profileId)
        return fail(new FieldError('username', 'This username is already in use'));

      user.updateAttributes({
        underage: underage,
        birthday: birthday
      }).error(fail).success(function() {
        finish(user);
      });
    });
}

function processChildLearnerSignup (req, res, next) {
  var signup = req.session.signup || {};
  var normalizedUsername = normalizeUsername(signup.username);

  signup.first_name = req.body['first_name'].replace(/^\s*|\s*$/g, '');
  signup.last_name = req.body['last_name'].replace(/^\s*|\s*$/g, '');
  signup.parent_email = req.body['parent_email'].replace(/^\s*|\s*$/g, '');

  if ('password' in req.body)
    signup.password = req.body['password'];

  function fail (err) {
    _.reduce(arguments, function(genericErrorShown, err) {
      if (!(err instanceof FieldError)) {
        req.flash('error', err);
        return genericErrorShown;
      }

      if (!genericErrorShown)
        req.flash('error', 'There were some problems signing you up - check the form below.')

      req.flash('field-error', err);

      return true;
    }, false);

    req.session.signup = signup;
    res.render('auth/signup-next-child.html', signup);
  }

  var errors = [];

  if (!signup.first_name)
    errors.push(new FieldError('first_name', 'Missing first name'));

  if (!signup.last_name)
    errors.push(new FieldError('last_name', 'Missing last name'));

  if (!signup.parent_email) {
    errors.push(new FieldError('parent_email', 'Missing email address'));
  } else {
    var isValidEmail = validateEmail(signup.parent_email);
    if (isValidEmail !== true)
      errors.push(new FieldError('parent_email', isValidEmail || 'Invalid email address'));
  }

  if (!signup.password) {
    errors.push(new FieldError('password', 'Missing password'));
  } else {
    var isValidPassword = validatePassword(signup.password);
    if (isValidPassword !== true)
      errors.push(new FieldError('password', isValidPassword || 'Invalid password'));
  }

  if (errors.length)
    return fail.apply(null, errors);

  learners.find({where: {username: normalizedUsername}})
    .complete(function(err, user) {
      if (err || !user) return fail(err);

      signupTokens.create({
        email: signup.parent_email,
        token: generateToken()
      }).complete(function(err, token) {
        if (err || !token) return fail(err);

        token.setLearner(user); // Assuming this worked

        bcrypt.hash(signup.password, BCRYPT_SEED_ROUNDS, function(err, hash) {
          if (err || !hash) return fail(err);

          user.updateAttributes({
            complete: true,
            password: hash,
            firstName: signup.first_name,
            lastName: signup.last_name,
            email: normalizedUsername + '@' + CSOL_EMAIL_DOMAIN
          }).complete(function(err) {
            if (err) return fail(err);

            var confirmationUrl = req.protocol + '://' + req.get('Host')
              + '/signup/' + token.token;
            email.send('<13 learner signup', {
              earnername: signup.username,
              confirmationUrl: confirmationUrl
            }, signup.parent_email);
            delete req.session.signup;
            req.flash('modal', {
              title: 'Welcome to the Chicago Summer of Learning',
              value:
                '<p>You have been given a temporary account for 10 days.</p>' +
                '<p>Please make sure that your guardian checks their email so they can register you for a permanent account where you can apply for badges and much more.</p>'
              ,
              buttons: {
                'Get Started!': 'primary'
              }
            });
            redirectUser(req, res, user);
          });
        });
      });
  });
}

function processStandardLearnerSignup (req, res, next) {
  var signup = req.session.signup || {};
  var form = req.body;
  var normalizedUsername = normalizeUsername(signup.username);

  signup.first_name = (form.first_name||'').trim();
  signup.last_name = (form.last_name||'').trim();
  signup.email = (form.email||'').trim();

  signup.school = (form.school||'').trim();
  signup.studentId = (form.studentId||'').trim();
  signup.gender = form.gender || null;
  signup.raceEthnicity = form.raceEthnicity;
  signup.zipCode = (form.zipCode||'').trim();

  if ('password' in req.body)
    signup.password = req.body['password'];

  signup.passwordGenerated = false;

  function fail (err) {
    _.reduce(arguments, function(genericErrorShown, err) {
      if (!(err instanceof FieldError)) {
        req.flash('error', err);
        return genericErrorShown;
      }

      if (!genericErrorShown)
        req.flash('error', 'There were some problems signing you up - check the form below.')

      req.flash('field-error', err);

      return true;
    }, false);

    req.session.signup = signup;
    res.render('auth/signup-next.html', signup);
  }

  var errors = [];

  if (!signup.first_name)
    errors.push(new FieldError('first_name', 'Missing first name'));

  if (!signup.last_name)
    errors.push(new FieldError('last_name', 'Missing last name'));

  if (!signup.email) {
    errors.push(new FieldError('email', 'Missing email address'));
  } else {
    var isValidEmail = validateEmail(signup.email);
    if (isValidEmail !== true)
      errors.push(new FieldError('email', isValidEmail || 'Invalid email address'));
  }

  if (!signup.password) {
    errors.push(new FieldError('password', 'Missing password'));
  } else {
    var isValidPassword = validatePassword(signup.password);
    if (isValidPassword !== true)
      errors.push(new FieldError('password', isValidPassword || 'Invalid password'));
  }

  if (errors.length)
    return fail.apply(null, errors);

  learners.find({where: {username: normalizedUsername}})
    .complete(function(err, user) {
      if (err || !user) return fail(err);

      bcrypt.hash(signup.password, BCRYPT_SEED_ROUNDS, function(err, hash) {
        if (err || !hash) return fail(err);

        user.updateAttributes({
          complete: true,
          firstName: signup.first_name,
          lastName: signup.last_name,
          email: signup.email,
          school: signup.school,
          cpsStudentId: signup.studentId,
          gender: signup.gender,
          raceEthnicity: signup.raceEthnicity,
          zipCode: signup.zipCode,
          password: hash
        }).complete(function(err) {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY')
              return fail(new FieldError('email', 'This email address is already in use'));
            return fail(err);
          }

          email.send('learner signup', { earnername:signup.username }, signup.email);
          delete req.session.signup;
          redirectUser(req, res, user);
        });
      });
  });
}

module.exports = function (app) {

  app.use(function(req, res, next) {
    if (!req.session.user) {
      res.locals.user = undefined;
      return next();
    }

    var user = req.session.user,
        model = db.model(user.type);

    model.find(user.id)
      .complete(function (err, dbUser) {
        if (err)
          console.log('Error loading user:', err);

        if (!dbUser) {
          console.log('Could not find user "' + user.name + '" in database');
          clearUser(req, res);
          return next();
        }

        // Showing this notification to underage learners without guardians
        // across the site, so doing it here
        if (dbUser.underage && !dbUser.GuardianId)
          req.flash('block', 'We are waiting for your parent or guardian to approve your account.');

        _.functions(dbUser).forEach(function(method) {
          if (/^(get|set|add|remove|has)[A-Z]/.test(method))
            user[method] = dbUser[method].bind(dbUser);
        });

        res.locals.user = user;
        next();
      });
  });

  app.get('/login', function (req, res, next) {
    if (req.session.user) return redirectUser(req, res, req.session.user);

    res.render('auth/login.html');
  });

  app.post('/login', function (req, res, next) {
    var username = req.body['username'];
    var normalizedUsername = normalizeUsername(username);
    var password = req.body['password'];

    function finalize (err, user) {
      if (err || !user) {
        req.flash('error', err || 'Unable to log in. Please try again.')
        return res.render('auth/login.html', {
          username: username
        });
      }

      redirectUser(req, res, user);
    }

    function validateUser (user) {
      if (!user)
        return finalize(new Error('Username or password incorrect'));

      bcrypt.compare(password, user.password, function(err, match) {
        if (err || !match)
          return finalize(err || new Error('Username or password incorrect'));

        finalize(null, user);
      });
    }

    if (!username || !password)
      return finalize(new Error('Missing username or password'));

    // Annoying redundancy here, but no other obvious way to generate OR queries
    learners.find({where: ["`email`=? OR `username`=?", normalizedUsername, normalizedUsername]})
      .complete(function(err, user) {
        if (err) return finalize(err);
        if (user) return validateUser(user);

        guardians.find({where: {email: username}})
          .complete(function(err, user) {
            if (err) return finalize(err);

            validateUser(user)
          });
      });
  });

  app.get('/login/password', function (req, res, next) {
    res.render('auth/password.html');
  });

  app.post('/login/password', function(req, res, next) {
    var username = req.body.username;
    var normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername)
      return res.redirect('/login/password');

    function sendResetEmail (user, resetUrl) {
      function send (address) {
        email.send('password reset', {
          earnername: user.getDisplayName(),
          resetUrl: resetUrl
        }, address);
      }

      if (!user.underage)
        return send(user.email);

      user.getGuardian()
        .complete(function(err, guardian) {
          if (!err && guardian)
            send(guardian.email);
        });
    }

    function finalize (err, user) {
      if (err || !user) {
        err && req.flash('error', err);
        return res.redirect('/login/password');
      }

      var userId = user.id,
          userType = user.daoFactoryName.toLowerCase();

      passwordTokens.find({where: {
        userId: userId,
        userType: userType
      }})
        .complete(function (err, token) {
          if (token) {
            token.updateAttributes({
              expired: true
            });
          }

          var token = generateToken();

          passwordTokens.create({
            token: token,
            userId: userId,
            userType: userType
          })
            .complete(function(err, token) {
              if (err || !token)
                return finalize(err);

              sendResetEmail(user, getFullUrl('/login/password/' + token.token));

              res.render('/auth/password-notified.html', {
                notifyUser: user
              });
            });
        });
    }

    learners.find({where: ["`email`=? OR `username`=?", normalizedUsername, normalizedUsername]})
      .complete(function(err, user) {
        if (err)
          return finalize(err);

        if (user)
          return finalize(null, user);

        guardians.find({where: {email: username}})
          .complete(finalize);
      });
  });

  app.param('passwordToken', function (req, res, next, token) {
    passwordTokens.find({where: {token: token}})
      .complete(function(err, token) {
        if (err || !token || !token.isValid()) {
          req.flash('error', 'Sorry, that link has expired. Please start again.');
          return res.redirect('/login/password');
        }

        req.params.passwordToken = token;
        next();
      });
  });

  app.get('/login/password/:passwordToken', function (req, res, next) {
    var token = req.params.passwordToken;

    token.getUser(function (err, user) {
      if (err) {
        req.flash('error', 'Sorry, that link has expired. Please start again.');
        return res.redirect('/login/password');
      }

      if (token.userType === 'learner') {
        var password = generatePassword();
      } else {
        var password = null;
      }

      req.session.generatedPassword = password;

      res.render('/auth/password-reset.html', {
        passwordGenerated: false,
        password: password
      });
    })
  });

  app.post('/login/password/:passwordToken', function (req, res, next) {
    var generatedPassword = req.session.generatedPassword;
    var token = req.params.passwordToken;
    var username = req.body.username;
    var password = 'password' in req.body ? req.body.password : generatedPassword;

    function finalize (err) {
      delete req.session.generatedPassword;

      if (err) {
        req.flash('error', err);
        return res.redirect(301, '/login/password');
      }

      req.flash('success', 'Your password has been reset.');
      res.redirect(303, '/login');
    }

    function sendConfirmationEmail (user) {
      function send(address) {
        email.send('password reset', {
          earnername: user.getDisplayName()
        }, address);
      }

      if (!user.underage)
        return send(user.email);

      user.getGuardian()
        .complete(function(err, guardian) {
          if (!err && guardian)
            send(guardian.email);
        });
    }

    function updateUserPassword (user) {
      bcrypt.hash(password, BCRYPT_SEED_ROUNDS, function(err, hash) {
        if (err || !hash)
          return finalize(err || 'Failed to generate new password - please try again.');

        user.updateAttributes({
          password: hash
        }).complete(function(err) {
          if (err)
            return finalize(err);

          sendConfirmationEmail(user);

          finalize();
        });
      });
    }

    var isValidPassword = validatePassword(password);
    if (isValidPassword !== true) {
      req.flash('error', isValidPassword || 'This is not a valid password');
      return res.redirect('/login/password/' + token.token);
    }

    token.updateAttributes({
      expired: true
    })
      .complete(function (err) {
        if (err)
          return finalize(err);

        token.getUser(function (err, user) {
          if (user.email === username || user.username === normalizeUsername(username))
            return updateUserPassword(user);

          if (!user.GuardianId)
            return finalize('Invalid username or email address');

          // Make allowances for situations where guardians have entered their
          // own email address when resetting their child's password

          user.getGuardian()
            .complete(function (err, guardian) {
              if (err || !guardian)
                return finalize('Invalid username or email address');

              updateUserPassword(user);
            });
        });
      });
  });

  app.get('/signup', function (req, res, next) {
    clearUser(req, res);

    var signup = req.session.signup || {};

    if (signup.state === 'child')
      return res.render('auth/signup-next-child.html', signup);

    if (signup.state === 'more')
      return res.render('auth/signup-next.html', signup);

    if (signup.state === 'initial')
      return res.render('auth/signup.html', signup);

    req.session.signup = signup = {
      example: usernames.generate()
    };

    res.render('auth/signup.html', signup);
  });

  app.post('/signup', function (req, res, next) {
    var signup = req.session.signup || {};

    if (req.body['action'] === 'go-back') {
      var form = req.body;

      'first_name' in form && (signup.first_name = (form.first_name||'').trim());
      'last_name' in form && (signup.last_name = (form.last_name||'').trim());
      'email' in form && (signup.email = (form.email||'').trim());
      'parent_email' in form && (signup.parent_email = (form.parent_email||'').trim());

      'school' in form && (signup.school = (form.school||'').trim());
      'studentId' in form && (signup.studentId = (form.studentId||'').trim());
      'gender' in form && (signup.gender = form.gender || null);
      'raceEthnicity' in form && (signup.raceEthnicity = form.raceEthnicity);
      'zipCode' in form && (signup.zipCode = (form.zipCode||'').trim());

      signup.state = 'initial';

      req.session.signup = signup;
      return res.redirect('/signup');
    }

    if (req.body['action'] === 'restart') {
      return learners.find(signup.profileId)
        .complete(function(err, profile) {
          if (profile && !profile.complete)
            profile.destroy();

          delete req.session.signup;
          return res.redirect('/signup');
        });
    }

    if (signup.state === 'child')
      return processChildLearnerSignup(req, res, next);

    if (signup.state === 'more')
      return processStandardLearnerSignup(req, res, next);

    processInitialLearnerSignup(req, res, next, signup);
  });

  app.get('/signup/parents', function (req, res, next) {
    clearUser(req, res);

    res.render('auth/signup-parent.html');
  });

  app.post('/signup/parents', function (req, res, next) {
    var email = req.body['email'];
    var password = req.body['password'];

    function finalize (err, user) {
      if (err || !user) {
        req.flash('error', err || 'Unable to complete sign-up process. Please try again.')
        return res.render('auth/signup-parent.html', {
          email: email
        });
      }

      redirectUser(req, res, user);
    }

    if (!email || !password)
      return finalize(new Error('Missing email or password'));

    var isValidEmail = validateEmail(email);
    if (isValidEmail !== true)
      return finalize(new Error(isValidEmail || 'Invalid email address'));

    var isValidPassword = validatePassword(password);
    if (isValidPassword !== true)
      return finalize(new Error(isValidPassword || 'Invalid password'));

    guardians.find({where: {email: email}})
      .complete(function(err, user) {
        if (err) return finalize(err);

        if (user) {
          console.log('Guardian with email address ' + email + ' already exists');
          return finalize(new Error('Email address already in use.'));
        }

        console.log('Guardian not found');
        bcrypt.hash(password, BCRYPT_SEED_ROUNDS, function(err, hash) {
          if (err || !hash)
            return finalize(err || new Error('Unable to create an account. Please try again.'));

          console.log('Password hashed:', hash);
          guardians.create({email: email, password: hash})
            .complete(function(err, user) {
              if (err || !user)
                return finalize(err);

              return finalize(null, user);
            });
        });
      });
  });

  app.get('/signup/generate_username', function (req, res, next) {
    res.contentType('text/plain');
    res.send(generateUsername());
  });

  app.param('signupToken', function (req, res, next, token) {
    signupTokens.find({where: {token: token}})
      .complete(function(err, token) {
        if (err || !token || !token.isValid())
          return res.redirect('/');

        req.params.signupToken = token;
        next();
      });
  });

  app.get('/signup/:signupToken', function (req, res, next) {
    function render (err) {
      res.render('auth/signup-guardian.html', {
        auto_email: req.params.signupToken.email,
        errors: err ? [err] : null
      });
    }

    // See if this email address is already being used.
    guardians.find({where: {email: req.params.signupToken.email}})
      .complete(function(err, guardian) {
        if (guardian) {
          // This guardian has already signed up, so we're just
          // going to process them through automatically.
          return req.params.signupToken.finalize(guardian, function(err, learner) {
            if (err)
              return render(err);

            redirectUser(req, res, guardian);
          });
        }

        // Otherwise, unless there was an error, this is the first
        // time the guardian has been visited.
        render(err);
      });
  });

  app.post('/signup/:signupToken', function (req, res, next) {
    var email = req.params.signupToken.email;
    var password = req.body['password'];

    function fail (err) {
      req.flash('error', err || 'Unable to create an account. Please try again.')
      res.render('auth/signup-guardian.html', {
        auto_email: email,
        errors: [err || new Error('Unable to create an account. Please try again.')]
      });
    }

    // This shouldn't happen, but just in case
    if (!email)
      return fail('Missing email address')

    if (!password)
      return fail('Missing password')

    var isValidPassword = validatePassword(password);
    if (isValidPassword !== true)
      return fail(isValidPassword || 'Please enter a valid password')

    guardians.find({where: {email: email}})
      .complete(function(err, guardian) {
        if (err)
          return fail(err);

        // We've found a guardian already using this email address.
        // Normally, we shouldn't get here, but just in case.
        if (guardian)
          return fail('This email address is already in use');

        // Otherwise, we're all set.
        bcrypt.hash(password, BCRYPT_SEED_ROUNDS, function(err, hash) {
          if (err || !hash)
            return fail(err);

          guardians.create({email: email, password: hash})
            .complete(function(err, guardian) {
              if (err || !guardian)
                return fail(err);

              req.params.signupToken.finalize(guardian, function(err, learner) {
                if (err)
                  return fail(err);

                redirectUser(req, res, guardian);
              });
            });
        });
      })
  });

  app.get('/logout', function (req, res, next) {
    clearUser(req, res);

    return res.redirect('/');
  });

};
