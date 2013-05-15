var badger = require('../openbadger');

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

  app.param('programName', function (req, res, next, programName) {
    badger.getProgram(programName, function(err, data) {
      if (err)
        return next(data.message);

      req.params.program = data.program;
      next();
    });
  });

  app.get('/learn', badger.middleware('getPrograms'), function (req, res, next) {
    var data = req.remote;

    res.render('programs/list.html', {
      filters: getFilters('categories', 'orgs', 'ages'),
      items: data.programs,
      page: data.page,
      pages: data.pages
    });
  });

  app.get('/learn/:programName', function (req, res, next) {
    res.render('programs/single.html', {
      program: req.params.program
    });
  });

  app.get('/learn/:programName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/learn/:programName/unfavorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.param('badgeName', function (req, res, next, badgeName) {
    badger.getBadge(badgeName, function(err, data) {
      if (err)
        return next(data.message);

      req.params.badge = data.badge;
      next();
    });
  });

  app.get('/earn', badger.middleware('getBadges'), function (req, res, next) {
    var data = req.remote;

    res.render('badges/list.html', {
      filters: getFilters(),
      items: data.badges,
      page: data.page,
      pages: data.pages
    });
  });

  app.get('/earn/:badgeName', function (req, res, next) {
    res.render('badges/single.html', {
      badge: req.params.badge
    });
  });

  app.get('/earn/:badgeName/claim', function (req, res, next) {
    res.render('badges/claim.html');
  });

  app.get('/earn/:badgeName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/earn/:badgeName/unfavorite', function (req, res, next) {
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