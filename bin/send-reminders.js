#!/usr/bin/env node

var db = require('../db');
var email = require('../mandrill');
var logger = require('../logger');

var signupTokens = db.model('SignupToken');

const REMINDER_EMAILS = [ {
    timeRemaining: 10 * 24 * 60 * 60 * 1000,
    template: '10 day guardian reminder'
  }, {
    timeRemaining: 7 * 24 * 60 * 60 * 1000,
    template: '7 day guardian reminder'
  }, {
    timeRemaining: 3 * 24 * 60 * 60 * 1000,
    template: '3 day guardian reminder'
  }, {
    timeRemaining: 1 * 24 * 60 * 60 * 1000,
    template: '1 day guardian reminder'
  }
];

signupTokens.findAll({ where: { expired: 0 } }).success(function(activeTokens) {
  activeTokens.forEach(function(activeToken) {
    var bestMatch = null;
    var timeToExpiration = activeToken.timeToExpiration();

    if (timeToExpiration < 0) {
      activeToken.updateAttributes({
        expired: 1
      });
    }
    else {
      var expireTime = Date.now() + timeToExpiration;
      var timeRemainingAtLastReminder;
      if (activeToken.lastReminder) {
        timeRemainingAtLastReminder = expireTime - activeToken.lastReminder.getTime();
      }
      else {
        timeRemainingAtLastReminder = expireTime - activeToken.createdAt.getTime();
      }

      REMINDER_EMAILS.forEach(function(reminder) {
        if ((reminder.timeRemaining > timeToExpiration) &&
            (reminder.timeRemaining < timeRemainingAtLastReminder ) &&
            (!bestMatch || reminder.timeRemaining < bestMatch.timeRemaining)) {
          bestMatch = reminder;
        }
      });

      if (bestMatch) {
        var confirmationUrl = 'http://' + process.env.CSOL_HOST + '/signup/' + activeToken.token;

        activeToken.getLearner().success(function(learner) {
          email.send(bestMatch.template, {
            earnername: learner.username,
            confirmationUrl: confirmationUrl
          }, activeToken.email);

          activeToken.updateAttributes({
            lastReminder: new Date()
          });
        });
      }
    }
  });
});
