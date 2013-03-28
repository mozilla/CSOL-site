module.exports = function (app) {

  app.get('/claim', function (req, res, next) {
    res.render('claim.html');
  });

  app.get('/claim/:badgeName', function (req, res, next) {
    return res.redirect('/badges/'+req.params.badgeName+'/claim');
  });

  app.get('/backpack', function (req, res, next) {
    var badges = [];

    for (var i = 0; i < 7; ++i) {
      badges.push({
        thumbnail: '/media/images/badge.png',
        description: 'Badge blah in voluptate velit...',
        url: '/badges/ae784f'
      });
    }

    res.render('user/backpack.html', {
      items: badges
    });
  });

  app.get('/favorites', function (req, res, next) {
    var badges = [];

    for (var i = 0; i < 3; ++i) {
      badges.push({
        thumbnail: '/media/images/badge.png',
        description: 'Badge blah in voluptate velit...',
        url: '/badges/ae784f'
      });
    }

    res.render('user/bookmarks.html', {
      items: badges
    })
  })

};