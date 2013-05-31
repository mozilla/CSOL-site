const openbadger = require('../openbadger');
const db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: db.type.STRING,
      allowNull: false
    },
    state: {
      type: db.type.ENUM,
      values: [
        'waiting',    // The claimed badge is waiting for guardian approval (where applicable)
        'approved',   // The claimed badge has been approved by guardian for issuing
        'denied'      // The claimed badge has been denied by guardian
      ],
      defaultValue: 'waiting',
      allowNull: false
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'belongsTo'
    }
  ],
  instanceMethods: {
    submit: function (force, callback) {
      if (typeof force === 'function') {
        callback = force;
        force = false;
      }

      var claim = this;

      claim.getLearner().complete(function (err, learner) {
        if (err || !learner)
          return callback(err);

        if (learner.underage && !force) {
          return claim.updateAttributes({
            state: 'waiting'
          }).complete(callback);
        }

        openbadger.claim({
          code: claim.code,
          email: learner.email
        }, function (err, data) {
          if (err)
            return callback(err);
          claim.updateAttributes({
            state: 'approved'
          }).complete(callback);
        });

      });
    },
    approve: function (callback) {
      this.submit(true, callback);
    },
    deny: function (callback) {
      claim.updateAttributes({
        state: 'denied'
      }).complete(callback);
    }
  }
};
