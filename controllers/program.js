module.exports = function (app) {

  app.get('/make', function (req, res, next) {
    res.send('GET /make');
  });

  app.param('badgeName', function (req, res, next, badgeName) {
    // yep, get stuff from the db.
    next();
  });

  app.get('/programs?/science', function (req, res, next) {
    res.send('SCIENCE!!')
  });

  app.get('/programs?/technology', function (req, res, next) {
    res.send('TECHNOLOGY!!!')
  });

  app.get('/programs?/engineering', function (req, res, next) {
    res.send('ENGINEERING!!!')
  });

  app.get('/programs?/art', function (req, res, next) {
    res.send('ART!!!')
  });

  app.get('/programs?/math', function (req, res, next) {
    res.send('MATH!!!')
  });

  app.get('/programs?/:badgeName', function (req, res, next) {
    res.send('GET /program/badge')
  });

  app.get('/orgs', function (req, res, next) {
    res.send('GET /orgs')
  });

  app.param('orgName', function (req, res, next, orgName) {
    // pull some stuff from the database probably
    next();
  });

  app.get('/orgs?/:orgName', function (req, res, next) {
    res.send('GET /org/name');
  });
};