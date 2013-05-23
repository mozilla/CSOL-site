const winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 
      level: ('DEBUG' in process.env) ? 'debug' : 'info' 
    }),
  ]
});

module.exports = logger;