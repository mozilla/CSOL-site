module.exports = {
  up: function(migration, DataTypes) {
		migration.addIndex(
			'Favorites',
			['type', 'itemId', 'LearnerId'],
			{
				indexName: 'Favorites_unique_item_idx',
				indicesType: 'UNIQUE'
			}
		);
  },
  down: function(migration) {
		migration.removeIndex(
			'Favorites',
			['type', 'itemId', 'LearnerId']
		);
  }
}
