var request = require('request');
var errors = require('./lib/errors');
var _ = require('underscore');
var logger = require('./logger');
var url = require('url');


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
      req.params || {},
      { session: req.session || {} } // TODO: move session to separate arg
    );

    method(query, function(err, data) {
      if (!data || _.isString(data))
        data = {message: data || DEFAULT_ERROR};

      if (!_.isObject(data))
        data = {data: data};

      if (req.xhr) {
        data.status = err ? err.status.toLowerCase() : 'ok';
        return res.json(data);
      }

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

    if (!_.isFunction(callback))
      callback = function() {};

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

function getFullUrl(origin, path) {
  if (!_.isObject(origin))
    origin = url.parse(origin);

  path = path || '';
  path = path.replace(/^\/?/, '');

  return url.format(_.extend(
    origin,
    { pathname: origin.path + path }));
}

// Load data from remote endpoint
// TODO - need to add ability to pass data through
// TODO - might want to cache this at some point
function remote (method, path, options, callback) {
  if (!request[method])
    return callback(new errors.NotImplemented('Unknown method ' + method));

  if (_.isFunction(options)) {
    callback = options;
    options = {};
  }

  if (this.defaultOptions && _.isObject(this.defaultOptions)) {
    options = _.defaults(options, this.defaultOptions);
  }

  var endpointUrl = getFullUrl(this.origin, path);
  request[method](endpointUrl, options, function(err, response, body) {

    logger.log('info', 'API request: "%s %s" %s',
      method.toUpperCase(), endpointUrl, response ? response.statusCode : "Error", err);

    if (err)
      return callback(new errors.Unknown(err));

    if (response.statusCode >= 300) {
      var msg;

      if (!_.isObject(body)) {
        try {
          body = JSON.parse(body) || {};
        } catch (e) {
          body = {};
        };
      }

      msg = body.message || body.reason || errors.lookup(response.statusCode).status;

      return callback(new errors.BadGateway(msg, body));
    }

    try {
      var data = body;
      if (!_.isObject(body))
        data = JSON.parse(data);
    } catch (e) {
      return callback(new errors.Unknown(e.message));
    }

    if ('status' in data && data.status !== 'ok')
      return callback(new errors.Unknown(data.reason || body.message), data);

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

      if (typeof data[key].length !== 'number') 
        return callback(new errors.BadGateway('Unpageable data returned from upstream'), data);

      var pages = Math.ceil(data[key].length / pageSize);

      if (pages > 0 && page > pages)
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

function addFilters(filters, key, dataFn) {
  if (!dataFn && _.isFunction(key)) {
    dataFn = key;
    key = 'data';
  }

  return function(query, callback) {
    dataFn(query, function(err, data) {
      if (err)
        return callback(err, data);

      if (typeof data[key].length === 'number') {
        _.each(filters, function (filter) {
          data[key] = filter(data[key], query);
        });
      }

      callback(null, data);
    })
  }
}

module.exports = function Api(origin, globalFilters, config) {
  if (!config) {
    config = globalFilters;
    globalFilters = [];
  }

  config = config || {};
  globalFilters = globalFilters || [];

  if (_.isFunction(globalFilters))
    globalFilters = [globalFilters];

  origin = url.parse(origin);
  this.origin = origin;

  _.each(['get', 'post', 'put', 'patch', 'head', 'del'], function(method) {
    Object.defineProperty(this, method, {
      enumerable: true,
      value: function(path, opts, callback) {
        this.remote(method, path, opts, callback);
      },
      /* TODO: writable is set to true for mocking, but it would
         be nice to revisit and try to remove that line. */
      writable: true 
    });
  }, this);

  _.each(config, function(item, name) {
    var methodConfig = _.isObject(item) ? item : {};
    var method = _.isFunction(item) ? item : methodConfig.func;
    var key = methodConfig.key || 'data';
    var filters = methodConfig.filters || [];

    if (_.isFunction(filters))
      filters = [filters];

    method = method.bind(this);

    if (filters.length)
      method = addFilters(filters, key, method);

    if (globalFilters.length)
      method = addFilters(globalFilters, key, method);

    if (methodConfig.paginate)
      method = paginate(key, method);

    this[name] = apiMethod(method);
  }, this);

  _.extend(this, {
    middleware: middleware,
    remote: remote,
    getFullUrl: getFullUrl
  });

};


