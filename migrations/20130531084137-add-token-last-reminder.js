var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addColumn',
        args: ['signuptokens', 'lastReminder', {
          type: DataTypes.DATE,
          allowNull: true
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeColumn', args: ['signuptokens', 'lastReminder']}
    ], callback);
  }
}
