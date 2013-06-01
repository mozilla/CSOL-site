const db = require('../db');
const isGuardian = require('../middleware').isGuardian;
const _ = require('underscore');

const learners = db.model('Learner');

module.exports = function (app) {

  app.get('/dashboard/:learnerName?', [isGuardian], function (req, res, next) {
    var learnerName = req.params.learnerName;

    req.session.user.getDependants()
      .complete(function (err, dependants) {
        if (err)
          return next(err);

        if (learnerName) {
          var usernames = _.pluck(dependants, 'username');
          if (usernames.indexOf(learnerName) === -1)
            return res.redirect('/dashboard');
        } else if (dependants.length === 1) {
          return res.redirect('/dashboard/' + dependants[0].username);
        }

        var template = learnerName ? 'dashboard-single' : 'dashboard';

        res.render('/user/' + template + '.html', {
          dependants: dependants,
          currentDependant: learnerName
        });
      })
  });

}