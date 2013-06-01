var errors = require('./lib/errors');
var express = require('express');
var _ = require('underscore');


var COOKIE_KEY = 'csol_state';

if ('COOKIE_SECRET' in process.env) {
  var COOKIE_SECRET = process.env.COOKIE_SECRET;
} else {
  // TODO - switch this behaviour to be more like that in the backpack,
  // where a token is generated automatically and stored for future use
  // See: https://github.com/mozilla/openbadges/blob/development/middleware.js#L14
  throw new Error('COOKIE_SECRET not set in environment');
}


exports.session = function session (config) {
  return express.session({
    secret: COOKIE_SECRET,
    key: COOKIE_KEY,
    cookie: _.defaults(config || {}, {
      httpOnly: true,
      maxAge: (7 * 24 * 60 * 60 * 1000), //one week
      secure: false
    })
  });
};


exports.loggedIn = function loggedIn(req, res, next) {
  var user = req.session.user;
  if (!user) {
    req.session.afterLogin = req.originalUrl;
    return res.redirect('/login');
  }
  return next();
};

exports.csrf = function (options) {
  options = options || {};
  var value = options.value || defaultCsrfValue;
  var list = options.whitelist;
  return function (req, res, next) {
    if (whitelisted(list, req.url))
      return next();

    var token = req.session._csrf || (req.session._csrf = uid(24));

    if ('GET' === req.method || 'HEAD' === req.method)
      return next();

    var val = value(req);
    if (val != token) {
      // logger.debug("CSRF token failure");
      return next(errors.Forbidden());
    }
    next();
  };
};

function defaultCsrfValue (req) {
  return (req.body && req.body._csrf)
    || (req.query && req.query._csrf)
    || (req.headers['x-csrf-token']);
}

function whitelisted (list, input) {
  var pattern;

  for (var i = list.length; i--;) {
    pattern = list[i];
    if (RegExp('^' + list[i] + '$').test(input))
      return true;
  }

  return false;
}

function uid (len) {
  var buf = [];
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charlen = chars.length;
  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }
  return buf.join('');
};

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
