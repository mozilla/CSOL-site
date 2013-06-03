var db = require('../db');

module.exports = {
  properties: {
    id: {
      type: db.type.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
		type: {
			type: db.type.ENUM,
			values: [
				'badge',
				'org',
				'program'
			],
			allowNull: false
		},
		itemId: {
			type: db.type.STRING,
			allowNull: false
		}
	},
	relationships: [
		{
			model: 'Learner',
			type: 'belongsTo'
		}
	],
  classMethods: {
		// favoriteBadge adds a badge to the list of a user's favorites
		favoriteBadge: function (user, shortName, callback) {
			this.create({type: 'badge', itemId: shortName, LearnerId: user.id}).
				success(function(fav) {
					callback(null, fav);
				}).
				error(function(err) {
					callback(err);
				});
		}
	}
};
