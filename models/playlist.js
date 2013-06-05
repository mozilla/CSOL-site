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
			
			this.findAll({where: {LearnerId: user.id}, order: 'rank DESC'}).
				success(function(rawList) {
					// Make a badge short name -> rank lookup.
					// This serves both as a way to filter down the full badge list into
					// the ones in the playlist, as well as to sort the results by rank.
					var shortNames = {}
					_.each(rawList, function(item) {
						shortNames[item.shortName] = item.rank;
					});

					// Construct the user's playlist
					var playlist = new Array(rawList.length);
					_.each(badges, function(badge) {
						if (badge.id in shortNames) {
							var index = shortNames[badge.id]-1;
							playlist[index] = badge;
						}
					});
					playlist.reverse();

					req.playlist = playlist;

					next();
				}).
				error(function(err) {
					next(err);
				});
		}
	}
};
