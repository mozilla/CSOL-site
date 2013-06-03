const async = require('async');
const db = require('../db');
const isGuardian = require('../middleware').isGuardian;
const _ = require('underscore');

const learners = db.model('Learner');

function normalizeDependants (dependants, callback) {
  async.map(dependants, function (dependant, callback) {
    dependant.getActivities(function(err, activities) {
      dependant.activities = activities;
      callback(err, dependant);
    });
  }, callback);
}

module.exports = function (app) {

  app.get('/dashboard', [isGuardian], function (req, res, next) {
    req.session.user.getDependants()
      .complete(function (err, dependants) {
        if (err)
          return next(err);

        normalizeDependants(dependants, function (err, dependants) {
          if (err)
            return next(err);

          res.render('/user/dashboard.html', {
            dependants: dependants
          });
        });
      })
  });

  app.get('/dashboard/:learnerName', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName;

    req.session.user.getDependants()
      .complete(function (err, dependants) {
        var usernames = _.pluck(dependants, 'username');

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
  });

  app.get('/dashboard/:learnerName/delete', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName;

    req.session.user.getDependants()
      .complete(function (err, dependants) {
        var usernames = _.pluck(dependants, 'username');

        if (usernames.indexOf(learnerName) === -1)
          return res.redirect('/dashboard');

        res.render('/user/dashboard-delete.html', {
          dependants: dependants,
          current: _.findWhere(dependants, {username: learnerName})
        });
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
}