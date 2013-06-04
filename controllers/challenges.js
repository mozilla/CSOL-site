module.exports = function(app) {
  app.get('/levelup', function(req, res) {
    return res.render('challenges/index.html', {
      navItem: 'challenges'
    });
  });
};
