const _ = require('underscore');
const db = require('../db');
const async = require('async');
const logger = require('../logger');
const util = require('util');

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
		// `add` adds a badge to the user's playlist
		add: function (user, shortName, callback) {
			var _this = this;
			if (user) {
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
			}
		},
		// `remove` removes a badge from the user's playlist
		remove: function (user, shortName, callback) {
			if (user) {
				this.find({where: {LearnerId: user.id, shortName: shortName}}).
					success(function(item) {
	          if (item === null) {
	            // not treating this as an error condition as the result is what the user wanted to happen anyway:  The badge in question is no longer in their playlist.
	            logger.log('info', 'playlist.classMethods.remove was unable to find item with learnerid %s and shortname %s', user.id, shortName);
	            callback(null);
	          }
	          else {
	            item.destroy().success(function() {
	              callback(null);
	            }).error(function(err) {
	              callback(err);
	            });
	          }
					}).
					error(function(err) {
						callback(err);
					});
			}
		},
		// middleware gets the user's playlist of badges and makes it available via
		// `req.playlist`, which is a sorted array of badges.
		middleware: function (req, res, next) {
			//var badges = req.remote.badges;
			var user = res.locals.user;
			var userid = (user) ? user.id : 0;
			this.findAll({where: {LearnerId: userid}, order: 'rank DESC'}).
				success(function(rawList) {
					// Make a badge short name -> rank lookup.
					// This serves both as a way to filter down the full badge list into
					// the ones in the playlist, as well as to sort the results by rank.
					var shortNames = {}
					var playlist_ids = new Array(rawList.length);
					_.each(rawList, function(item, index) {
						shortNames[item.shortName] = index;
						playlist_ids.push(item.shortName);
					});
					req.playlist_shortnames = shortNames;
					req.playlist_ids = playlist_ids;

					next();
				}).
				error(function(err) {
					next(err);
				});
		}
	}
};
