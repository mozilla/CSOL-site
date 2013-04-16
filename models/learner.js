var db = require('../db.js'),
    Guardian = require('./guardian');

var Learner = db.define('Learner', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  underage: {
    type: db.type.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  email: {
    type: db.type.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: db.type.STRING,
    allowNull: true,
    unique: true,
    validate: {
      is: ['[a-zA-Z0-9 ]']
    }
  },
  password: {
    type: db.type.STRING,
    allowNull: false
  }
});

Learner.hasOne(Guardian);

module.exports = Learner;
