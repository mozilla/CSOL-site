var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addColumn('Learners', 'birthday', {
        type: DataTypes.DATE,
        allowNull: false
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.removeColumn('Learners', 'birthday')
    ], callback);
  }
}