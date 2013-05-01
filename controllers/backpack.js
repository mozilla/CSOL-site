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
        id: i,
        thumbnail: '/media/images/badge.png',
        description: 'Badge blah in voluptate velit...',
        url: '/badges/ae784f',
        share: true,
        template: 'user/badge.html'
      });
    }

    res.render('user/backpack.html', {
      items: badges
    });
  });

  app.get('/favorites/:view?', function (req, res, next) {
    var badge = {
      thumbnail: '/media/images/badge.png',
      description: 'Badge blah in voluptate velit...',
      url: '/badges/ae784f'
    };

    var org = {
      thumbnail: '/media/images/org.png',
      description: 'Organisation blah irure...',
      url: '/orgs/some-organisation'
    };

    var program = {
      thumbnail: '/media/images/program.png',
      description: 'Program blah sed eiusmod...',
      url: '/programs/ae784f'
    };

    var view = req.params.view,
        favorites = [badge, org, badge, program];

    switch (view) {
      case 'badges':
        favorites = [badge, badge]; break;
      case 'programs':
        favorites = [program];
      case 'orgs':
        favorites = [org]; break;
      default:
        view = null;
    }

    res.render('user/bookmarks.html', {
      items: favorites,
      view: view
    })
  })

};