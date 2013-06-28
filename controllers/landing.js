const openbadger = require('../openbadger');

module.exports = function (app) {

  app.get('/asm', openbadger.middleware('getOrgs'), function (req, res, next) {
    var data = req.remote;
    res.render('landing/after-school-matters.html', {
      orgs: data.orgs
    });
  });
};