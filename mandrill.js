const url = require('url');
const _ = require('underscore');
const logger = require('./logger');

const FAKE_EMAIL = ('DEBUG' in process.env) 
  && ('CSOL_DISABLE_EMAIL' in process.env);

var request = require('request');
if (FAKE_EMAIL) {
  request = function(opts, cb) {
    logger.log('debug', 'FAKE EMAIL: request.post with opts', opts); 
    cb('EMAIL DISABLED');
  };
}

const ENDPOINT = process.env['CSOL_MANDRILL_URL'] || 
  "https://mandrillapp.com/api/1.0/";
const KEY = process.env['CSOL_MANDRILL_KEY'];

const TEMPLATES = {
  test: 'test'
}

module.exports = {

  /*  
    send(template, context, recipient, callback)
       
      template    - internal template name, mapped to mandrill names above
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
      template_name: template,
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

      return callback(null, body);
    });
  }
};
