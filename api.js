var request = require('request');
var errors = require('./lib/errors');
var _ = require('underscore');


var DEFAULT_ERROR = 'There was a problem accessing this data.';
var DEFAULT_QUERY = {
  page: 1,
  pageSize: 12
};

function middleware (method, default_query) {
  if (!_.isFunction(method))
    method = this[method]; 

  if (!_.isFunction(method)) {
    throw new Error('Supplied method ' + method + ' not valid');
  }

  return function (req, res, next) {

    // Build query from various inputs
    var query = _.extend(
      DEFAULT_QUERY,
      default_query || {},
      req.query || {},
      req.body || {},
      req.params || {}
    );

    method(query, function(err, data) {
      if (!data || _.isString(data))
        data = {message: data || DEFAULT_ERROR};

      if (!_.isObject(data))
        data = {data: data};

      if (req.xhr)
        data.status = err ? err.status.toLowerCase() : 'ok';
        return res.json(data);

      req.remote = data;

      if (err)
        return next(err);

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
      if (err)
        return callback(err, data);

      callback(null, data);
    });
  }
}

// Load data from remote endpoint
function remote (method, path, callback) {

  if (!request[method])
    return callback(new errors.NotImplemented('Unknown method ' + method));

  // TODO - need to add ability to pass data through
  // TODO - might want to cache this at some point
  request[method](this.origin + path, function(err, response, body) {
    if (err)
      return callback(new errors.Unknown(err));

    if (response.statusCode !== 200)
      // TODO - add logging so the upstream error can be debugged
      return callback(new (errors.lookup(response.statusCode))());

    try {
      var data = JSON.parse(body);
    } catch (e) {
      return callback(new errors.Unknown(e.message));
    }

    if (data.status !== 'ok')
      return callback(new errors.Unknown(data.reason), data);

    callback(null, data);
  });
}

function paginate(key, dataFn) {
  if (!dataFn && _.isFunction(key)) {
    dataFn = key;
    key = 'data';
  }

  return function(query, callback) {
    var pageSize = parseInt(query.pageSize, 10),
        page = parseInt(query.page, 10);

    if (isNaN(pageSize) || pageSize < 1)
      return callback(new errors.BadRequest('Invalid pageSize number'));

    if (isNaN(page) || page < 1)
      return callback(new errors.BadRequest('Invalid page number'));

    var start = (page - 1) * pageSize,
        end = start + pageSize;

    dataFn(query, function(err, data) {
      if (err)
        return callback(err, data);

      if (!data[key].length) 
        return callback(new errors.BadGateway('Unpageable data returned from upstream'), data);

      var pages = Math.ceil(data[key].length / pageSize);

      if (page > pages)
        return callback(new errors.NotFound('Page not found'), {
          page: page,
          pages: pages
        });

      data[key] = data[key].slice(start, end);
      callback(null, _.extend(data, {
        page: page,
        pages: pages,
      }));
    });
  };
}

module.exports = function Api(origin, config) {
  config = config || {};

  this.origin = origin;

  _.each(['get', 'post', 'put', 'patch', 'head', 'del'], function(method) {
    Object.defineProperty(this, method, {
      enumerable: true,
      value: function(path, callback) {
        this.remote(method, path, callback);
      },
      writable: true // This is needed for mocking
    });
  }, this);

  _.each(config, function(item, name) {
    var methodConfig = _.isObject(item) ? item : {};
    var method = _.isFunction(item) ? item : methodConfig.func;
    method = method.bind(this);
    if (methodConfig.paginate) {
      var key = methodConfig.key || 'data';
      method = paginate(key, method);
    }
    this[name] = apiMethod(method);
  }, this);

  _.extend(this, {
    middleware: middleware,
    remote: remote
  });

};


