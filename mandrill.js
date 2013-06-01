const url = require('url');
const _ = require('underscore');
const logger = require('./logger');

const FAKE_EMAIL = ('DEBUG' in process.env) 
  && ('CSOL_DISABLE_EMAIL' in process.env);

var request = require('request');
if (FAKE_EMAIL) {
  request.post = function(opts, cb) {
    logger.log('debug', 'FAKE EMAIL: request.post with opts', opts); 
    cb('EMAIL DISABLED');
  };
}

const ENDPOINT = process.env['CSOL_MANDRILL_URL'] || 
  "https://mandrillapp.com/api/1.0/";
const KEY = process.env['CSOL_MANDRILL_KEY'];

const TEMPLATES = {
  '<13 learner signup': 'csol-13-signup',
  'learner signup': 'csol-signup',
  '10 day guardian reminder': 'csol-guardian-remind-10-day',
  '7 day guardian reminder': 'csol-guardian-remind-7-day',
  '3 day guardian reminder': 'csol-guardian-remind-3-day',
  '1 day guardian reminder': 'csol-guardian-remind-1-day'
}

module.exports = {

  /*  
    send(template, context, recipient, callback)
       
      template    - internal template name, mapped to mandrill names above, or 
                    mandrill template name
      context     - merge variables (optional)
                    { foo: 'hi' } replaces *|foo|* or *|FOO|* 
                    in the template with "hi"
      recipients  - a list of email addresses or recipient objects
                    to email, where a recipient object has
                    an email and a name
      callback    - callback function(err, result)

    TODO: test the above
  */
  send: function send(template, context, recipients, callback){
    if (!recipients || _.isFunction(recipients)) {
      callback = recipients;
      recipients = context;
      context = {};
    }
    callback = callback || function(){};

    if (!_.isArray(recipients))
      recipients = [recipients];

    recipients = _.map(recipients, function(recipient){
      if (_.isString(recipient)){
        return {
          email: recipient
        }
      return recipient;
      }
    });

    var merge_vars = _.map(context, function(value, key){ 
      return {
        name: key,
        content: value
      }
    });

    var payload = {
      key: KEY,
      template_name: TEMPLATES[template] || template,
      template_content: [],
      message: {
        to: recipients,
        global_merge_vars: merge_vars
      }
    };

    var opts = {
      url: url.resolve(ENDPOINT, 'messages/send-template.json'), 
      json: payload
    };

    request.post(opts, function(err, response, body) {
      logger.log('info', 'MANDRILL request: "POST %s" %s',
        opts.url, response ? response.statusCode : "Error", err); 

      if (err) 
        return callback(err);

      if (response.statusCode !== 200)
        return callback(body);

      var unsent = [];
      _.map(body, function(result) {
        var level = 'info';
        if (['sent', 'queued'].indexOf(result.status) === -1) {
          level = 'error';
          unsent.push(result);
        }
        logger.log(level, 'Learner signup email %s for %s', result.status, result.email);
      });
      if (unsent.length) 
        return callback({ 
          message: 'Some addresses not sent or queued',
          results: unsent
        });

      return callback(null, body);
    });
  }
};
