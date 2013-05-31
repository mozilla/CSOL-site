module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('Learners', 'firstName', {
      type: DataTypes.STRING,
      allowNull: true
    });
    migration.addColumn('Learners', 'lastName', {
      type: DataTypes.STRING,
      allowNull: true
    });
  },
  down: function(migration) {
    migration.removeColumn('Learners', 'firstName');
    migration.removeColumn('Learners', 'lastName');
  }
}