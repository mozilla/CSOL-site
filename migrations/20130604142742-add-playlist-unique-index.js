var path = require('path');
var runMigrations = require(path.join(__dirname, '../db')).runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addIndex',
        args: ['Playlists', ['shortName', 'LearnerId'], {
          indexName: 'Playlists_unique_item_idx',
          indicesType: 'UNIQUE'
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeIndex', args: ['Playlists', ['shortName', 'LearnerId']]}
    ], callback);
  }
}
