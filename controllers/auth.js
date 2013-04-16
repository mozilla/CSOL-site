module.exports = function (app) {

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
    if (req.body['username'] && req.body['password']) {
      req.session.user = {
        username: req.body['username'],
        type: 'learner',
        is_valid: true,
        favorites: []
      }
      return res.redirect('/backpack', 303);
    } else {
      res.render('auth/login.html', {
        username: req.body['username']
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
    req.session.user = {
      username: req.body['email'],
      is_valid: true,
      email: req.body['email'],
      type: 'parent',
      dependents: []
    }
    return res.redirect('/dashboard', 303);
  });

  app.param('signupToken', function (req, res, next, token) {
    console.log(token);
    if (!/^[a-f0-9]{20}$/.test(token)) {
      next(new Error('Invalid token'));
    } else {
      next();
    }
  });

  app.get('/signup/:signupToken', function (req, res, next) {
    res.render('auth/signup-parent.html', {
      auto_email: 'user@example.com'
    });
  });

  app.get('/logout', function (req, res, next) {
    delete req.session.user;
    return res.redirect('/');
  });

};