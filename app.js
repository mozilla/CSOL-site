const path = require('path');
const http = require('http');
const express = require('express');
const app = express();

app.use(express.logger());
app.use(express.compress());
app.use(express.bodyParser());
app.use(express.static(path.join(__dirname, 'static')));

require('./controllers/auth')(app);
require('./controllers/info')(app);
require('./controllers/backpack')(app);
require('./controllers/make')(app);

if (!module.parent)
  app.listen(3000);
else
  module.exports = http.createServer(app);