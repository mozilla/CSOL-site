var express = require('express');
var _ = require('underscore');


var COOKIE_KEY = 'csol_state';

if ('COOKIE_SECRET' in process.env) {
  var COOKIE_SECRET = process.env.SESSION_SECRET;
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
