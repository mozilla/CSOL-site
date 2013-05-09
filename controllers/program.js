var api = require('../api');

module.exports = function (app) {

  function getFilters() {
    var filters = [],
        requested;

    if (arguments.length) {
      requested = Array.prototype.splice.call(arguments, 0);
    } else {
      requested = ['categories', 'grouped_programs', 'ages'];
    }

    requested.forEach(function(filter) {
      switch (filter) {
        case 'categories':
        case 'category':
          filters.push({
            name: 'category',
            label: 'Category',
            options: {
              science: 'Science',
              technology: 'Technology',
              engineering: 'Engineering',
              art: 'Art',
              math: 'Math'
            }
          });
          break;
        case 'orgs':
        case 'org':
          filters.push({
            name: 'org',
            label: 'Organisation',
            options: {
              'org1': 'Org 1',
              'org2': 'Org 2',
              'org3': 'Org 3',
            }
          });
          break;
        case 'programs':
        case 'program':
          filters.push({
            name: 'program',
            label: 'Program',
            options: {
              'p1': 'Program 1',
              'p2': 'Program 2',
              'p3': 'Program 3',
              'p4': 'Program 4',
              'p5': 'Program 5',
              'p6': 'Program 6'
            }
          });
          break;
        case 'grouped_programs':
        case 'grouped_program':
          filters.push({
            name: 'program',
            label: 'Program',
            options: {
              'Org 1': {
                'p1': 'Program 1',
                'p2': 'Program 2'
              },
              'Org 2': {
                'p3': 'Program 3',
                'p4': 'Program 4'
              },
              'Org 3': {
                'p5': 'Program 5',
                'p6': 'Program 6'
              }
            },
            is_grouped: true
          });
          break;
        case 'ages':
        case 'age':
          filters.push({
            name: 'age',
            label: 'Age Group',
            options: {
              'lt-13': 'Under 13',
              '13-14': '13 to 14',
              '15-16': '15 to 16',
              '17-18': '17 to 18',
              'gt-18': 'Over 18'
            }
          });
          break;
      }
    });

    return filters;
  }

  app.param('programName', function (req, res, next, badgeName) {
    // yep, get stuff from the db.
    next();
  });

  app.get('/programs', function (req, res, next) {
    var programs = [];

    for (var i = 0; i < 12; ++i) {
      programs.push({
        thumbnail: '/media/images/program.png',
        description: 'Program blah sed eiusmod...',
        url: '/programs/ae784f'
      });
    }

    res.render('programs/list.html', {
      filters: getFilters('categories', 'orgs', 'ages'),
      items: programs
    });
  });

  app.get('/programs/science', function (req, res, next) {
    res.send('SCIENCE!!')
  });

  app.get('/programs/technology', function (req, res, next) {
    res.send('TECHNOLOGY!!!')
  });

  app.get('/programs/engineering', function (req, res, next) {
    res.send('ENGINEERING!!!')
  });

  app.get('/programs/art', function (req, res, next) {
    res.send('ART!!!')
  });

  app.get('/programs/math', function (req, res, next) {
    res.send('MATH!!!')
  });

  app.get('/programs/:programName', function (req, res, next) {
    res.render('programs/single.html');
  });

  app.get('/programs/:programName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/programs/:programName/unfavorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.param('badgeName', function (req, res, next, badgeName) {
    api.getBadge(badgeName, function(err, data) {
      if (err)
        return next(data.message);

      req.params.badge = data.badge;
      next();
    });
  });

  app.get('/badges', api('getBadges'), function (req, res, next) {
    var err = req.remote.error;
    var data = req.remote;

    if (err)
      return next({status: err, message: data.message});

    res.render('badges/list.html', {
      filters: getFilters(),
      items: data.items,
      page: data.page,
      pages: data.pages
    });

    /*
    var badges = [];

    for (var i = 0; i < 12; ++i) {
      badges.push({
        thumbnail: '/media/images/badge.png',
        description: 'Badge blah in voluptate velit...',
        url: '/badges/ae784f'
      });
    }

    res.render('badges/list.html', {
      filters: getFilters(),
      items: badges
    });
    */
  });

  app.get('/badges/:badgeName', function (req, res, next) {
    res.render('badges/single.html', {
      badge: req.params.badge
    });
  });

  app.get('/badges/:badgeName/claim', function (req, res, next) {
    res.render('badges/claim.html');
  });

  app.get('/badges/:badgeName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/badges/:badgeName/unfavorite', function (req, res, next) {
    return res.redirect('/favorites', 303);
  });

  app.get('/orgs', function (req, res, next) {
    var orgs = [];

    for (var i = 0; i < 12; ++i) {
      orgs.push({
        thumbnail: '/media/images/org.png',
        description: 'Organisation blah irure...',
        url: '/orgs/some-organisation'
      });
    }

    res.render('orgs/list.html', {
      filters: getFilters('categories', 'ages'),
      items: orgs
    });
  });

  app.param('orgName', function (req, res, next, orgName) {
    // pull some stuff from the database probably
    next();
  });

  app.get('/orgs/:orgName', function (req, res, next) {
    res.render('orgs/single.html');
  });

  app.get('/orgs/:orgName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/orgs/:orgName/unfavorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });
};