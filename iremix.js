const Api = require('./api');
const logger = require('./logger');
const mandrill = require('./mandrill');
const url = require('url');

const ENDPOINT = process.env['CSOL_IREMIX_URL'];
const IREMIX_USER = process.env['CSOL_IREMIX_USER'];
const IREMIX_PASS = process.env['CSOL_IREMIX_PASS'];

if (!ENDPOINT)
  throw new Error('Must specify CSOL_IREMIX_URL in the environment');

if (!IREMIX_USER)
  throw new Error('must specify CSOL_IREMIX_USER in the environment');

if (!IREMIX_PASS)
  throw new Error('must specify CSOL_IREMIX_PASS in the environment');

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.substring(1);
}


var iremix = new Api(ENDPOINT, {

  invite: function (query, callback) {
    callback = callback || function(){};

    var api = this;
    var badges = query.badges;
    var learner = query.learner;

    if (badges === null || badges.length < 1) {
      logger.log('info', 'iremix.invite called with null or empty autoAwardedBadges');
      return callback(null);
    }

    return learner.getGuardian().complete(function (err, guardian) {
      if (err) {
        return callback(err);
      }

      var params = {
        status: 'ok',
        behaviors: {},
        badges: {},
        user: {
          email: learner.email,
          name: learner.firstName,
          surname: learner.lastName,
          birthday_day: learner.birthday.getDate(),
          birthday_month: learner.birthday.getMonth()+1,
          birthday_year: learner.birthday.getFullYear(),
          guardian_email: guardian ? guardian.email : null,
          username: learner.username
        }
      };

      badges.forEach(function(data) {
        params.badges[data.badge.shortname] = { issuedOn: data.badge.issuedOn, assertionUrl: data.badge.assertionUrl, isRead: data.badge.isRead };
      });

      return api.post('/people/invite', {json:params}, function (err, rsp) {
        var badge = badges[0].badge;
        var email = guardian ? guardian.email : learner.email;

        if (rsp && rsp.status === 'already_registered') {
          return mandrill.send('steam award', { earnerName: learner.username, badgeName: badge.name, steamField: capitalize(badge.categoryAward) }, email, function(err) {
            return callback(err);
          });
        }

        if (err) {
          return callback(err);
        }

        var inviteUrl = url.format({
          protocol: 'http:',
          host: url.parse(ENDPOINT).host,
          pathname: url.parse(rsp.invitation_url).pathname,
          query: {'invitation_token' : rsp.invitation_code }
        });

        return mandrill.send('steam award with invite', { earnerName: learner.username, iremixUrl: inviteUrl, badgeName: badge.name, steamField: capitalize(badge.categoryAward) }, email, function(err) {
          return callback(err);
        });
      });
    });
  }
});

iremix.defaultOptions = {
  auth: {
    username: IREMIX_USER,
    password: IREMIX_PASS,
    sendImmediately: true
  }
};

module.exports = iremix;

module.exports.healthCheck = function(meta, cb) {
  // TODO: Implement health check
  cb(null);
};
