const openbadger = require('../openbadger');

module.exports = function (app) {

  app.get('/', function (req, res, next) {
    res.render('home.html');
  });

  app.get('/about', openbadger.middleware('getOrgs'), function (req, res, next) {
    var data = req.remote;
    res.render('info/about.html', {
      orgs: data.orgs
    });
  });

  app.get('/privacy', function (req, res, next) {
    res.render('info/privacy.html');
  });

  app.get('/terms', function (req, res, next) {
    res.render('info/terms.html');
  });

  app.get('/faq', function (req, res, next) {
    res.render('info/faq.html');
  });

};