module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('Applications', 'latestReview', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },
  down: function(migration) {
    migration.removeColumn('Applications', 'latestReview');
  }
}