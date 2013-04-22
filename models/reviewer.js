const db = require('../db');

const Reviewer = db.define('Reviewer', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: db.type.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
});

module.exports = Reviewer;
