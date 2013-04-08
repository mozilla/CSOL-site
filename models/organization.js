const db = require('../db.js');

const Organization = db.define('Organization', {
  id: { type: db.type.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: db.type.STRING, allowNull: false, unique: true },
  description: { type: db.type.STRING, allowNull: false, unique: true },
  url: { type: db.type.STRING, allowNull: false, validate: { isUrl: true }},
  imageUrl: { type: db.type.TEXT, allowNull: false, validate: { isUrl: true }},
  address: { type: db.type.TEXT, allowNull: true },
  phone: { type: db.type.STRING, allowNull: true },
  email: { type: db.type.STRING, allowNull: true, validate: { isEmail: true }},
});

module.exports = Organization;