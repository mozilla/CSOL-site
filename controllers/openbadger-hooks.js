const jwt = require('jwt-simple');
const util = require('util');
var db = require('../db');
const learners = db.model('Learner');
const guardians = db.model('Guardian');
const mandrill = require('../mandrill');
const openbadger = require('../openbadger');
const url = require('url');

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
      openbadger.claim({ code: code, email: email }, function (err, data) {
          return callback(err);
      });
    }
    else {
      var claimUrl = url.format({
        protocol : 'http:',
        host : CSOL_HOST,
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

function auth(req, res, next) {
  const param = req.method === "GET" ? req.query : req.body;
  const token = param.auth;
  const email = param.email;

  const now = Date.now()/1000|0;
  var decodedToken, msg;
  if (!token)
    return respondWithError(res, 'missing mandatory `auth` param');
  try {
    decodedToken = jwt.decode(token, JWT_SECRET);
  } catch(err) {
    return respondWithError(res, 'error decoding JWT: ' + err.message);
  }
  if (decodedToken.prn !== email) {
    msg = '`prn` mismatch: given %s, expected %s';
    return respondWithError(res, util.format(msg, decodedToken.prn, email));
  }

  if (!decodedToken.exp)
    return respondWithError(res, 'Token must have exp (expiration) set');

  if (decodedToken.exp < now)
    return respondWithError(res, 'Token has expired');

  return next();
}

function respondWithError(res, reason) {
  return res.send(403, { status: 'forbidden', reason: reason });
}

module.exports = function (app) {
  app.post('/notify/claim', auth, function (req, res, next) {
    var claimCode = req.body.claimCode;
    var email = req.body.email;

    if (!claimCode)
      return respondWithError(res, 'No claimCode provided');

    claimCode = claimCode.trim();

    handleIssuedClaim(email, claimCode, function(err) {
      if (err)
        return respondWithError(res, 'An error occurred while attempting to handle this claim notification.');

      return res.send(200, { status: 'ok' });
    });
  });
};