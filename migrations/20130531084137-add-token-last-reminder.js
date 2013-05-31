module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('signuptokens', 'lastReminder', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },
  down: function(migration) {
    migration.removeColumn('signuptokens', 'lastReminder');
  }
}
