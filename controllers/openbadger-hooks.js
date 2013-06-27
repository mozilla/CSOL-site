const jwt = require('jwt-simple');
const util = require('util');
const db = require('../db');
const learners = db.model('Learner');
const guardians = db.model('Guardian');
const mandrill = require('../mandrill');
const openbadger = require('../openbadger');
const iremix = require('../iremix');
const url = require('url');
const logger = require('../logger');
const s3 = require('../s3');

const JWT_SECRET = process.env.CSOL_OPENBADGER_SECRET;
const CSOL_HOST = process.env.CSOL_HOST;

if (!JWT_SECRET)
  throw new Error('Must specify CSOL_OPENBADGER_SECRET in the environment');

if (!CSOL_HOST)
  throw new Error('Must specify CSOL_HOST in the environment');

function handleIssuedClaim(email, code, callback) {
  learners.find({ where: { email: email } }).success(function(learner) {
    if (learner !== null && !learner.underage) {
      // email matched a >13 learner.  Can immediately claim the badge.
      openbadger.claim({ code: code, learner: learner }, function (err, data) {
          return callback(err);
      });
    }
    else {
      var claimUrl = url.format({
        protocol : 'http:',
        host : url.parse(CSOL_HOST).host,
        pathname: '/claim',
        query : { code: code }
      });

      openbadger.getBadgeFromCode({ code: code, email: email }, function(err, badgeData) {
        if (err)
          return callback(err);

        if (learner === null) {
          guardians.find({ where: { email: email} }).success(function(guardian) {
            if (guardian !== null) {
              // email matched a guardian.  unknown child.
              mandrill.send('<13 badge claim', { claimUrl: claimUrl, badgeName: badgeData.badge.name }, email, function(err) {
                return callback(err);
              });
            }
            else {
              // email did not match any existing guardian or learner.
              mandrill.send('unknown badge claim', { claimUrl: claimUrl, badgeName: badgeData.badge.name }, email, function(err) {
                return callback(err);
              });
            }
          });
        }
        else if (learner.underage) {
          learner.getGuardian().complete(function (err, guardian) {
            if (err)
              return callback(err);

            // email matched an underage learner.  Email the guardian
            mandrill.send('<13 badge claim with name', { claimUrl: claimUrl, earnerName: learner.username, badgeName: badgeData.badge.name }, guardian.email, function(err) {
              return callback(err)
            });
          });
        }
      });
    }
  });
}

function respondWithForbidden(res, reason) {
  return res.send(403, { status: 'forbidden', reason: reason });
}

function auth(req, res, next) {
  const param = req.method === "GET" ? req.query : req.body;
  const token = param.auth;
  const email = param.email;

  const now = Date.now()/1000|0;
  var decodedToken, msg;
  if (!token)
    return respondWithForbidden(res, 'missing mandatory `auth` param');
  try {
    decodedToken = jwt.decode(token, JWT_SECRET);
  } catch(err) {
    return respondWithForbidden(res, 'error decoding JWT: ' + err.message);
  }
  if (decodedToken.prn !== email) {
    msg = '`prn` mismatch: given %s, expected %s';
    return respondWithForbidden(res, util.format(msg, decodedToken.prn, email));
  }

  if (!decodedToken.exp)
    return respondWithForbidden(res, 'Token must have exp (expiration) set');

  if (decodedToken.exp < now)
    return respondWithForbidden(res, 'Token has expired');

  return next();
}

module.exports = function (app) {
  app.post('/notify/claim', auth, function (req, res, next) {
    var claimCode = req.body.claimCode;
    var email = req.body.email;

    if (req.body.isTesting)
      return module.exports.testHandler(req, res, next);

    if (!claimCode)
      return res.send(500, { status: 'error', error: 'No claimCode provided' });

    claimCode = claimCode.trim();

    handleIssuedClaim(email, claimCode, function(err) {
      if (err) {
        logger.log('info', 'Error encountered while handling claim code %s for user %s: %s', claimCode, email, err.toString());
        return res.send(500, { status: 'error', error: 'An error occurred while attempting to handle this claim notification.' });
      }

      return res.send(200, { status: 'ok' });
    });
  });

  app.post('/notify/award', auth, function (req, res, next) {
    var badgeShortname = req.body.badgeShortname;
    var email = req.body.email;

    if (!badgeShortname)
      return res.send(500, { status: 'error', error: 'No badgeShortname provided' });

    badgeShortname = badgeShortname.trim();

    openbadger.getUserBadge({ id: badgeShortname, email: email }, function(err, badge) {
      if (err) {
        logger.log('info', 'Failed to get user badge from openbadger for email %s', email);
        return res.send(500, { status: 'error', error: 'Database error' });
      }
      learners.find({where: {email: email}}).complete(function(err, learner) {
        if (err) {
          logger.log('info', 'Failed to get learner for email %s', email);
          return res.send(500, { status: 'error', error: 'Database error' });
        }
        iremix.invite({ learner: learner, badges: [badge] });
        return res.send(200, { status: 'ok' });
      });
   });
  });
};

module.exports.testHandler = function(req, res, next) {
  var claimCode = req.body.claimCode;

  if (req.body.isTesting !== true)
    return res.send(200, "body.isTesting !== true");

  if (!(claimCode && typeof(claimCode) == "string"))
    return res.send(200, "body.claimCode is empty");

  s3.putBuffer(new Buffer(claimCode), '/' + claimCode, {
    'Content-Type': 'text/plain'
  }, function(err) {
    if (err) return res.send(200, "s3 putbuffer failed");

    return res.send(200, "S3_ITEM_CREATED");
  });
};
