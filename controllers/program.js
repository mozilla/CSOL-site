var async = require('async');
var aestimia = require('../aestimia');
var badger = require('../openbadger');
var db = require('../db');
var errors = require('../lib/errors');
var mime = require('mime');
var _ = require('underscore');

var applications = db.model('Application');
var evidence = db.model('Evidence');

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
            label: 'Organization',
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
        return next(err);

      req.params.program = data.program;
      next();
    });
  });

  app.get('/explore', badger.middleware('getPrograms'), function (req, res, next) {
    var data = req.remote;

    res.render('programs/list.html', {
      filters: getFilters('categories', 'orgs', 'ages'),
      items: data.programs,
      page: data.page,
      pages: data.pages
    });
  });

  app.get('/explore/:programName', function (req, res, next) {
    res.render('programs/single.html', {
      program: req.params.program
    });
  });

  app.get('/explore/:programName/favorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.get('/explore/:programName/unfavorite', function (req, res, next) {
    return res.redirect('/login', 303);
  });

  app.post('/applications', function (req, res, next) {
    function finish (err) {
      if (err)
        return res.json({status: err.message || err});

      return res.json({status: 'ok'});
    }

    if (!req.body['_id'])
      return finish('Could not find submission ID in request');

    applications.find({where: {submissionId: req.body['_id']}})
      .complete(function(err, application) {
        if (err)
          return finish(err);

        aestimia.update(application);

        finish();
      });
  });

  app.param('evidenceSlug', function (req, res, next, slug) {
    var parts = /^([a-z0-9]+?)(?:_(thumb))?$/.exec(slug);
    var shouldAuthenticate = (req.method !== 'GET');

    if (!parts)
      return next(new errors.NotFound());

    if (shouldAuthenticate && !req.session.user)
      return next(new errors.Forbidden());

    var key = parts[1],
        thumb = !!parts[2];

    evidence.find({where: {key: key}})
      .complete(function (err, instance) {
        if (err)
          return next(err);

        if (!instance)
          return next(new errors.NotFound());

        req.params.evidence = instance;
        req.params.thumb = thumb;

        instance.getApplication()
          .complete(function (err, application) {
            if (err)
              return next(err);

            req.params.application = application;

            // We'll need to decide how to authenticate external services
            // like, for example, Aestimia. For now, restrict access to either
            // the learner who uploaded it, or their guardian

            if (!shouldAuthenticate)
              return next();

            application.getLearner()
              .complete(function (err, learner) {
                if (err)
                  return next(err);

                if (learner.id === req.session.user.id)
                  return next();

                learner.getGuardian()
                  .complete(function (err, guardian) {
                    if (err)
                      return next(err);

                    if (!guardian || guardian.id !== req.session.user.id)
                      return next(new errors.Forbidden());

                    return next();
                  });
              });
          });
      });
  });

  app.get('/evidence/:evidenceSlug', function (req, res, next) {
    var evidence = req.params.evidence,
        thumb = req.params.thumb;

    res.type(evidence.mediaType);
    res.header('Vary', 'Cookie');
    res.header('Cache-Control', 'max-age=2419200'); // 4 weeks
    res.header('Last-Modified', evidence.updatedAt);

    evidence[thumb ? 'fetchThumb' : 'fetch'](function (remote) {
      remote
        .on('response', function(proxy) {
          proxy.pipe(res);
        })
        .end();
    });
  });

  app.post('/evidence/:evidenceSlug', function (req, res, next) {
    var evidence = req.params.evidence,
        application = req.params.application,
        thumb = req.params.thumb;

    if (thumb)
      return next(new errors.NotAllowed());

    if (!req.body.action || req.body.action !== 'delete')
      return next(new errors.NotAllowed());

    if (application.state !== 'open')
      return next(new errors.NotAllowed());

    evidence.destroy()
      .complete(function (err) {
        if (err)
          return next(err);

        evidence.getApplication()
          .complete(function (err, application) {
            if (err)
              return next(err);

            return res.redirect('/earn/' + application.badgeId + '/apply');
          });
      })
  });

  app.param('badgeName', function (req, res, next, badgeName) {
    badger.getBadge(badgeName, function(err, data) {
      if (err)
        return next(err);

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

  app.get('/earn/:badgeName/apply', function (req, res, next) {
    var badge = req.params.badge;

    if (!req.session.user) {
      req.session.afterLogin = '/earn/' + req.params.badgeName + '/apply';
      return res.redirect('/login');
    }

    applications.findOrCreate({
      badgeId: badge.id,
      LearnerId: req.session.user.id
    })
      .complete(function(err, application) {
        if (err || !application)
          return next(err || new Error('There was a problem loading your application'));

        application.getEvidence()
          .complete(function(err, evidence) {
            if (err)
              return next(err);

            var state = evidence.length ? application.state : 'new';

            res.render('applications/' + state + '.html', {
              evidence: evidence,
              application: application,
              badge: badge
            })
          });

      });
  });

  app.post('/earn/:badgeName/apply', function (req, res, next) {
    var badge = req.params.badge;

    if (!req.session.user)
      return res.redirect(badge.url);

    function finish (err, evidence) {
      if (req.xhr) {
        return res.json({
          status: err ? 'failed' : 'ok',
          message: err || null,
          evidence: evidence || []
        });
      }

      if (err)
        req.flash('error', err);

      res.redirect(badge.url + '/apply');
    }

    applications.find({where: {
      badgeId: badge.id,
      LearnerId: req.session.user.id
    }})
      .complete(function(err, application) {
        if (err || !application)
          return finish(err);

        if (req.body.action === 'apply')
          return application.submit(finish);

        if (req.body.action === 'reopen')
          return application.reopen(finish);

        if ('description' in req.body) {
          application.updateAttributes({
            description: req.body.description
          });
        }

        var files = (req.files||{}).media;

        if (!files)
          return finish();

        if (!_.isArray(files))
          files = [files];

        async.map(files, function (file, callback) {
          application.process(file, function (err, item) {
            if (err || !item)
              return callback(err);

            callback(null, {
              type: item.mediaType,
              thumbnail: item.getThumbnailUrl(),
              location: item.getLocationUrl(),
              original: item.original
            });
          });
        }, finish);
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
        description: 'Organization blah irure...',
        url: '/orgs/some-organization'
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