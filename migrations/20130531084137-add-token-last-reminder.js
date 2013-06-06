var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addColumn('signuptokens', 'lastReminder', {
        type: DataTypes.DATE,
        allowNull: true
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.removeColumn('signuptokens', 'lastReminder')
    ], callback);
  }
}
