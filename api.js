var request = require('request');
var _ = require('underscore');
var ServerError = require('./server-error');


var DEFAULT_ERROR = 'There was a problem accessing this data.';
var DEFAULT_QUERY = {
  page: 1,
  pageSize: 12
};


// Core API function
// Loads data into `request.remote`, and intercepts XHR requests
function api (method, default_query) {
  return function (req, res, next) {
    if (!_.isFunction(method))
      method = api[method];

    if (!_.isFunction(method)) {
      console.error('Method supplied to API not a function');
      return next('Supplied method not valid');
    }

    // Build query from various inputs
    var query = _.extend(
      DEFAULT_QUERY,
      default_query || {},
      req.query || {},
      req.body || {},
      req.params || {}
    );

    method(query, function(err, data) {
      if (!_.isObject(data))
        data = {};

      if (err)
        return next(err);

      if (req.xhr)
        return res.json(data);

      req.remote = data;
      return next();
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

      if (_.isString(err))
        err = new ServerError(500, err);

      return callback(err, data);
    });
  }
}

// Load data from remote endpoint
var remote = (function() {
  function remote (method, path, callback) {
    // TODO - put this in settings somewhere
    var origin = 'http://openbadger-csol.mofostaging.net';

    if (!request[method])
      return callback(new ServerError(500, 'Unknown method'));

    // TODO - need to add ability to pass data through
    // TODO - might want to cache this at some point
    request[method](origin + path, function(err, response, body) {
      if (err)
        return callback(new ServerError(500, err));

      if (response.statusCode !== 200)
        return callback(new ServerError(500, 'Upstream error'));

      try {
        var data = JSON.parse(body);
      } catch (e) {
        return callback(new ServerError(500, e.message));
      }

      if (data.status !== 'ok')
        return callback(new ServerError(500, data.reason));

      return callback(null, data);
    });
  }

  _.each(['get', 'post', 'put', 'patch', 'head', 'del'], function(method) {
    Object.defineProperty(remote, method, {
      enumerable: true,
      value: function(path, callback) {
        remote(method, path, callback);
      }
    });
  });

  return remote;
})();

// Make sure badges returned from remote API
// contain all the information we need
function normalizeBadge (badge, id) {
  if (!id)
    id = badge.shortname;

  if (!badge.id)
    badge.id = id;

  if (!badge.url)
    badge.url = '/badges/' + badge.id;

  return badge;
}

api.getBadges = apiMethod(function getBadges (query, callback) {
  var pageSize = parseInt(query.pageSize, 10),
      page = parseInt(query.page, 10);

  if (isNaN(pageSize) || pageSize < 1)
    return callback(new ServerError(400, 'Invalid pageSize number'));

  if (isNaN(page) || page < 1)
    return callback(new ServerError(400, 'Invalid page number'));

  var start = (page - 1) * pageSize,
      end = start + pageSize;

  remote.get('/v1/badges', function(err, data) {
    if (err)
      return callback(err, data);

    var badges = _.map(data.badges, normalizeBadge);
    var pages = Math.ceil(badges.length / pageSize);

    if (page > pages)
      return callback(new ServerError(404, 'Page not found'));

    return callback(null, {
      page: page,
      pages: pages,
      badges: badges.slice(start, end)
    });
  });
});

api.getBadge = apiMethod(function getBadge (query, callback) {
  var id = query.id;

  if (!id)
    return callback(new ServerError(400, 'Invalid badge key'));

  remote('get', '/v1/badges', function(err, data) {
    if (err)
      return callback(err, data);

    var badge = data.badges[id];

    if (!badge)
      return callback(new ServerError(404, 'Badge not found'));

    normalizeBadge(badge, id);

    return callback(null, {
      badge: badge
    });
  });
});

module.exports = api;
