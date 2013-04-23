const _ = require('underscore');


exports.addCsrfToken = function addCsrfToken (req, res, next) {
  res.locals.csrfToken = req.session._csrf;
  next();
};

exports.addRangeMethod = function addRangeMethod (req, res, next) {
  // This should be in Nunjucks, but right now it's not
  // https://github.com/jlongster/nunjucks/issues/72
  res.locals.range = _.range;
  next();
};
