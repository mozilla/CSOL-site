var db = require('../db.js'),
    Learner = require('./learner');

var SignupToken = db.define('SignupToken', {
  token: {
    type: db.type.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: db.type.STRING,
    allowNull: false,
    unique: false,
    validate: {
      isEmail: true
    }
  },
  expired: {
    type: db.type.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

SignupToken.hasOne(Learner);

SignupToken.sync();

module.exports = SignupToken;
