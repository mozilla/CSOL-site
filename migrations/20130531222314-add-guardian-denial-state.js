var path = require('path');
var runMigrations = require(path.join(__dirname, '../db')).runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'changeColumn',
        args: ['Applications', 'state', {
          type: DataTypes.ENUM,
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
        }]
      }
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'changeColumn',
        args: ['Applications', 'state', {
          type: DataTypes.ENUM,
          values: [
            'open',
            'waiting',
            'submitted',
            'rejected',
            'accepted'
          ],
          defaultValue: 'open',
          allowNull: false
        }]
      }
    ], callback);
  }
}