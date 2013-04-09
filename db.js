const Sequelize = require('sequelize');

const USERNAME = process.env['CSOL_DB_USER'] || 'root';
const PASSWORD = process.env['CSOL_DB_PASS'];
const DB       = process.env['CSOL_DB_NAME'] || 'csol';

const db = new Sequelize(DB, USERNAME, PASSWORD, {
  define: { charset: 'utf8' }
});

db.type = Sequelize;
module.exports = db;
