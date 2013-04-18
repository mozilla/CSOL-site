const bcrypt = require('bcrypt');
const db = require('../db');
const learners = db.model('Learner');
const guardians = db.model('Guardian');
const signupTokens = db.model('SignupToken');

module.exports = function (app) {

  var validateEmail = function (email) {
    // TODO - make sure email is valid
    return true;
  }

  var normalizeUsername = function (username) {
    // For now, just remove white space and lower case it
    return (''+username).replace(/\s/g, '').toLowerCase();
  }

  var validateUsername = function (username) {
    // TODO - make sure username is valid
    return true;
  }

  var generatePassword = function () {
    return 'GeneratedPassword';
  }

  var validatePassword = function (password) {
    // TODO - make sure password is valid
    return true;
  }

  var generateToken = function () {
    // There must be better ways of doing it than this!
    var now = Date.now();
    return ((Math.random() * now).toString(36) + '-' + (Math.random() * now).toString(36)).replace(/[^a-z0-9-]/ig, '-');
  }

  var extractUserData = function (user) {
    var userType = user.daoFactoryName.toLowerCase(),
        userHome;

    switch (userType) {
      case 'learner':
        userHome = '/backpack';
        break
      default:
        userHome = '/dashboard';
    }

    return {
      id: user.id,
      username: user.username || user.email,
      email: user.email,
      type: userType,
      is_valid: true,
      favorites: [],
      dependents: [],
      home: userHome
    };
  }

  var redirectUser = function (req, res, user, status) {
    req.session.user = extractUserData(user);
    return res.redirect(req.session.user.home, status || 303);
  }

  app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    next();
  });

  app.get('/login', function (req, res, next) {
    console.log(generateToken());
    if (req.session.user) {
      return res.redirect('/backpack', 303);
    } else {
      res.render('auth/login.html');
    }
  });

  app.post('/login', function (req, res, next) {
    var username = req.body['username'],
        password = req.body['password'];

    var finalize = function(err, user) {
      if (err) {
        res.render('auth/login.html', {
          username: username,
          errors: [err]
        });
      } else {
        redirectUser(req, res, user);
      }
    }

    var validateUser = function(user) {
      if (user) {
        bcrypt.compare(password, user.password, function(err, match) {
          if (err || !match) {
            finalize(new Error(err || 'Nickname or password incorrect'));
          } else {
            finalize(null, user);
          }
        });
      } else {
        finalize(new Error('Nickname or password incorrect'));
      }
    }

    if (!username || !password) {
      finalize(new Error('Missing nickname or password'));
    } else {
      // Annoying redundancy here, but no other obvious way to generate OR queries
      learners.find({where: ["`email`=? OR `username`=?", username, username]}).success(function(user) {
        if (user) {
          validateUser(user);
        } else {
          guardians.find({where: {email: username}}).success(validateUser);
        }
      });
    }
  });

  app.get('/login/password', function (req, res, next) {
    res.render('auth/password.html')
  });

  app.post('/login/password', function(req, res, next) {
    res.send('POST /login/password')
  });

  app.get('/signup', function (req, res, next) {
    res.render('/auth/signup.html');
  });

  app.get('/signup/learners', function (req, res, next) {
    var signup = req.session.signup || {};
    console.log(signup);

    if (signup.state == 'child') {
      res.render('auth/signup-child.html', signup);
    } else if (signup.state == 'more') {
      res.render('auth/signup-learner-more.html', signup);
    } else {
      delete req.session.signup;
      res.render('auth/signup-learner.html');
    }
  });

  app.post('/signup/learners', function (req, res, next) {
    var signup = req.session.signup || {};
    delete signup.errors;

    if (signup.state == 'child') {
      var normalizedUsername = normalizeUsername(signup.username);

      signup.parent_email = req.body['parent_email'];

      var fail = function(err) {
        signup.errors = [err];
        res.session.signup = signup;
        res.render('auth/signup-child.html', signup);
      }

      if (!signup.parent_email) {
        fail(new Error('Missing email address'));
      } else if (!validateEmail(signup.parent_email)) {
        fail(new Error('Invalid email address'));
      } else {
        learners.find({where: {username: normalizedUsername}}).success(function(user) {
          signupTokens.create({
            email: signup.parent_email,
            token: generateToken(),
          }).success(function(token) {
            // TODO - send an email

            console.log(token.token);
            token.setLearner(user); // Assuming this worked

            bcrypt.hash(signup.password, 10, function(err, hash) {
              user.updateAttributes({
                complete: true,
                password: hash
              }).success(function() {
                delete req.session.signup;
                redirectUser(req, res, user);
              });
            });
          });
        });
      }
    } else if (signup.state == 'more') {
      var normalizedUsername = normalizeUsername(signup.username);

      signup.email = req.body['email'];
      if ('password' in req.body) signup.password = req.body['password'];

      var fail = function(err) {
        signup.errors = [err];
        res.session.signup = signup;
        res.render('auth/signup-learner-more.html', signup);
      }

      if (!signup.email || !signup.password) {
        fail(new Error('Missing email address or password'));
      } else if (!validateEmail(signup.email)) {
        fail(new Error('Invalid email address'));
      } else if (!validatePassword(signup.password)) {
        fail(new Error('Invalid password'));
      } else {
        learners.find({where: {username: normalizedUsername}}).success(function(user) {
          bcrypt.hash(signup.password, 10, function(err, hash) {
            user.updateAttributes({
              complete: true,
              email: signup.email,
              password: hash
            }).success(function() {
              delete res.session.signup;
              redirectUser(req, res, user);
            });
          });
        });
      }
    } else {
      signup.birthday_year = parseInt(req.body['birthday_year'], 10);
      signup.birthday_month = parseInt(req.body['birthday_month'], 10);
      signup.birthday_day = parseInt(req.body['birthday_day'], 10);
      signup.username = req.body['username'];

      var normalizedUsername = normalizeUsername(signup.username);

      var birthday = new Date(
        signup.birthday_year,
        signup.birthday_month - 1, // JS dates have 0-indexed months
        signup.birthday_day
      );

      var today = new Date();
      var cutoff = new Date(
        today.getFullYear() - 13,
        today.getMonth(),
        today.getDate()
      );

      var fail = function(err) {
        signup.errors = [err];
        req.session.signup = signup;
        res.render('auth/signup-learner.html', signup);
      }

      // Check for accidental February 30ths, etc
      if (birthday.getFullYear() !== signup.birthday_year
            || birthday.getMonth() !== signup.birthday_month - 1
            || birthday.getDate() !== signup.birthday_day) {
        fail(new Error('This is not a valid date.'));
      } else {
        learners.find({where: {username: normalizedUsername}}).success(function(user) {
          if (user) {
            fail(new Error('This nickname is already in use'));
          } else {
            // Create the user now, to prevent race conditions on usernames
            var underage = (birthday > cutoff);

            learners.create({
              username: normalizedUsername,
              password: '',
              underage: underage
            }).success(function(user) {
              console.log(user);
              signup.state = underage ? 'child' : 'more';
              signup.password = generatePassword();
              req.session.signup = signup;
              res.redirect('/signup/learners', 303);
            });
          }
        });
      }
    }
  });

  app.get('/signup/parents', function (req, res, next) {
    res.render('auth/signup-parent.html');
  });

  app.post('/signup/parents', function (req, res, next) {
    var email = req.body['email'],
        password = req.body['password'];

    var finalize = function(err, user) {
      if (err) {
        res.render('auth/signup-parent.html', {
          email: email,
          errors: [err]
        });
      } else {
        redirectUser(req, res, user);
      }
    }

    if (!email || !password) {
      finalize(new Error('Missing email or password'));
    } else if (!validateEmail(email)) {
      finalize(new Error('Invalid email address'));
    } else if (!validatePassword(password)) {
      finalize(new Error('Invalid password'));
    } else {
      guardians.find({where: {email: email}}).success(function(user) {
        if (user) {
          console.log('Guardian with email address ' + email + ' already exists');
          finalize(new Error('Email address already in use.'));
        } else {
          console.log('Guardian not found');
          bcrypt.hash(password, 10, function(err, hash) {
            if (err || !hash) {
              finalize(new Error(err || 'Unable to create an account. Please try again.'));
            } else {
              console.log('Password hashed:', hash);
              guardians.create({email: email, password: hash}).success(function(user) {
                finalize(user ? null : new Error('Unable to create an account. Please try again.'), user);
              });
            }
          });
        }
      });
    }
  });

  app.param('signupToken', function (req, res, next, token) {
    signupTokens.find({where: {token: token}}).success(function(token) {
      if (token && token.isValid()) {
        req.params.signupToken = token;
        next();
      } else {
        // Not sure whether we really want to redirect here,
        // or if we just want to issue an error about the token.
        return res.redirect('/signup/parents');
      }
    });
  });

  app.get('/signup/:signupToken', function (req, res, next) {
    res.render('auth/signup-parent.html', {
      auto_email: req.params.signupToken.email
    });
  });

  app.post('/signup/:signupToken', function (req, res, next) {
    var email = req.params.signupToken.email,
        password = req.body['password'];

    // This should probably be refactored to share code with standard guardian signup

    var finalize = function(err, user) {
      if (err || !user) {
        res.render('auth/signup-parent.html', {
          auto_email: email,
          errors: [err || new Error('Unable to create an account. Please try again.')]
        });
      } else {
        req.params.signupToken.getLearner().success(function(learner) {
          if (learner) {
            // For now, just going to assume this works
            learner.setGuardian(user);
          }

          // Set the token to be expired
          req.params.signupToken.updateAttributes({
            expired: true
          }).success(function() {
            redirectUser(req, res, user);
          });
        });
      }
    }

    if (!email || !password) {
      finalize(new Error('Missing email or password'));
    } else {
      guardians.find({where: {email: email}}).success(function(user) {
        if (user) {
          finalize(new Error('Email address already in use.'));
        } else {
          bcrypt.hash(password, 10, function(err, hash) {
            if (err || !hash) {
              finalize();
            } else {
              console.log('Password hashed:', hash);
              guardians.create({email: email, password: hash}).success(function(user) {
                finalize(null, user);
              });
            }
          });
        }
      });
    }
  });

  app.get('/logout', function (req, res, next) {
    delete req.session.user;
    return res.redirect('/');
  });

};