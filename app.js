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
app.use(express.static(path.join(__dirname, 'static')));

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