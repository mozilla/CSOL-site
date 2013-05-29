const Api = require('./api');
const async = require('async');
const openbadger = require('./openbadger');
const errors = require('./lib/errors');
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_AESTIMIA_URL'];
if (!ENDPOINT)
  throw new Error('Must specify CSOL_AESTIMIA_URL in the environment');

var aestimia = new Api(ENDPOINT, {

  submit: function (application, callback) {
    application.getLearner()
      .complete(function (err, learner) {
        if (err)
          return callback(err);

          application.getEvidence()
            .complete(function (err, evidence) {
              if (err)
                return callback(err);

              openbadger.getBadge(application.badgeId, function (err, data) {
                var badge = data.badge;

                // console.log('Application:', application);
                // console.log('Learner:', learner);
                // console.log('Evidence:', evidence);
                // console.log('Badge:', badge);

                var submission = {
                  criteriaUrl: badge.url,
                  achievement: {
                    name: badge.name,
                    description: badge.description,
                    imageUrl: badge.image
                  },
                  classifications: badge.tags || [],
                  evidence: [],
                  rubric: badge.rubric
                };

                if (learner.email)
                  submission.learner = learner.email;

                evidence.forEach(function(item) {
                  submission.evidence.push({
                    url: item.getLocationUrl(),
                    mediaType: item.mediaType
                  });
                });

                console.log(submission);

                return callback('Not working yet');
              });
            });
      });
  }

});

module.exports = aestimia;