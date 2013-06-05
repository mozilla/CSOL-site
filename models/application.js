var aestimia = require('../aestimia');
var async = require('async');
var errors = require('../lib/errors');
var db = require('../db');
var s3 = require('../s3');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    badgeId: {
      type: db.type.STRING,
      allowNull: false
    },
    description: {
      type: db.type.STRING,
      allowNull: true
    },
    state: {
      type: db.type.ENUM,
      values: [
        'open',       // This application is being worked on 
        'waiting',    // This application is waiting for guardian approval (where applicable)
        'denied',     // This application has been denied by the guardian (where applicable)
        'submitted',  // This application has been submitted for review
        'rejected',   // This application has been rejected
        'accepted'    // This application has been accepted
      ],
      defaultValue: 'open',
      allowNull: false
    },
    submissionId: {
      type: db.type.STRING,
      allowNull: true
    },
    latestReview: {
      type: db.type.TEXT,
      allowNull: true
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'belongsTo'
    },
    {
      model: 'Evidence',
      type: 'hasMany',
      as: 'Evidence'
    }
  ],
  instanceMethods: {
    getReview: function () {
      return JSON.parse(this.latestReview || "{}");
    },
    reopen: function (callback) {
      if (['rejected','denied'].indexOf(this.state) < 0)
        return callback();

      this.updateAttributes({
        state: 'open'
      }).complete(callback);
    },
    deny: function (callback) {
      if (this.state !== 'waiting')
        return callback();

      this.updateAttributes({
        state: 'denied'
      }).complete(callback);
    },
    submit: function (force, callback) {
      if (typeof force === 'function') {
        callback = force;
        force = false;
      }

      var application = this;

      application.getLearner().complete(function (err, learner) {
        if (err || !learner)
          return callback(err);

        if (learner.underage && !force) {
          return application.updateAttributes({
            state: 'waiting'
          }).complete(callback);
        }

        application.getEvidence().complete(function (err, items) {
          if (err || !items || !items.length)
            return callback(err || 'No evidence found for this application');

          aestimia.submit(application, function (err, id) {
            if (err)
              return callback(err);

            application.updateAttributes({
              state: 'submitted',
              submissionId: id
            }).complete(callback);
          })
        });
      });
    },
    process: function (file, callback) {
      var application = this;

      application.getLearner()
        .complete(function (err, learner) {
          if (err)
            return callback(err);

          db.model('Evidence')
            .process(file, learner.username, function (err, evidence) {
              if (err || !evidence)
                return callback(err);

              application.addEvidence(evidence)
                .complete(function (err) {
                  if (err)
                    return callback(err);

                  callback(null, evidence);
                })
            });
        });
    }
  }
};