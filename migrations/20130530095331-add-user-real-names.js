var path = require('path');
var runMigrations = require(path.join(__dirname, '../db')).runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addColumn',
        args: ['Learners', 'firstName', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
      {
        type: 'addColumn',
        args: ['Learners', 'lastName', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeColumn', args: ['Learners', 'firstName']},
      {type: 'removeColumn', args: ['Learners', 'lastName']}
    ], callback);
  }
}