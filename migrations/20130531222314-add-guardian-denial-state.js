var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.changeColumn('Applications', 'state', {
        type: DataTypes.ENUM,
        values: [
          'open',
          'waiting',
          'denied',
          'submitted',
          'rejected',
          'accepted'
        ],
        defaultValue: 'open',
        allowNull: false
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.changeColumn('Applications', 'state', {
        type: DataTypes.ENUM,
        values: [
          'open',
          'waiting',
          'submitted',
          'rejected',
          'accepted'
        ],
        defaultValue: 'open',
        allowNull: false
      })
    ], callback);
  }
}