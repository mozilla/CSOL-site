const path = require('path');
const http = require('http');
const express = require('express');
const nunjucks = require('nunjucks');
const middleware = require('./middleware');
const helpers = require('./helpers');

const app = express();
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, 'views')), {autoescape: true});
env.express(app);

app.use(express.cookieParser());
app.use(middleware.session());
app.use(express.logger());
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.csrf());
app.use(express.static(path.join(__dirname, 'static')));

app.use(helpers.addCsrfToken);
app.use(helpers.addRangeMethod);

require('./controllers/auth')(app);
require('./controllers/info')(app);
require('./controllers/backpack')(app);
require('./controllers/program')(app);
require('./controllers/learn')(app);
require('./controllers/challenges')(app);

if (!module.parent)
  app.listen(3000);
else
  module.exports = http.createServer(app);