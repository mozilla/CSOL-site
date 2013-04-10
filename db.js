const Sequelize = require('sequelize');

const DB_NAME = process.env['CSOL_DB_NAME'] || 'csol';
const USERNAME = process.env['CSOL_DB_USER'] || 'root';
const PASSWORD = process.env['CSOL_DB_PASS'];

const db = new Sequelize(DB_NAME, USERNAME, PASSWORD, {
  define: { charset: 'utf8' }
});

db.type = Sequelize;
module.exports = db;
