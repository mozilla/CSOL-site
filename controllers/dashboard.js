const async = require('async');
const openbadger = require('../openbadger');
const db = require('../db');
const errors = require('../lib/errors');
const isGuardian = require('../middleware').isGuardian;
const _ = require('underscore');

const learners = db.model('Learner');
const applications = db.model('Application');

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

var middleware = [isGuardian, getDependants];

module.exports = function (app) {

  app.get('/dashboard', middleware, function (req, res, next) {
    var dependants = req.params.dependants;

    normalizeDependants(dependants, function (err, dependants) {
      if (err)
        return next(err);

      res.render('/user/dashboard.html', {
        dependants: dependants
      });
    });
  });

  app.get('/dashboard/:learnerName', middleware, function (req, res, next) {
    var learnerName = req.params.learnerName,
        dependants = req.params.dependants,
        usernames = _.pluck(dependants, 'username');

    if (usernames.indexOf(learnerName) === -1)
      return res.redirect('/dashboard');

    normalizeDependants(dependants, function (err, dependants) {
      if (err)
        return next(err);

      res.render('/user/dashboard-single.html', {
        dependants: dependants,
        current: _.findWhere(dependants, {username: learnerName})
      });
    });
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

  app.get('/dashboard/:learnerName/:activityType/:activityId?', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName,
        activityType = req.params.activityType,
        activityId = req.params.activityId,
        options = {};

    if (['applications', 'badges'].indexOf(activityType) < 0)
      return next(new errors.NotFound());

    options[activityType] = true;

    getDependants(req, res, function () {
      var dependants = req.params.dependants,
          usernames = _.pluck(dependants, 'username');

      if (usernames.indexOf(learnerName) === -1)
        return res.redirect('/dashboard');

      normalizeDependants(dependants, options, function (err, dependants) {
        if (err)
          return next(err);

        var current = _.findWhere(dependants, {username: learnerName}),
            context = {
              dependants: dependants,
              view: activityType,
              current: current
            };

        if (!activityId)
          return res.render('/user/dashboard-single.html', context);

        var activity = _.find(current.activities, function(activity) {
          return activity.badge.id === activityId;
        });

        if (!activity)
          return next(new errors.NotFound());

        context[activity.type] = activity;

        return res.render('/user/dashboard-' + activity.type + '.html', context);
      });
    });
  });

  app.post('/dashboard/:learnerName/applications/:badgeId', [isGuardian], function (req, res, next) {
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
