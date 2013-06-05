var db = require('../db');
var errors = require('../lib/errors');
var mime = require('mime');
var path = require('path');
var s3 = require('../s3');
var thumbs = require('../lib/thumbs');
var _ = require('underscore');

var MIME_MAP = {
  'image/*':
    'image',
  'video/*':
    'video',
  'audio/*':
    'audio',
  'text/plain':
    'text',
  'application/pdf':
    'pdf',
  'application/msword':
    'ms-document',
  'application/mspowerpoint':
    'ms-presentation',
  'application/vnd.ms-word':
    'ms-document',
  'application/vnd.ms-powerpoint':
    'ms-presentation',
  'application/vnd.ms-excel':
    'ms-spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'ms-document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'ms-presentation',
  'application/vnd.oasis.opendocument.text':
    'document',
  'application/vnd.oasis.opendocument.spreadsheet':
    'spreadsheet',
  'application/vnd.oasis.opendocument.presentation':
    'presentation',
  'application/vnd.oasis.opendocument.graphics':
    'drawing'
};

var ALLOWED_TYPES = _.keys(MIME_MAP);

var MEDIA_TYPE_TEST = new RegExp(
  '^\s*(' + reFormat(ALLOWED_TYPES.join('|')) + ')\s*$',
  'gi'
);

function reFormat (type) {
  return type
    .replace(/\//g, '\\/')
    .replace(/\*/g, '[^\\/]+')
    .replace(/\./g, '\\.');
}

function getStaticThumbPath (type) {
  return path.join(__dirname, '../thumbs/' + type + '.png');
}

function getSimpleType (mimeType) {
  return _.find(MIME_MAP, function (type, mime) {
    return (new RegExp('^' + reFormat(mime) + '$', 'ig'))
      .test(mimeType);
  })
}

function isValidType (type) {
  return MEDIA_TYPE_TEST.test(type);
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
          if (!isValidType(value))
            throw new Error('"' + value + '" is not a supported file type');
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
    getSimpleType: function () {
      return getSimpleType(this.mediaType);
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
    },
    isValidType: isValidType,
    process: function (file, remotePrefix, callback) {
      console.log(file);

      if (!file || !file.size)
        return callback();

      if (!isValidType(file.type)) {
        return callback(new errors.Unsupported(file.name + ' is not of a supported file type'));
      }

      if (_.isFunction(remotePrefix)) {
        callback = remotePrefix;
        remotePrefix = null;
      }

      remotePrefix = remotePrefix || 'uploads';

      function put (local, remote, type, callback) {
        var method = _.isString(local) ? 'putFile' : 'putBuffer';

        s3[method](local, remote, {
          'Content-Type': type
        }, callback);
      }

      function saveFile (path, callback) {
        put(file.path, path, file.type, callback);
      }

      function saveThumbnail (path, callback) {
        var type = getSimpleType(file.type);

        if (!thumbs[type]) {
          var thumbPath = getStaticThumbPath(type);
          var thumbType = mime.lookup(thumbPath);

          return put(thumbPath, path, thumbType, callback);
        }

        thumbs[type](file.path, null, 'png', 150, 150, function (err, data) {
          if (err)
            return callback(err);

          put(new Buffer(data, 'binary'), path, 'image/png', callback);
        });
      }

      var Model = this;
      var key = file.path.split('/').pop();
      var format = mime.extension(file.type) || path.extname(file.name).substr(1);
      var remoteFilePath = '/' + remotePrefix + '/' + key + '.' + format;
      var remoteThumbPath = '/' + remotePrefix + '/' + key + '_thumb.' + format;

      saveThumbnail(remoteThumbPath, function (err) {
        if (err)
          return callback(err);

        Model.create({
          key: key,
          mediaType: file.type,
          location: remoteFilePath,
          thumbnail: remoteThumbPath,
          original: file.name
        }).complete(function (err, instance) {
          if (err || !instance)
            return callback(err);

          saveFile(remoteFilePath, function (err) {
            if (err)
              return;

            instance.updateAttributes({
              saved: true
            });
          });

          callback(null, instance);
        });
      });
    }
  }
};