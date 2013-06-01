var _ = require('underscore');

function middleware (env, config) {
  return function(err, req, res, next) {
    if (req.xhr)
      return res.json(err);

    var templates = [
      err.status,
      err.code,
      Unknown.status,
      Unknown.code
    ];

    templates.forEach(function(item, index, list) {
      var templateName = (''+item)
        .replace(/\s+/g, '-')
        .toLowerCase();
      list[index] = './errors/' + templateName + '.html';
    });

    function render (template) {
      if (!template)
        return res.send(err);

      try {
        template = env.getTemplate(template);
        res.status(err.code || 500);
        res.send(template.render(_.defaults({
          error: err
        }, res.locals)));
      } catch (e) {
        if (e.name === 'Template render error')
          console.log('Error rendering template:', template.path);
        render(templates.shift());
      }
    }

    render(templates.shift());
  }
}

module.exports = function (app, env, config) {
  // Generate a 404 - if we've got this far, the page doesn't exist
  app.use(function(req, res, next) {
    next(new NotFound(req.url));
  })

  // It would be nice not to have to pass env around, but it doesn't
  // seem to be available through `app`, and there doesn't seem to be
  // a nice way of catching a failed template rendering attempt.
  app.use(middleware(env, config));
}

var register = {};

function createExceptionType (name, code) {
  if (!code) code = 500;

  var status = name
    .replace(/\s+/g, ' ')
    .replace(/(^\s+|\s+$)/g, '')
    .replace(/\w[A-Z]/g, function(m) { return m[0] + ' ' + m[1]; });

  function Exception (msg, meta) {
    this.name = name;
    this.status = status;
    this.code = code;
    this.message = msg || status;
    this.meta = meta;
    Error.call(this, this.message);
    Error.captureStackTrace(this, arguments.callee);
  }

  Exception.prototype = new Error();
  Exception.prototype.constructor = Exception;
  Exception.prototype.toString = function () {
    var msg = '[' + this.name + ' Exception: ' + this.message + ']';

    if ('DEBUG' in process.env)
      return this.stack ? msg + this.stack : '';

    return msg;
  }

  Exception.status = status;
  Exception.code = code;

  register[code] = Exception;

  return Exception;
}

var BadRequest = createExceptionType('BadRequest', 400);
var Unauthorized = createExceptionType('Unauthorized', 401);
var Forbidden = createExceptionType('Forbidden', 403);
var NotFound = createExceptionType('NotFound', 404);
var NotAllowed = createExceptionType('MethodNotAllowed', 405);
var Conflict = createExceptionType('Conflict', 409);
var Unsupported = createExceptionType('UnsupportedMediaType', 415);
var Unknown = createExceptionType('Internal', 500);
var NotImplemented = createExceptionType('NotImplemented', 501);
var BadGateway = createExceptionType('BadGateway', 502);

module.exports.BadRequest = BadRequest;
module.exports.Unauthorized = Unauthorized;
module.exports.Forbidden = Forbidden;
module.exports.NotFound = NotFound;
module.exports.NotAllowed = NotAllowed;
module.exports.Conflict = Conflict;
module.exports.Unsupported = Unsupported;
module.exports.Unknown = Unknown;
module.exports.NotImplemented = NotImplemented;
module.exports.BadGateway = BadGateway;

module.exports.lookup = function lookup (code) {
  if (!register[code])
    code = 500;

  return register[code];
};
