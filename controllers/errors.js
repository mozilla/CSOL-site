function errorHandler(err, req, res, next) {
  var statusCode = err.statusCode || 500;
  var message = err.message || 'There was a problem accessing the site.';
  if (req.xhr)
    res.json(statusCode, { error: message });
  else
    res.send(statusCode, message);
}

module.exports = function (app) {
  app.use(errorHandler);
};
module.exports.errorHandler = errorHandler;