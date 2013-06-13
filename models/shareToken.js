var db = require('../db');
var crypto = require('crypto');
var url = require('url');

const CSOL_HOST = process.env.CSOL_HOST;

function md5(value) {
  return (
    crypto
      .createHash('md5')
      .update(value)
      .digest('hex')
  );
}

function urlgen(value) {
  const nonce = Math.random() * 0x10000000;
  return md5('' + value + Date.now() + nonce);
}

module.exports = {
  properties: {
    token: {
      type: db.type.STRING,
      allowNull: true,
      unique: true
    },
    email: {
      type: db.type.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    shortName: {
      type: db.type.STRING,
      allowNull: false
    },
    shared: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'hasMany'
    }
  ],
  instanceMethods: {
    getUrl: function () {
      return url.resolve(CSOL_HOST, 'share/' + this.token);
    },
    getToggleUrl: function () {
      return url.resolve(CSOL_HOST, 'share/toggle/' + this.token);
    },
    generateToken: function (callback) {
      this.updateAttributes({
        token: urlgen(this.email + this.shortName)
      }).complete(callback);
    },
    toggle: function (callback) {
      this.updateAttributes({
        shared: !this.shared
      }).complete(callback);
    }
  }
};
