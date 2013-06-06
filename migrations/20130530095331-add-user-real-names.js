var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addColumn('Learners', 'firstName', {
        type: DataTypes.STRING,
        allowNull: true
      }),
      migration.addColumn('Learners', 'lastName', {
        type: DataTypes.STRING,
        allowNull: true
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.removeColumn('Learners', 'firstName'),
      migration.removeColumn('Learners', 'lastName')
    ], callback);
  }
}