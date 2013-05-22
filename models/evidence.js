var db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mediaType: {
      type: db.type.ENUM,
      values: ['image', 'video', 'link'],
      allowNull: false
    },
    location: {
      type: db.type.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    }
  },
  relationships: [
    {
      model: 'Application',
      type: 'belongsTo'
    }
  ],
};