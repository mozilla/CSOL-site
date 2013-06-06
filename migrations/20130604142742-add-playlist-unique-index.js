var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(migration, DataTypes, callback) {
    runMigrations([
      migration.addIndex('Playlists', ['shortName', 'LearnerId'], {
        indexName: 'Playlists_unique_item_idx',
        indicesType: 'UNIQUE'
      })
    ], callback);
  },
  down: function(migration, DataTypes, callback) {
    runMigrations([
      migration.removeIndex('Playlists', ['shortName', 'LearnerId'])
    ], callback);
  }
}
