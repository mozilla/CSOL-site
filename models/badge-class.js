const db = require('../db');
const Organization = require('./organization');
const Category = require('./category');

const BadgeClass = db.define('BadgeClass', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: db.type.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: db.type.STRING,
    allowNull: false,
  },
  criteria: {
    type: db.type.TEXT,
    allowNull: false,
  },
  imageUrl: {
    type: db.type.TEXT,
    allowNull: false,
  },
});

BadgeClass.belongsTo(Organization);
BadgeClass.hasMany(Category);
BadgeClass.hasMany(Tag);

module.exports = BadgeClass;
