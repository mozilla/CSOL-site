var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addColumn('Applications', 'latestReview', {
        type: DataTypes.TEXT,
        allowNull: true
      })
    ], callback);
  },
  down: function(migration) {
    migration.removeColumn('Applications', 'latestReview');
  }
}