var aestimia = require('../aestimia');
var async = require('async');
var errors = require('../lib/errors');
var db = require('../db');
var mime = require('mime');
var path = require('path');
var s3 = require('../s3');
var thumbs = require('../lib/thumbs');

var ALLOWED_TYPES = ['image', 'video'];

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
      if (this.state !== 'rejected')
        return callback();

      this.updateAttributes({
        state: 'open'
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
      if (!file || !file.size)
        return callback();

      var application = this,
          type = file.type.split('/')[0].toLowerCase();

      if (ALLOWED_TYPES.indexOf(type) < 0)
        return callback(new errors.Unsupported(file.name + ' is not of a supported file type'));

      function saveFile (path, callback) {
        s3.putFile(file.path, path, {
          'Content-Type': file.type
        }, function (err, data) {
          if (err)
            return callback(err);

          callback();
        });
      }

      function saveThumbnail (path, callback) {
        thumbs[type](file.path, null, 'png', 150, 150, function (err, data) {
          if (err)
            return callback(err);

          s3.putBuffer(new Buffer(data, 'binary'), path, {
            'Content-Type': 'image/png'
          }, function (err, data) {
            if (err)
              return callback(err);

            callback();
          });
        });
      }

      application.getLearner().complete(function(err, learner) {
        if (err || !learner)
          return callback(err);

        var key = file.path.split('/').pop(),
            prefix = learner.username,
            format = mime.extension(file.type) || path.extname(file.name).substr(1),
            filePath = '/' + prefix + '/' + key + '.' + format,
            thumbPath = '/' + prefix + '/' + key + '_thumb.png';

        db.model('Evidence').create({
          key: key,
          mediaType: file.type,
          location: filePath,
          thumbnail: thumbPath,
          original: file.name
        }).complete(function (err, instance) {
          if (err || !instance)
            return callback(err);

          saveThumbnail(thumbPath, function (err) {
            if (err)
              return callback(err);

            application.addEvidence(instance)
              .complete(function (err) {
                if (err)
                  return callback(err);

                callback(null, instance);
              });
          });

          saveFile(filePath, function (err) {
            if (err)
              return;

            instance.updateAttributes({
              saved: true
            });
          });
        });
      });
    }
  }
};