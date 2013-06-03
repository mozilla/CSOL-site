const jwt = require('jwt-simple');
const util = require('util');
var db = require('../db');
const learners = db.model('Learner');
const mandrill = require('../mandrill');
const openbadger = require('../openbadger');
const url = require('url');

const JWT_SECRET = process.env.CSOL_OPENBADGER_SECRET;
const CSOL_HOST = process.env.CSOL_HOST;

if (!JWT_SECRET)
  throw new Error('Must specify CSOL_OPENBADGER_SECRET in the environment');

if (!CSOL_HOST)
  throw new Error('Must specify CSOL_HOST in the environment');


function handleIssuedClaim(emailAddress, code, callback) {
  learners.find({ where: { email: emailAddress } }).success(function(learner) {
    if (learner === null || learner.underage === 1) {
      var claimUrl = url.format({
        protocol : 'http:',
        host : CSOL_HOST,
        pathname: '/claim',
        query : { code: code }
      });

      mandrill.send('badge claim', { claimUrl: claimUrl }, emailAddress, function(err) {
        return callback(err)
      });
    }
    else {
      // Found a >13 learner, can automatically claim badge.
      openbadger.claim({
        code: code,
        email: emailAddress
      }, function (err, data) {
        return callback(err);
      });
    }
  })
}

function auth(req, res, next) {
  const param = req.method === "GET" ? req.query : req.body;
  const token = param.auth;
  const email = param.email;

  const now = Date.now()/1000|0;
  var decodedToken, msg;
  if (!token)
    return respondWithError(res, 'missing mandatory `auth` param');
  if (!JWT_SECRET)
    return respondWithError(res, 'Environment variable CSOL_OPENBADGER_SECRET is not set.');
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