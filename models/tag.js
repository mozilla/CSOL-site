const db = require('../db');

const Tag = db.define('Tag', {
  id: {
    type: db.type.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: db.type.STRING,
    allowNull: false,
    unique: true
  },
});

module.exports = Tag;