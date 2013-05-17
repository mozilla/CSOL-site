var querystring = require('querystring');

module.exports = function(app) {
  app.get('^/challenges$', function(req, res) {
    return res.render('challenges/index.html');
  });

}
