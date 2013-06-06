var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addColumn',
        args: ['Applications', 'latestReview', {
          type: DataTypes.TEXT,
          allowNull: true
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeColumn', args: ['Applications', 'latestReview']}
    ], callback);
  }
}