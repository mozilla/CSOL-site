const db = require('../db');
const BadgeClass = require('./badge-class');
const BadgeInstance = require('./badge-instance');

const BadgeClaim = db.define('BadgeClaim', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  claimCode: {
    type: db.type.STRING,
    allowNull: false,
    unique: true
  },
});

BadgeClaim.hasOne(BadgeClass);
BadgeClaim.hasOne(BadgeInstance);
