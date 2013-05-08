var request = require('request');
var _ = require('underscore');


var DEFAULT_ERROR = 'There was a problem accessing this data.';
var DEFAULT_QUERY = {
  page: 1
};


// Core API function
// Used as middleware to intercept XHR requests
function api (method) {
  return function (req, res, next) {
    if (!_.isFunction(method))
      method = api[method];

    if (!_.isFunction(method))
      return res.json({error: 500, message: DEFAULT_ERROR});

    // Build query from various inputs
    var query = _.extend(
      DEFAULT_QUERY,
      req.query||{},
      req.body||{},
      req.params||{}
    );

    method(query, function(err, data) {
      if (!_.isObject(data))
        data = {};

      if (err)
        data.error = err;

      if (req.xhr) {
        res.contentType('application/json');
        return res.json(data);
      }

      req.remote = {
        err: err,
        data: data
      }
      next();
    });
  }
}

// Wrapper for API methods
// Normalises input and output
function apiMethod (method) {
  return function (query, callback) {
    if (_.isFunction(query) && !callback) {
      callback = query;
      query = {};
    }

    // Assume any non-object query is being passed in as an ID
    if (!_.isObject(query))
      query = {id: query};

    query = _.defaults(query, DEFAULT_QUERY);

    method(query, function(err, data) {
      if (!err)
        return callback(null, data);

      if (!data || _.isString(data))
        data = {message: data || DEFAULT_ERROR};

      callback(err, data);
    });
  }
}

// Load data from remote endpoint
function remote (method, path, callback) {
  // TODO - put this in settings somewhere
  var origin = 'http://openbadger-csol.mofostaging.net';

  if (!request[method])
    return callback(500, 'Unknown method');

  // TODO - need to add ability to pass data through
  // TODO - might want to cache this at some point
  request[method](origin + path, function(err, response, body) {
    if (err)
      return callback(500, err);

    if (response.statusCode !== 200)
      return callback(500, 'Upstream error');

    try {
      var data = JSON.parse(body);
    } catch (e) {
      return callback(500, e.message);
    }

    if (data.status !== 'ok')
      return callback(500, data.reason);

    callback(null, data);
  });
}

// Make sure badges returned from remote API
// contain all the information we need
function normalizeBadge (badge, id) {
  if (!badge.id)
    badge.id = id;

  if (!badge.url)
    badge.url = '/badges/' + badge.id;

  return badge;
}

api.getBadges = apiMethod(function getBadges (query, callback) {
  var pageSize = 12,
      page = parseInt(query.page, 10),
      start = (page - 1) * pageSize,
      end = start + pageSize;

  if (isNaN(page) || page < 1)
    return callback(400, 'Invalid page number');

  remote('get', '/v1/badges', function(err, data) {
    if (err)
      return callback(err, data);

    var badges = _.map(data.badges, normalizeBadge);
    var pages = Math.ceil(badges.length / pageSize);

    if (page > pages)
      return callback(404, {
        message: 'Page not found',
        page: page,
        pages: pages
      });

    callback(null, {
      page: page,
      pages: pages,
      items: badges.slice(start, end)
    });
  });
});

api.getBadge = apiMethod(function getBadge (query, callback) {
  var id = query.id;

  if (!id)
    return callback(400, 'Invalid badge key');

  remote('get', '/v1/badges', function(err, data) {
    if (err)
      return callback(err, data);

    var badge = data.badges[id];

    if (!badge)
      return callback(404, 'Badge not found');

    normalizeBadge(badge, id);

    callback(null, {
      badge: badge
    });
  });
});

module.exports = api;
