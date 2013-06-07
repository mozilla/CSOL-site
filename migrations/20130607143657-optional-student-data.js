var path = require('path');
var runMigrations = require(path.join(__dirname, '../db')).runMigrations;

module.exports = {
  up: function(target, DataTypes, callback) {
    runMigrations(target, [
      {
        type: 'addColumn',
        args: ['Learners', 'school', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
      {
        type: 'addColumn',
        args: ['Learners', 'cpsStudentId', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
      {
        type: 'addColumn',
        args: ['Learners', 'gender', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
      {
        type: 'addColumn',
        args: ['Learners', 'raceEthnicity', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
      {
        type: 'addColumn',
        args: ['Learners', 'zipCode', {
          type: DataTypes.STRING,
          allowNull: true
        }]
      },
    ], callback);
  },
  down: function(target, DataTypes, callback) {
    runMigrations(target, [
      {type: 'removeColumn', args: ['Learners', 'school']},
      {type: 'removeColumn', args: ['Learners', 'cpsStudentId']},
      {type: 'removeColumn', args: ['Learners', 'gender']},
      {type: 'removeColumn', args: ['Learners', 'raceEthnicity']},
      {type: 'removeColumn', args: ['Learners', 'zipCode']},
    ], callback);
  }
}
