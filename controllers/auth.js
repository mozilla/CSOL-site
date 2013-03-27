module.exports = function (app) {

  app.get('/login', function (req, res, next) {
    console.log('Request', req);
    res.render('auth/login.html')
  });

  app.post('/login', function (req, res, next) {
    return res.redirect('/backpack', 303);
  });

  app.get('/login/password', function (req, res, next) {
    res.render('auth/password.html')
  });

  app.post('/login/password', function(req, res, next) {
    res.send('POST /login/password')
  });

  app.get('/signup', function (req, res, next) {
    if (req.query.parent) {
      res.render('auth/signup-child.html');
    } else {
      res.render('auth/signup.html');
    }
  });

  app.post('/signup', function (req, res, next) {
    var year = req.body['birthday-year'],
        month = req.body['birthday-month'],
        day = req.body['birthday-day'],
        birthday = new Date(year, month, day),
        today = new Date(),
        cutoff = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

    if (birthday < cutoff) {
      return res.redirect('/backpack', 303);
    } else {
      // Should really do this via session, but for the sake of experimentation
      return res.redirect('/signup?parent=1', 303);
    }
  });

  app.get('/signup/parents', function (req, res, next) {
    res.render('auth/parent.html');
  });

  app.post('/signup/parents', function (req, res, next) {
    res.send('POST /signup/parents');
  });

  app.get('/logout', function (req, res, next) {
    return res.redirect('/');
  });

};