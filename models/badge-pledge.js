const db = require('../db');
const BadgeClass = require('./badge-class');
const Learner = require('./learner');

const BadgePledge = db.define('BadgePledge', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  note: {
    type: db.type.TEXT,
    allowNull: true,
  },
});

BadgePledge.hasOne(BadgeClass);
BadgePledge.belongsTo(Learner);
