var db = require('../db.js');

var Guardian = db.define('Guardian', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: db.type.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: db.type.STRING,
    allowNull: false
  }
});

module.exports = Guardian;
