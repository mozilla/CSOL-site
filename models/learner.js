var db = require('../db');
var applications;

module.exports = {
  setup: function () {
    applications = db.model('Application');
  },
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    underage: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    firstName: {
      type: db.type.STRING,
      allowNull: true
    },
    lastName: {
      type: db.type.STRING,
      allowNull: true
    },
    email: {
      type: db.type.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: db.type.STRING,
      allowNull: true,
      unique: true,
      validate: {
        is: ['[a-zA-Z0-9 ]']
      }
    },
    password: {
      type: db.type.STRING,
      allowNull: false
    },
    complete: {
      type: db.type.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  relationships: [
    {
      model: 'Guardian',
      type: 'belongsTo'
    },
    {
      model: 'Application',
      type: 'hasMany'
    }
  ],
  instanceMethods: {
    getBadgeApplicationState: function (badgeId, callback) {
      if (badgeId.id)
        badgeId = badgeId.id;

      applications.find({where: {LearnerId: this.id, badgeId: badgeId}})
        .complete(function (err, application) {
          if (err)
            return callback(err);

          if (!application)
            return callback(null);

          callback(null, application.state);
        });
    },
    getFullName: function () {
      return this.firstName + ' ' + this.lastName;
    }
  }
};
