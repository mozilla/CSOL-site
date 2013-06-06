var runMigrations = require('../db').runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addIndex',
        args: ['Favorites', ['type', 'itemId', 'LearnerId'], {
          indexName: 'Favorites_unique_item_idx',
          indicesType: 'UNIQUE'
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeIndex', args: ['Favorites', ['type', 'itemId', 'LearnerId']]}
    ], callback);
  }
}
