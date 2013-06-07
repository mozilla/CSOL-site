const async = require('async');
const openbadger = require('../openbadger');
const db = require('../db');
const errors = require('../lib/errors');
const isGuardian = require('../middleware').isGuardian;
const _ = require('underscore');

const learners = db.model('Learner');
const applications = db.model('Application');
const claims = db.model('Claim');

function normalizeDependants (dependants, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
    options = null;
  }

  async.map(dependants, function (dependant, callback) {
    dependant.getActivities(options, function(err, activities) {
      dependant.activities = activities;
      callback(err, dependant);
    });
  }, callback);
}

function getDependants (req, res, next) {
  req.session.user.getDependants()
    .complete(function (err, dependants) {
      if (err)
        return next(err);

      req.params.dependants = dependants;
      next();
    });
}

function activityPage (res, res, next, learnerName, dependants, options, view) {
  var usernames = _.pluck(dependants, 'username');

  if (usernames.indexOf(learnerName) === -1)
    return res.direct('/dashboard');

  normalizeDependants(dependants, options, function (err, dependants) {
    if (err)
      return next(err);

    var current = _.findWhere(dependants, {username: learnerName});

    res.render('/user/dashboard-single.html', {
      dependants: dependants,
      view: view,
      current: current
    });
  });
}

var middleware = [isGuardian, getDependants];

module.exports = function (app) {

  app.get('/dashboard', middleware, function (req, res, next) {
    var dependants = req.params.dependants;

    normalizeDependants(dependants, {
      limit: 4,
      applications: true,
      badges: true
    }, function (err, dependants) {
      if (err)
        return next(err);

      res.render('/user/dashboard.html', {
        dependants: dependants
      });
    });
  });

  app.get('/dashboard/:learnerName', middleware, function (req, res, next) {
    return activityPage(req, res, next,
      req.params.learnerName,
      req.params.dependants,
      {badge: true, applications: true}
    );
  });

  app.get('/dashboard/:learnerName/delete', middleware, function (req, res, next) {
    var learnerName = req.params.learnerName,
        dependants = req.params.dependants,
        usernames = _.pluck(dependants, 'username');

    if (usernames.indexOf(learnerName) === -1)
      return res.redirect('/dashboard');

    res.render('/user/dashboard-delete.html', {
      dependants: dependants,
      current: _.findWhere(dependants, {username: learnerName})
    });
  });

  app.post('/dashboard/:learnerName/delete', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName;

    learners.find({where: {
      username: learnerName,
      GuardianId: req.session.user.id
    }})
      .complete(function (err, learner) {
        if (err)
          return next(err);

        if (!learner)
          return res.redirect('/dashboard');

        learner.destroy()
          .complete(function (err) {
            if (err)
              return next(err);

            // TO DO - send email notifying guardian of successful deletion?

            req.flash('success', learner.getDisplayName() + '\'s account was successfully deleted.');
            res.redirect('/dashboard');
          });
      });
  });

  app.get('/dashboard/:learnerName/badges', middleware, function (req, res, next) {
    return activityPage(req, res, next,
      req.params.learnerName,
      req.params.dependants,
      {badges: true},
      'badges'
    );
  });

  app.get('/dashboard/:learnerName/badges/:badgeId', middleware, function (req, res, next) {
    var dependants = req.params.dependants,
        learner = _.findWhere(dependants, {username: req.params.learnerName});

    if (!learner)
      return res.redirect('/dashboard');

    openbadger.getUserBadge({
      email: learner.email,
      id: req.params.badgeId
    }, function (err, data) {
      if (!err)
        return res.render('/user/dashboard-badge.html', {
          dependants: dependants,
          current: learner,
          badge: data.badge
        });

      openbadger.getBadgeFromCode({
        code: req.params.badgeId,
        email: learner.email
      }, function (err, data) {
        if (err)
          return next(err);

        openbadger.getBadge(data.badge.shortname, function (err, data) {
          if (err)
            return next(err);

            res.render('/user/dashboard-badge.html', {
              dependants: dependants,
              current: learner,
              badge: data.badge,
              code: req.params.badgeId
            });
        });
      });
    });
  });

  app.post('/dashboard/:learnerName/badges/:claimCode', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName,
        claimCode = req.params.claimCode,
        action = req.body.action,
        options = {};

    function finish (err) {
      if (err)
        return next(err);

      return res.redirect('/dashboard');
    }

    claims.find({where: {code: claimCode}})
      .complete(function (err, claim) {
        if (err || !claim)
          return finish(err);

        if (action === 'approve') {
          claim.approve(function (err) {
            if (err)
              return finish(err);

            req.flash('success', 'You successfully approved a badge application.');
            finish();
          });
        } else if (action === 'deny') {
          claim.deny(function (err) {
            if (err)
              return finish(err);

            req.flash('info', 'You denied that badge application.');
            finish();
          });
        } else {
          finish();
        }
      })
  });

  app.get('/dashboard/:learnerName/applications', middleware, function (req, res, next) {
    return activityPage(req, res, next,
      req.params.learnerName,
      req.params.dependants,
      {applications: true},
      'applications'
    );
  });

  app.get('/dashboard/:learnerName/applications/:badgeId', middleware, function (req, res, next) {
    var dependants = req.params.dependants,
        learner = _.findWhere(dependants, {username: req.params.learnerName});

    if (!learner)
      return res.redirect('/dashboard');

    console.log(_.functions(learner));

    applications.find({where: {badgeId: req.params.badgeId, LearnerId: learner.id}})
      .complete(function (err, application) {
        if (err || !application)
          return next(err);

        async.parallel([
          function (callback) {
            application.getBadge(function (err, badge) {
              if (err)
                return callback(err);

              application.badge = badge;
              callback();
            });
          },
          function (callback) {
            application.getEvidence()
              .complete(function (err, evidence) {
                if (err)
                  return callback(err);

                application.evidence = evidence;
                callback();
              });
          }
        ], function (err) {
          if (err)
            return next(err);

          res.render('/user/dashboard-application.html', {
            dependants: dependants,
            current: learner,
            application: application
          });
        });
      });
  });

  app.post('/dashboard/:learnerName/applications/:applicationId', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName,
        badgeId = req.params.badgeId,
        action = req.body.action,
        options = {};

    function finish (err) {
      if (err)
        return next(err);

      return res.redirect(req.url);
    }

    if (['allow', 'deny'].indexOf(action) < 0)
      return finish();

    learners.find({where: {username: learnerName, GuardianId: req.session.user.id}})
      .complete(function (err, learner) {
        if (err)
          return finish(err);

        if (!learner)
          return finish(new errors.NotFound());

        applications.find({where: {LearnerId: learner.id, badgeId: badgeId, state: 'waiting'}})
          .complete(function (err, application) {
            if (err)
              return finish(err);

            if (!application)
              return finish(new errors.NotFound());

            if (action === 'allow')
              return application.submit(true, finish);

            if (action === 'deny')
              return application.deny(finish);

            // We shouldn't ever get this far, but just in case
            finish();
          });
      });
  });

}
