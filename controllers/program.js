module.exports = function (app) {

  function getFilters() {
    var filters = [],
        requested;

    if (arguments.length) {
      requested = Array.prototype.splice.call(arguments, 0);
    } else {
      requested = ['programs', 'orgs', 'ages'];
    }

    requested.forEach(function(filter) {
      switch (filter) {
        case 'programs':
        case 'program':
          filters.push({
            name: 'program',
            label: 'Program',
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
            options: {}
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

  app.get('/programs', function (req, res, next) {
    res.send('GET /programs');
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

  app.param('badgeName', function (req, res, next, badgeName) {
    // yep, get stuff from the db.
    next();
  });

  app.get('/badges', function (req, res, next) {
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
  });

  app.get('/badges/:badgeName', function (req, res, next) {
    res.render('badges/single.html');
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
        description: 'Organisation blah irure dolor...',
        url: '/orgs/some-organisation'
      });
    }

    res.render('orgs/list.html', {
      filters: getFilters('programs', 'ages'),
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