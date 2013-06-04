module.exports = {
  up: function(migration, DataTypes) {
    migration.changeColumn('Applications', 'state', {
      type: db.type.ENUM,
      values: [
        'open',
        'waiting',
        'denied',
        'submitted',
        'rejected',
        'accepted'
      ],
      defaultValue: 'open',
      allowNull: false
    });
  },
  down: function(migration) {
    migration.changeColumn('Applications', 'state', {
      type: db.type.ENUM,
      values: [
        'open',
        'waiting',
        'submitted',
        'rejected',
        'accepted'
      ],
      defaultValue: 'open',
      allowNull: false
    });
  }
}