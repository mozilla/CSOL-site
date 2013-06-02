if ( process.env.NEW_RELIC_HOME ) {
  require( 'newrelic' );
}
const path = require('path');
const http = require('http');
const express = require('express');
const nunjucks = require('nunjucks');
const middleware = require('./middleware');
const helpers = require('./helpers');
const flash = require('connect-flash');
const logger = require('./logger');

const app = express();
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, 'views')), {autoescape: false});
env.express(app);

app.use(express.cookieParser());
app.use(middleware.session());
app.use(middleware.csrf({
  whitelist: [
    '/applications'
  ]
}));
app.use(express.logger({stream:{
  write: function(msg, encoding) {
    logger.info(msg.trim());
  }
}}));
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.static(path.join(__dirname, 'static')));
app.use(flash());

app.use(helpers.addCsrfToken);
app.use(helpers.addRangeMethod);
app.use(helpers.addMessages);

require('./controllers/auth')(app);
require('./controllers/info')(app);
require('./controllers/backpack')(app);
require('./controllers/program')(app);
require('./controllers/learn')(app);
require('./controllers/challenges')(app);

require('./lib/errors')(app, env);

if (!module.parent)
  app.listen(3000);
else
  module.exports = http.createServer(app);
