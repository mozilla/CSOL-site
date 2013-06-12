var path = require('path');
var runMigrations = require(path.join(__dirname, '../db')).runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'changeColumn',
        args: ['Applications', 'description', {
          type: DataTypes.TEXT,
          allowNull: true
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'changeColumn',
        args: ['Applications', 'state', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      }
    ], callback);
  }
}