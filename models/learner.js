var async = require('async');
var db = require('../db');
var openbadger = require('../openbadger');
var _ = require('underscore');

var applications;

module.exports = {
  setup: function () {
    applications = db.model('Application');
  },
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    underage: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    birthday: {
      type: db.type.DATE,
      allowNull: false
    },
    firstName: {
      type: db.type.STRING,
      allowNull: true
    },
    lastName: {
      type: db.type.STRING,
      allowNull: true
    },
    email: {
      type: db.type.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: db.type.STRING,
      allowNull: true,
      unique: true,
      validate: {
        is: ['[a-zA-Z0-9 ]']
      }
    },
    password: {
      type: db.type.STRING,
      allowNull: false
    },
    complete: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  relationships: [
    {
      model: 'Guardian',
      type: 'belongsTo'
    },
    {
      model: 'Application',
      type: 'hasMany'
    }
  ],
  instanceMethods: {
    getBadgeApplicationState: function (badgeId, callback) {
      if (badgeId.id)
        badgeId = badgeId.id;

      applications.find({where: {LearnerId: this.id, badgeId: badgeId}})
        .complete(function (err, application) {
          if (err)
            return callback(err);

          if (!application)
            return callback(null);

          callback(null, application.state);
        });
    },
    getFullName: function () {
      return this.firstName + ' ' + this.lastName;
    },
    getDisplayName: function () {
      return this.firstName || this.username;
    },
    getActivities: function (options, callback) {
      var learner = this;

      if (_.isFunction(options)) {
        callback = options;
        options = null;
      }

      if (!options)
        options = {
          applications: true,
          badges: true
        };

      openbadger.getAllBadges(function(err, data) {
        if (err)
          return callback(err);

        var badges = data.badges;

        function getApplications (callback) {
          learner.getApplications()
            .complete(function(err, applications) {
              if (err)
                return callback(err);

              _.each(applications, function(application) {
                application.update = function (callback) {
                  application.getEvidence()
                    .complete(function (err, evidence) {
                      if (err)
                        return callback(err);

                      _.extend(application, {
                        badge: _.findWhere(badges, {id: application.badgeId}),
                        evidence: evidence,
                        type: 'application'
                      });

                      callback();
                    });
                }
              });

              callback(null, applications);
            });
        }

        function getBadges (callback) {
          openbadger.getUserBadges({email: learner.email}, function(err, data) {
            if (err)
              return callback(err);

            var userBadges = data.badges;

            _.each(userBadges, function(badge) {
              _.extend(badge, {
                badge: badge,
                updatedAt: new Date(badge.issuedOn),
                state: 'awarded',
                getStateDescription: function() { return 'Awarded'; },
                type: 'badge'
              });
            });

            callback(null, userBadges);
          });
        }

        var dataMethods = [];

        options.applications && dataMethods.push(getApplications);
        options.badges && dataMethods.push(getBadges);

        async.parallel(dataMethods, function (err, activities) {
          if (err)
            return callback(err);

          activities = _.flatten(activities);
          activities.sort(function(a, b) {
            // Sort with most recent first
            return b.updatedAt - a.updatedAt;
          });

          if (_.isNumber(options.limit))
            activities = activities.slice(0, options.limit);

          async.each(activities, function (activity, callback) {
            activity.update ? activity.update(callback) : callback();
          }, function (err) {
            callback(err, activities);
          });
        });
      });
    }
  }
};
