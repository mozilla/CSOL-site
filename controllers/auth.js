module.exports = function (app) {

  app.get('/login', function (req, res, next) {
    res.send('GET /login')
  });

  app.post('/login', function (req, res, next) {
    res.send('POST /login')
  });

  app.post('/logout', function (req, res, next) {
    res.send('POST /logout')
  });

};