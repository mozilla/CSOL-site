var db = require('../db');

module.exports = {
  properties: {
    token: {
      type: db.type.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: db.type.STRING,
      allowNull: false,
      unique: false,
      validate: {
        isEmail: true
      }
    },
    expired: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'hasOne'
    }
  ],
  instanceMethods: {
    isValid: function() {
      if (this.expired) return false;
      // Could potentially invalidate tokens that are too old at this point
      return true;
    }
  }
};