var db = require('../db');

var TOKEN_LIFETIME = 7; // number of days before token expires

module.exports = {
  properties: {
    token: {
      type: db.type.STRING,
      allowNull: false,
      unique: true
    },
    expired: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    userId: {
      type: db.type.INTEGER,
      allowNull: false
    },
    userType: {
      type: db.type.ENUM,
      values: ['learner', 'guardian'],
      allowNull: false,
      defaultValue: 'learner'
    }
  },
  instanceMethods: {
    getUser: function (callback) {
      var model = db.model(this.userType);
      model.find(this.userId).complete(callback);
    },
    isValid: function () {
      if (this.expired)
        return false;

      var expires = new Date(this.createdAt),
          now = new Date();

      expires.setUTCDate(expires.getUTCDate() + TOKEN_LIFETIME);

      if (expires < now) {
        this.updateAttributes({expired: true});
        return false;
      }

      return true;
    }
  }
}
