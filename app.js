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
const healthCheck = require('./controllers/health-check');

const port = parseInt(process.env.PORT || '3000');
const app = express();
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, 'views')), {autoescape: false});
env.express(app);
const healthChecker = healthCheck({
  auth: express.basicAuth('health_check', process.env.COOKIE_SECRET),
  checks: {
    s3: healthCheck.checker(require('./s3').healthCheck),
    database: healthCheck.checker(require('./db').healthCheck),
    openbadger: healthCheck.checker(require('./openbadger').healthCheck),
    aestimia: healthCheck.checker(require('./aestimia').healthCheck)
  }
});

app.use(express.cookieParser());
app.use(middleware.session());
app.use(middleware.csrf({
  whitelist: [
    '/applications',
    '/health_check'
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
app.use(helpers.addPaginateMethod);
app.use(helpers.addMessages);

require('./controllers/auth')(app);
require('./controllers/info')(app);
require('./controllers/backpack')(app);
require('./controllers/program')(app);
require('./controllers/learn')(app);
require('./controllers/challenges')(app);

app.get('/health_check', healthChecker);
require('./lib/errors')(app, env);

if (!module.parent)
  app.listen(port, function(err) {
    if (err) throw err;
    console.log("Listening on port " + port + ".");
    console.log("Performing health check.");

    healthChecker.runChecks(function(results) {
      if (results.status != "OK") {
        console.error("Health check failed:",
                      JSON.stringify(results, null, 2));
        console.error("Please resolve the problem and restart the server.");
        process.exit(1);
      }
      console.log("Health check indicates all systems are functional.");
    });
  });
else
  module.exports = http.createServer(app);
