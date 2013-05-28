var db = require('../db');
var s3 = require('../s3');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: db.type.STRING,
      allowNull: false,
      unique: true
    },
    mediaType: {
      type: db.type.STRING,
      allowNull: false
    },
    location: {
      type: db.type.STRING,
      allowNull: false
    },
    thumbnail: {
      type: db.type.STRING,
      allowNull: false
    },
    original: {
      type: db.type.STRING,
      allowNull: true
    },
    saved: {
      type: db.type.BOOLEAN,
      defaultValue: false
    }
  },
  relationships: [
    {
      model: 'Application',
      type: 'belongsTo'
    }
  ],
  instanceMethods: {
    fetch: function (callback) {
      // Returns an HTTP(S) request
      callback(s3.get(this.location));
    },
    fetchThumb: function (callback) {
      // Returns an HTTP(S) request
      callback(s3.get(this.thumbnail));
    },
    getLocationUrl: function () {
      return '/evidence/' + this.key;
    },
    getThumbnailUrl: function () {
      return '/evidence/' + this.key + '_thumb';
    }
  }
};