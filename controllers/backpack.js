const openbadger = require('../openbadger');

module.exports = function (app) {

  app.get('/claim', function (req, res, next) {
    var claimCode = req.query.code;
    var user = res.locals.user;

    if (!user) {
      req.session.afterLogin = req.originalUrl;
      return res.redirect('/login');
    }

    if (!claimCode)
      return res.render('claim.html');

    openbadger.claim({
      code: claimCode.trim(),
      email: user.email
    }, function(err, data) {
      if (err) {
        if (err.code === 404 && err.message === 'unknown claim code')
          req.flash('error', "That claim code appears to be invalid.");
        else if (err.code === 409)
          req.flash('warn', "You already have that badge.");
        else
          req.flash('error', "Unable to claim badge.");
      }
      else {
        req.flash('success', 'Badge claimed!');
      }
      return res.redirect('/backpack');
    });

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