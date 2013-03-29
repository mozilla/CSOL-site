module.exports = function (app) {

  app.get('/', function (req, res, next) {
    res.render('home.html');
  });

  app.get('/about', function (req, res, next) {
    res.render('info/about.html');
  });

  app.get('/privacy', function (req, res, next) {
    res.render('info/privacy.html');
  });

  app.get('/terms', function (req, res, next) {
    res.render('info/terms.html');
  });

  app.get('/vpat', function (req, res, next) {
    res.render('info/vpat.html');
  });

};