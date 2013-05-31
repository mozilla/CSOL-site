var db = require('../db');
var guardians = db.model('Guardian');

const EXPIRATION_TIME = 14 * 24 * 60 * 60 * 1000;

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
    },
    lastReminder: {
      type: db.type.DATE,
      allowNull: true
    }
  },
  relationships: [
    {
      model: 'Learner',
      type: 'hasOne'
    }
  ],
  instanceMethods: {
    // Test to see if token is still valid
    isValid: function () {
      if (this.expired) return false;
      // Could potentially invalidate tokens that are too old at this point
      return true;
    },

    timeToExpiration: function () {
      return ( EXPIRATION_TIME - (Date.now() - this.createdAt.getTime()) );
    },
    // Close out token, looking up guardian if none given
    finalize: function (guardian, callback) {
      var token = this;

      if (!callback && typeof guardian === 'function') {
        callback = guardian;
        guardian = null;
      }

      if (typeof(callback) !== 'function')
        callback = function() {};

      function finish (guardian) {
        token.getLearner()
          .complete(function(err, learner) {
            if (err || !learner)
              return callback(err || 'Learner not found', null);

            learner.setGuardian(guardian)
              .complete(function(err) {
                if (err)
                  return callback(err, null);

                // Set the token to be expired
                token.updateAttributes({expired: true})
                  .complete(function(err) {
                    if (err)
                      return callback(err, learner);

                    callback(null, learner);
                  });
              });
          });
      }

      if (guardian)
        return finish(guardian);

      // If we've not been given a guardian,
      // find an appropriate one and use that
      guardians.find({where: {email: token.email}})
        .complete(function(err, guardian) {
          if (err || !guardian)
            return callback(err || 'Guardian not found', null);

          finish(guardian);
        });
    }
  }
};