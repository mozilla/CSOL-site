const _ = require('underscore');
const db = require('../db');

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
		},
		// favoritedBadge returns a boolean of whether the user has previously
		// favorited a badge
		favoritedBadge: function (user, shortName, callback) {
			this.count({
				where: {LearnerId: user.id, type: 'badge', itemId: shortName}
			}).success(function(c) {
				callback(null, c > 0 ? true : false);
			}).error(function(err) {
				callback(err);
			});
		},
		// favorites middleware decorates an array of badges with the favorite
		// status of each badge as a flag on the badge object named "favorited"
		middleware: function (req, res, next) {
			var badges = req.remote.badges;
			var user = res.locals.user;
			var _this = this;
			_.each(badges, function(badge) {
				_this.favoritedBadge(user, badge.id, function(err, favd) {
					if (err) next(err);
					badge.favorited = favd;
				});
			});
			next();
		}
	}
};
