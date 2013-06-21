#!/usr/bin/env node

function verify_env (config) {
  for (var property in config) {
    if (config.hasOwnProperty(property) && !(property in process.env)) {
      process.env[property] = config[property];
    }
  }
  return process.env;
}

// This is somewhat ridiculous, but such is the unfortunate frailty
// of our DB setup
verify_env({
  NODE_ENV: 'development',
  CSOL_AWS_FAKE_S3_DIR: '/tmp',
  CSOL_HOST: 'http://example.org',
  CSOL_OPENBADGER_URL: 'http://example.org',
  CSOL_OPENBADGER_SECRET: 'secret',
  CSOL_AESTIMIA_URL: 'http://example.org',
  CSOL_AESTIMIA_SECRET: 'secret'
});

var async = require('async');
var path = require('path');
var db = require(path.join(__dirname, '..', 'db'));

db.model('Learner', true).findAll({where: "email LIKE '%@http://%'"})
  .error(function(err) {
    console.error(err);
    process.exit(1);
  })
  .success(function(learners) {
    if (!learners.length)
      return console.log('No bad email addresses found');

    async.each(learners, function(learner, done) {
      learner.email = learner.email.replace('@http://', '@');
      learner.save().complete(done);
    }, function (err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log('Updated ' + learners.length + ' learner email(s)');
    });
  });
