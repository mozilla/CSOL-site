var request = require('request');
var _ = require('underscore');


var DEFAULT_ERROR = 'There was a problem accessing this data.';
var DEFAULT_QUERY = {
  page: 1,
  pageSize: 12
};


// Core API function
// api(method) returns middleware function 
// that calls method with:
//    query:     Specifies parameters for API call
//    callback:  Method invokes callback(err, data)
//      Loads data into `request.remote`, and intercepts XHR requests,
//      or calls next(err)
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
      if (err) {
        if (!data || _.isString(data))
          data = {message: data || DEFAULT_ERROR};
        data.error = err;
      }

      if (req.xhr)
        return res.json(data);

      req.remote = data;

      if (data.error)
        return next(data);

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
var remote = function(origin) {
  function remote (method, path, callback) {

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

  var self = {};

  _.each(['get', 'post', 'put', 'patch', 'head', 'del'], function(method) {
    Object.defineProperty(self, method, {
      enumerable: true,
      value: function(path, callback) {
        remote(method, path, callback);
      },
      writable: true // This is needed for mocking
    });
  });

  return self;
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
      return callback(400, 'Invalid pageSize number');

    if (isNaN(page) || page < 1)
      return callback(400, 'Invalid page number');

    var start = (page - 1) * pageSize,
        end = start + pageSize;

    dataFn(query, function(err, data) {
      if (err)
        return callback(err, data);

      var pages = Math.ceil(data[key].length / pageSize);

      if (page > pages)
        return callback(404, {
          message: 'Page not found',
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

module.exports = api;
module.exports.remote = remote;
module.exports.apiMethod = apiMethod;
module.exports.paginate = paginate;
