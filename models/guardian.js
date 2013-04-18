var db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: db.type.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: db.type.STRING,
      allowNull: false
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'hasMany',
      as: 'Dependents'
    }
  ]
};