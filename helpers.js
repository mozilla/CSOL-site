const querystring = require('querystring');
const url = require('url');
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

exports.addPaginateMethod = function addPaginateMethod (req, res, next) {
  function page (options) {
    var path = options.path,
        pageNum = options.pageNum,
        display = options.display,
        className = options.className,
        el = options.el;

    var query = querystring.parse(path.query),
        content,
        href;

    if (pageNum === 1)
      delete query.page
    else
      query.page = pageNum

    query = querystring.stringify(query);
    href = path.href.replace(/\?.*$/, '') + (query ? '?' + query : '');

    if (pageNum === null) {
      content = '<span>' + display + '</span>';
    } else {
      content = '<a href="' + href + '">' + (display || pageNum) + '</a>';
    }

    return '<' + el + (className ? ' class="' + className + '"' : '') + '>' + content + '</' + el + '>';
  }

  function generatePageNumbers (total, current, extraItems) {
    extraItems = extraItems || 2;

    var paged = {},
        pages = [];

    for (var i = 1; i <= Math.min(total, extraItems + 1); ++i)
      (paged[i] = 1) && pages.push(i);

    if (!paged[Math.max(1, current - extraItems - 1)])
      pages.push('...');

    for (var i = Math.max(1, current - extraItems); i <= Math.min(total, current + extraItems); ++i)
      !paged[i] && (paged[i] = 1) && pages.push(i);

    if (!paged[Math.max(1, total - extraItems - 1)])
      pages.push('...');

    for (var i = Math.max(1, total - extraItems); i <= total; ++i)
      !paged[i] && (paged[i] = 1) && pages.push(i);

    return pages;
  }

  res.locals.paginate = function (count, current, path, extraItems, el) {
    current = current || 1;
    path = url.parse(path || req.url);
    el = el || 'li';

    var pages = [],
        pageNums = generatePageNumbers(count, current, extraItems),
        pageNum;

    if (current === 1)
      pages.push(page({path:path, display:'&laquo;', className:'disabled', el:el}));
    else
      pages.push(page({path:path, pageNum:current - 1, display:'&laquo', el:el}));

    for (var i = 0, l = pageNums.length; i < l; ++i) {
      pageNum = pageNums[i];

      if (pageNum === current)
        pages.push(page({path:path, pageNum:pageNum, className:'active', el:el}));
      else if (!parseInt(pageNum,10))
        pages.push(page({path:path, display:pageNum, el:el}));
      else
        pages.push(page({path:path, pageNum:pageNum, el:el}));
    }

    if (current === pages)
      pages.push(page({path:path, display:'&raquo;', className:'disabled', el:el}));
    else
      pages.push(page({path:path, pageNum:current + 1, display:'&raquo;', el:el}));

    return pages.join('');
  }

  next();
}

function extractMessageData (req) {
  var messages = {};
  var fields = {};

  if (_.isFunction(req.flash)) {
    _.each(req.flash(), function(list, type) {
      messages[type] = _.map(list, function(msg) {
        if (msg instanceof Error)
          msg = msg.message;

        if (!_.isObject(msg))
          msg = {value: ''+msg};

        if (type === 'modal') {
          if (!_.isArray(msg.buttons) && !_.isObject(msg.buttons))
            msg.buttons = [];

          if (_.isArray(msg.buttons) && !msg.buttons.length)
            msg.buttons.push('Close');
        }

        if (_.isArray(msg.buttons)) {
          _.each(msg.buttons, function(button, key) {
            if (!_.isObject(button))
              button = {label: ''+button};
            msg.buttons[key] = button;
          });
        } else if (_.isObject(msg.buttons)) {
          msg.buttons = _.map(msg.buttons, function(value, key) {
            value = value || {};

            if (!_.isObject(value))
              value = {type: value};

            return _.defaults(value, {
              label: '' + key
            });
          });
        }

        if (!msg.fields && msg.field)
          msg.fields = [msg.field];

        if (_.isArray(msg.fields)) {
          _.each(msg.fields, function(field) {
            fields[field] = {state: type};
          });
        } else if (_.isObject(msg.fields)) {
          _.each(msg.fields, function(field, meta) {
            if (_.isString(meta))
              meta = {message: meta};

            fields[field] = _.defaults(meta || {}, {
              state: type
            });
          });
        }

        return msg;
      });
    });
  }

  return {
    messages: messages,
    fields: fields
  };
}

exports.addMessages = function addMessages (req, res, next) {
  var render = res.render.bind(res);

  res.render = function (view, options, callback) {
    // support callback function as second arg
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    if (!_.isObject(options))
      options = {};

    var messageData = extractMessageData(req);

    options._messages = messageData.messages;
    options._fields = messageData.fields;

    return render(view, options, callback);
  }

  next();
}