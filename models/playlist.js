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
		shortName: { // badge short name
			type: db.type.STRING,
			allowNull: false
		},
		rank: {
			type: db.type.INTEGER,
			defaultValue: 0
		}
	},
	relationships: [
		{
			model: 'Learner',
			type: 'belongsTo'
		}
	],
	classMethods: {
		// addToList adds a badge to the user's playlist
		addToList: function (user, shortName, callback) {
			var _this = this;
			this.max('rank', {where: {LearnerId: user.id}})
				.success(function(rank) {
					_this.create({shortName: shortName, LearnerId: user.id, rank: (rank || 0)+1}).
					success(function(item) {
						callback(null, item);
					}).
					error(function(err) {
						callback(err);
					});
				}).
				error(function(err) {
					callback(err);
				});
		},
		middleware: function (req, res, next) {
			var badges = req.remote.badges;
			var user = res.locals.user;
			var _this = this;
			
			this.findAll({where: {LearnerId: user.id}}).
				success(function(rawList) {
					// Make a badge short name lookup
					var shortNames = {}
					_.each(rawList, function(item) {
						shortNames[item.shortName] = true;
					});

					// Construct the user's playlist
					var playlist = _.filter(badges, function(badge) {
						console.log(badge.id);
						return shortNames[badge.id];
					});
					console.log("playlist", playlist);
					req.playlist = playlist;

					next();
				}).
				error(function(err) {
					next(err);
				});
		}
	}
};
