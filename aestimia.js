const Api = require('./api');
const async = require('async');
const openbadger = require('./openbadger');
const errors = require('./lib/errors');
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_AESTIMIA_URL'];
const SECRET = process.env['CSOL_AESTIMIA_SECRET'];

if (!ENDPOINT)
  throw new Error('Must specify CSOL_AESTIMIA_URL in the environment');

if (!SECRET)
  throw new Error('Must specify CSOL_AESTIMIA_SECRET in the environment');

var aestimia = new Api(ENDPOINT, {

  submit: function (application, callback) {
    var api = this;

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

                evidence.forEach(function(item, index) {
                  var obj = {
                    url: item.getLocationUrl(),
                    mediaType: item.mediaType
                  };

                  if (!index && application.description)
                    obj.reflection = application.description;

                  submission.evidence.push(obj);
                });

                api.post('/submission', submission, function (err, rsp) {
                  console.log(err);
                  console.log(rsp);

                  callback(err);
                });
              });
            });
      });
  }

});

aestimia.defaultOptions = {
  auth: {
    username: 'api',
    password: SECRET,
    sentImmediately: false
  }
};

module.exports = aestimia;