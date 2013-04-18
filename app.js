const SESSION_SECRET = process.env.SESSION_SECRET || "=-pJ#7-/^@11J|rW*W{+AVU+pV]CO6lCT?3dq*+eEQ}/wDm+bFYgA&~8s]@V7>4<"

const path = require('path');
const http = require('http');
const express = require('express');
const app = express();
const nunjucks = require('nunjucks');

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, 'views')));
env.express(app);

app.use(express.cookieParser())
app.use(express.session({
  secret: SESSION_SECRET,
  cookie: {httpOnly: true},
}));
app.use(express.logger());
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.csrf());
app.use(express.static(path.join(__dirname, 'static')));

app.use(function(req, res, next) {
  res.locals.csrfToken = req.session._csrf;
  next();
});

app.use(function(req, res, next) {
  // This should be in Nunjucks, but right now it's not
  // https://github.com/jlongster/nunjucks/issues/72
  res.locals.range = function(start, stop, step) {
    if (!step) step = 1;
    if (!stop) {
      stop = start;
      start = 0;
    }

    // console.log(start, stop, step);

    var arr = [start];

    if (start > stop) {
      while (start - step > stop) {
        arr.push(start -= step);
      }
    } else {
      while (start + step < stop) {
        arr.push(start += step);
      }
    }

    // console.log(arr);
    return arr;
  }
  next();
})

require('./controllers/auth')(app);
require('./controllers/info')(app);
require('./controllers/backpack')(app);
require('./controllers/program')(app);

if (!module.parent)
  app.listen(3000);
else
  module.exports = http.createServer(app);