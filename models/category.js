const db = require('../db');

const Category = db.define('Category', {
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

module.exports = Category;