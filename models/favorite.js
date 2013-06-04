const _ = require('underscore');
const db = require('../db');
const async = require('async');

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
		// favorites middleware takes the array of user's badges and decorates each
		// badge with a "favd" flag if the user had favorited it previously
		middleware: function (req, res, next) {
			var badges = req.remote.badges;
			var user = res.locals.user;
			var _this = this;

			async.each(badges, function(badge, cb) {
				_this.favoritedBadge(user, badge.id, function(err, favd) {
					if (err) cb(err);
					badge.favd = favd;
					cb(null);
				});
			}, function(err) {
				if (err) next(err);
				next();
			});
		}
	}
};
