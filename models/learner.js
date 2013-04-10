const db = require('../db');
const Guardian = require('./guardian');

const Learner = db.define('Learner', {
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
    validate: { isEmail: true }
  },
  username: {
    type: db.type.STRING,
    allowNull: true,
    unique: true
  },
  password: {
    type: db.type.STRING,
    allowNull: true
  },
});

Learner.hasOne(Guardian);
module.exports = Learner;