module.exports = function (app) {

  app.get('/claim', function (req, res, next) {
    res.send('GET /claim')
  });

  app.post('/claim', function (req, res, next) {
    res.send('POST /claim');
  });

  app.get('/backpack', function (req, res, next) {
    res.render('user/backpack.html');
  });

  app.get('/favorites', function (req, res, next) {
    res.render('user/bookmarks.html')
  })

};