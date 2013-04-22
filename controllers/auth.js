var bcrypt = require('bcrypt');
var db = require('../db');
var learners = db.model('Learner');
var guardians = db.model('Guardian');
var signupTokens = db.model('SignupToken');

var COPPA_MAX_AGE = process.env.COPPA_MAX_AGE || 13;
var BCRYPT_SEED_ROUNDS = process.env.BCRYPT_SEED_ROUNDS || 10;


function validateEmail (email) {
  // TODO - make sure email is valid
  return true;
}

function normalizeUsername (username) {
  // For now, just remove white space and lower case it
  return (''+username).replace(/\s/g, '').toLowerCase();
}

function validateUsername (username) {
  // TODO - make sure username is valid
  return true;
}

function generatePassword () {
  // TODO - generate an actual password
  return 'GeneratedPassword';
}

function validatePassword (password) {
  // TODO - make sure password is valid
  return true;
}

function validateCoppaCompliance (birthday) {
  var today = new Date();

  var cutoff = new Date(
    today.getFullYear() - COPPA_MAX_AGE,
    today.getMonth(),
    today.getDate()
  );

  return cutoff > birthday;
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
  var userHome = (userType === 'learner') ? '/backpack' : '/dashboard';

  return {
    id: user.id,
    username: user.username || user.email,
    email: user.email,
    type: userType,
    favorites: [],
    dependents: [],
    home: userHome
  };
}

function redirectUser (req, res, user, status) {
  req.session.user = extractUserData(user);
  return res.redirect(status || 303, req.session.user.home);
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
    signup.errors = [err || new Error('Unable to complete sign-up process. Please try again.')];
    req.session.signup = signup;
    res.render('auth/signup-learner.html', signup);
  }

  if (!validateUsername(signup.username))
    return fail(new Error('This is not a valid nickname'));

  // Check for accidental February 30ths, etc
  var isValidDate = birthday.getFullYear() === signup.birthday_year
        && birthday.getMonth() === signup.birthday_month - 1
        && birthday.getDate() === signup.birthday_day;

  if (!isValidDate)
    return fail(new Error('This is not a valid date.'));

  var underage = !validateCoppaCompliance(birthday);

  // Due to sign-up being a two-step process, we're creating the user now to prevent
  // race conditions on usernames - even if the username does not exist now, it may
  // well have been created by the time sign-up is complete.
  // This will fail if the username is already being used
  learners.create({username: normalizedUsername, password: '', underage: underage})
    .error(function(err) {
      // Did try a `findOrCreate`, but couldn't get `isNewRecord` to work
      if (err.code === 'ER_DUP_ENTRY')
        return fail(new Error('This nickname is already in use'));

      return fail(err);
    })
    .success(function(user) {
      signup.state = underage ? 'child' : 'more';
      signup.password = generatePassword();
      req.session.signup = signup;
      res.redirect(303, '/signup/learners');
    });
}

function processChildLearnerSignup (req, res, next) {
  var signup = req.session.signup || {};
  var normalizedUsername = normalizeUsername(signup.username);

  signup.parent_email = req.body['parent_email'];

  function fail (err) {
    signup.errors = [err || new Error('Unable to complete sign-up process. Please try again.')];
    req.session.signup = signup;
    res.render('auth/signup-child.html', signup);
  }

  if (!signup.parent_email)
    return fail(new Error('Missing email address'));

  if (!validateEmail(signup.parent_email))
    return fail(new Error('Invalid email address'));

  learners.find({where: {username: normalizedUsername}})
    .complete(function(err, user) {
      if (err || !user) return fail(err);

      signupTokens.create({
        email: signup.parent_email,
        token: generateToken(),
      }).complete(function(err, token) {
        if (err || !token) return fail(err);

        // TODO - send an email

        token.setLearner(user); // Assuming this worked

        bcrypt.hash(signup.password, BCRYPT_SEED_ROUNDS, function(err, hash) {
          if (err || !hash) return fail(err);

          user.updateAttributes({
            complete: true,
            password: hash
          }).complete(function(err) {
            if (err) return fail(err);

            delete req.session.signup;
            redirectUser(req, res, user);
          });
        });
      });
  });
}

function processStandardLearnerSignup (req, res, next) {
  var signup = req.session.signup || {};
  var normalizedUsername = normalizeUsername(signup.username);

  signup.email = req.body['email'];
  if ('password' in req.body)
    signup.password = req.body['password'];

  function fail (err) {
    signup.errors = [err || new Error('Unable to complete sign-up process. Please try again.')];
    req.session.signup = signup;
    res.render('auth/signup-learner-more.html', signup);
  }

  if (!signup.email || !signup.password)
    return fail(new Error('Missing email address or password'));

  if (!validateEmail(signup.email))
    return fail(new Error('Invalid email address'));

  if (!validatePassword(signup.password))
    return fail(new Error('Invalid password'));

  learners.find({where: {username: normalizedUsername}})
    .complete(function(err, user) {
      if (err || !user) return fail(err);

      bcrypt.hash(signup.password, BCRYPT_SEED_ROUNDS, function(err, hash) {
        if (err || !hash) return fail(err);

        user.updateAttributes({
          complete: true,
          email: signup.email,
          password: hash
        }).complete(function(err) {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY')
              return fail(new Error('This email address is already in use'));
            return fail(err);
          }

          delete req.session.signup;
          redirectUser(req, res, user);
        });
      });
  });
}

module.exports = function (app) {

  app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    next();
  });

  app.get('/login', function (req, res, next) {
    if (req.session.user) return redirectUser(req, res, req.session.user);

    res.render('auth/login.html');
  });

  app.post('/login', function (req, res, next) {
    var username = req.body['username'];
    var password = req.body['password'];

    function finalize (err, user) {
      if (err || !user) {
        return res.render('auth/login.html', {
          username: username,
          errors: [err || new Error('Unable to log in. Please try again.')]
        });
      }

      redirectUser(req, res, user);
    }

    function validateUser (user) {
      if (!user)
        return finalize(new Error('Nickname or password incorrect'));

      bcrypt.compare(password, user.password, function(err, match) {
        if (err || !match)
          return finalize(err || new Error('Nickname or password incorrect'));

        finalize(null, user);
      });
    }

    if (!username || !password)
      return finalize(new Error('Missing nickname or password'));

    // Annoying redundancy here, but no other obvious way to generate OR queries
    learners.find({where: ["`email`=? OR `username`=?", username, username]})
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
    res.render('auth/password.html')
  });

  app.post('/login/password', function(req, res, next) {
    res.send('POST /login/password')
  });

  app.get('/signup', function (req, res, next) {
    clearUser(req, res);

    res.render('/auth/signup.html');
  });

  app.get('/signup/learners', function (req, res, next) {
    clearUser(req, res);

    var signup = req.session.signup || {};

    if (signup.state === 'child')
      return res.render('auth/signup-child.html', signup);

    if (signup.state === 'more')
      return res.render('auth/signup-learner-more.html', signup);

    delete req.session.signup;
    res.render('auth/signup-learner.html');
  });

  app.post('/signup/learners', function (req, res, next) {
    var signup = req.session.signup || {};
    delete signup.errors;

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
        return res.render('auth/signup-parent.html', {
          email: email,
          errors: [err || new Error('Unable to complete sign-up process. Please try again.')]
        });
      }

      redirectUser(req, res, user);
    }

    if (!email || !password)
      return finalize(new Error('Missing email or password'));

    if (!validateEmail(email))
      return finalize(new Error('Invalid email address'));

    if (!validatePassword(password))
      return finalize(new Error('Invalid password'));

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

  app.param('signupToken', function (req, res, next, token) {
    signupTokens.find({where: {token: token}})
      .complete(function(err, token) {
        if (!err && token && token.isValid()) {
          req.params.signupToken = token;
          next();
        }

        // Not sure whether we really want to redirect here,
        // or if we just want to report the error somehow.
        return res.redirect('/signup/parents');
      });
  });

  app.get('/signup/:signupToken', function (req, res, next) {
    res.render('auth/signup-parent.html', {
      auto_email: req.params.signupToken.email
    });
  });

  app.post('/signup/:signupToken', function (req, res, next) {
    var email = req.params.signupToken.email;
    var password = req.body['password'];

    // This should probably be refactored to share code with standard guardian signup

    function fail (err) {
      res.render('auth/signup-parent.html', {
        auto_email: email,
        errors: [err || new Error('Unable to create an account. Please try again.')]
      });
    }

    function finalize (err, user) {
      if (err || !user) return fail(err);

      req.params.signupToken.getLearner()
        .complete(function(err, learner) {
          if (err) return failOut(err);

          if (learner) {
            // For now, just going to assume this works
            learner.setGuardian(user);
          }

          // Set the token to be expired
          req.params.signupToken.updateAttributes({
            expired: true
          }).complete(function(err) {
            if (err) return fail(err);

            redirectUser(req, res, user);
          });
        });
    }

    if (!email || !password)
      return finalize(new Error('Missing email or password'));

    guardians.find({where: {email: email}})
      .complete(function(err, user) {
        if (user)
          return finalize(new Error('Email address already in use.'));

        bcrypt.hash(password, BCRYPT_SEED_ROUNDS, function(err, hash) {
          if (err || !hash)
            return finalize(err);

          console.log('Password hashed:', hash);
          guardians.create({email: email, password: hash})
            .complete(finalize);
        });
      });
  });

  app.get('/logout', function (req, res, next) {
    clearUser(req, res);

    return res.redirect('/');
  });

};