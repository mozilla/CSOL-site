const db = require('../db');

const Reviwer = require('./reviwer');
const BadgePledge = require('./badge-pledge');
const BadgeSubmission = db.define('BadgeSubmission', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  url: {
    type: db.type.STRING,
    allowNull: false,
    validate: { isUrl: true },
  },
});

BadgeSubmission.hasOne(Reviewer);
BadgeSubmission.belongsTo(BadgePledge);
