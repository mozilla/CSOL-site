var bcrypt = require('bcrypt'),
    db = require('../db'),
    learners = db.model('Learner'),
    guardians = db.model('Guardian'),
    signupTokens = db.model('SignupToken');

module.exports = function (app) {

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
            finalize(new Error(err || 'Username or password incorrect'));
          } else {
            finalize(null, user);
          }
        });
      } else {
        finalize(new Error('Username or password incorrect'));
      }
    }

    if (!username || !password) {
      finalize(new Error('Missing username or password'));
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
    var user = req.session.user || {};

    if (user.needs_guardian) {
      req.session.signup_step = 'child';
      res.render('auth/signup-child.html', {
        password: '{Generated Password}'
      });
    } else if (user.valid !== undefined) {
      req.session.signup_step = 'more';
      res.render('auth/signup-learner-more.html', {
        password: '{Generated Password}'
      });
    } else {
      delete req.session.signup_step;
      res.render('auth/signup-learner.html');
    }
  });

  app.post('/signup/learners', function (req, res, next) {
    var step = req.session.signup_step;

    if (!step) {
      var year = req.body['birthday-year'],
          month = req.body['birthday-month'],
          day = req.body['birthday-day'],
          birthday = new Date(year, month, day),
          today = new Date(),
          cutoff = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

      req.session.user = {
        username: req.body['username'],
        is_underage: birthday > cutoff,
        type: 'learner',
        favorites: []
      }

      req.session.signup_step = 1;
      req.session.user.valid = false;
      if (req.session.user.is_underage) {
        req.session.user.needs_guardian = true;
      }
      return res.redirect('/signup/learners', 303);
    } else if (step == 'child') {
      
    } else if (step == 'more') {

    }

    req.session.user.is_valid = true;
    return res.redirect('/backpack', 303);
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