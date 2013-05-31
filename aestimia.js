const Api = require('./api');
const async = require('async');
const openbadger = require('./openbadger');
const errors = require('./lib/errors');
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_AESTIMIA_URL'];
const SECRET = process.env['CSOL_AESTIMIA_SECRET'];
const CSOL_HOST = process.env['CSOL_HOST'];

if (!ENDPOINT)
  throw new Error('Must specify CSOL_AESTIMIA_URL in the environment');

if (!SECRET)
  throw new Error('Must specify CSOL_AESTIMIA_SECRET in the environment');

if (!CSOL_HOST)
  throw new Error('Must specify CSOL_HOST in the environment');

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
                  criteriaUrl: api.getFullUrl(CSOL_HOST, badge.url),
                  onChangeUrl: api.getFullUrl(CSOL_HOST, '/applications'),
                  achievement: {
                    name: badge.name,
                    description: badge.description,
                    imageUrl: badge.image
                  },
                  classifications: badge.categories || [],
                  evidence: [],
                  rubric: badge.rubric || {items: [{text: 'Has done some work', required: true}]}
                };

                if (learner.email)
                  submission.learner = learner.email;

                if (learner.underage)
                  submission.cannedResponses = [
                    'You did a great job!',
                    'You went above and beyond.',
                    'Keep up the good work!',
                    'Good job.',
                    'You met all the criteria needed to earn this badge.',
                    'Creative and thoughtful work.',
                    'Nice reflection of your work.',
                    'You didn\'t submit relevant evidence.',
                    'Your evidence did not properly reflect the criteria.',
                    'Good work! But you still have a few criteria to meet to earn this badge. Make sure you take a look at all the criteria before reapplying.'
                  ];

                evidence.forEach(function(item, index) {
                  var obj = {
                    url: api.getFullUrl(CSOL_HOST, item.getLocationUrl()),
                    mediaType: item.mediaType.split('/')[0]
                  };

                  if (!index && application.description)
                    obj.reflection = application.description;

                  submission.evidence.push(obj);
                });

                api.post('/submission', {json:submission}, function (err, rsp) {
                  if (err)
                    return callback(err);

                  callback(null, (rsp||{}).id);
                });
              });
            });
      });
  },

  update: function (application, callback) {
    var api = this;

    var submissionId = application.submissionId;
    var latestReview = application.getReview();

    if (!submissionId)
      return callback('Application has not yet been submitted');

    this.get('/submissions/' + submissionId, function (err, submission) {
      var rubrics = submission.rubric.items;
      var reviews = submission.reviews;

      // Bail early, if there are no reviews
      if (!reviews.length)
        return callback(null, application);

      // Sort the reviews by (ascending) date, if required
      if (reviews.length > 1) {
        reviews.sort(function(a, b) {
          if (a.date === b.date)
            return 0;
          return a.date < b.date;
        });
      }

      // Take the most recent review
      var review = reviews.pop();

      // If we've already seen it, bail
      if (review._id === latestReview._id)
        return callback(null, application);

      var satisfiedRubrics = review.satisfiedRubrics;
      var satisfied = false;

      // If something is satisfied, see if it's enough to award the badge
      if (satisfiedRubrics.length) {
        satisfied = true;

        rubrics.forEach(function (rubric, index) {
          var rubricSatisfied = !rubric.required || (satisfiedRubrics.indexOf(index) >= 0);
          satisfied &= rubricSatisfied;
        });
      }

      var state = satisfied ? 'accepted' : 'rejected';

      if (state !== application.state) {
        // TO DO - email applicant about change of application state
      }

      application.updateAttributes({
        state: state,
        latestReview: JSON.stringify(review)
      })
        .complete(function(err) {
          if (err)
            return callback(err, application);

          callback(null, application);
        });
    });
  }

});

aestimia.defaultOptions = {
  auth: {
    username: 'api',
    password: SECRET,
    sendImmediately: false
  }
};

module.exports = aestimia;