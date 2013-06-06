module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('Learners', 'birthday', {
      type: db.type.DATE,
      allowNull: false
    });
  },
  down: function(migration) {
    migration.removeColumn('Applications', 'birthday');
  }
}