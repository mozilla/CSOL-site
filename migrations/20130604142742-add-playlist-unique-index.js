module.exports = {
  up: function(migration, DataTypes) {
		migration.addIndex(
			'Playlists',
			['shortName', 'LearnerId'],
			{
				indexName: 'Playlists_unique_item_idx',
				indicesType: 'UNIQUE'
			}
		);
  },
  down: function(migration) {
		migration.removeIndex(
			'Playlists',
			['shortName', 'LearnerId']
		);
  }
}
