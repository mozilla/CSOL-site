var db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    badgeId: {
      type: db.type.STRING,
      allowNull: false
    },
    state: {
      type: db.type.ENUM,
      values: [
        'open',       // This application is being worked on 
        'waiting',    // This application is waiting for guardian approval (where applicable)
        'submitted',  // This application has been submitted for review
        'rejected',   // This application has been rejected
        'accepted'    // This application has been accepted
      ],
      defaultValue: 'open',
      allowNull: false
    },
    submissionId: {
      type: db.type.STRING,
      allowNull: true
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'belongsTo'
    },
    {
      model: 'Evidence',
      type: 'hasMany',
      as: 'Evidence'
    }
  ],
};