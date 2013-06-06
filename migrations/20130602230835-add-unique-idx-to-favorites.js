var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addIndex('Favorites', ['type', 'itemId', 'LearnerId'], {
        indexName: 'Favorites_unique_item_idx',
        indicesType: 'UNIQUE'
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.removeIndex('Favorites', ['type', 'itemId', 'LearnerId'])
    ], callback);
  }
}
