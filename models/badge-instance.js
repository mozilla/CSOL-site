const db = require('../db');
const Learner = require('./learner');

const BadgeInstance = db.define('BadgeInstance', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  evidenceUrl: {
    type: db.type.STRING,
    allowNull: true,
    validate: { isUrl: true },
  },
  issuedOn: {
    type: db.type.DATE,
    defaultValue: db.type.NOW,
  },
});

BadgeInstance.belongsTo(Learner);
module.exports = Learner;