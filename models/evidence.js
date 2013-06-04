var db = require('../db');
var s3 = require('../s3');
var _ = require('underscore');

var MIME_MAP = {
  'image/*':
    thumbs.image,
  'audio/*':
    staticThumb('audio'),
  'video/*':
    thumbs.video,
  'text/*':
    staticThumb('text'),
  'application/pdf':
    staticThumb('pdf'),
  'application/postscript':
    staticThumb('postscript'),
  'application/msword':
    staticThumb('ms-text'),
  'application/mspowerpoint':
    staticThumb('ms-presentation'),
  'application/vnd.ms-word':
    staticThumb('ms-text'),
  'application/vnd.ms-powerpoint':
    staticThumb('ms-presentation'),
  'application/vnd.ms-excel':
    staticThumb('ms-spreadsheet'),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    staticThumb('ms-text'),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    staticThumb('ms-presentation'),
  'application/vnd.oasis.opendocument.text':
    staticThumb('od-text'),
  'application/vnd.oasis.opendocument.spreadsheet':
    staticThumb('od-spreadsheet'),
  'application/vnd.oasis.opendocument.presentation':
    staticThumb('od-presentation'),
  'application/vnd.oasis.opendocument.graphics':
    staticThumb('od-drawing')
};

var ALLOWED_TYPES = _.keys(MIME_MAP);

var MEDIA_TYPE_TEST = new RegExp(
  '^(' + ALLOWED_TYPES.join('|').replace(/\//g,'\\/').replace(/\*/g,'[^/]+') + ')$',
  'gi'
);

function staticThumb (name) {
  return '/media/thumbs/' + name + '.png';
}

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
      allowNull: false,
      validate: {
        isAllowedType: function (value) {
          if (!MEDIA_TYPE_TEST.test(value))
            throw new Error('Not a supported file type'))
        }
      }
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
  },
  classMethods: {
    getMimeTypes: function () {
      return ALLOWED_TYPES;
    }
  }
};