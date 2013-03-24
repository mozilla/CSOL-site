module.exports = function (app) {

  app.get('/about', function (req, res, next) {
    res.send('GET /about')
  });

  app.get('/privacy', function (req, res, next) {
    res.send('GET /privacy')
  });

  app.get('/terms', function (req, res, next) {
    res.send('GET /terms')
  });

  app.get('/vpat', function (req, res, next) {
    res.send('GET /vpat')
  });

};