var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addColumn',
        args: ['Learners', 'birthday', {
          type: DataTypes.DATE,
          allowNull: false
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: removeColumn, args: ['Learners', 'birthday']}
    ], callback);
  }
}