const _ = require('underscore');
const async = require('async');
const openbadger = require('../openbadger');
const db = require('../db');
const isLearner = require('../middleware').isLearner;
const isUnderageLearner = require('../middleware').isUnderageLearner;

const claim = db.model('Claim');
const favorite = db.model('Favorite');
const playlist = db.model('Playlist');
const shareToken = db.model('ShareToken');
const favoriteMiddleware = _.bind(favorite.middleware, favorite);
const playlistMiddleware = _.bind(playlist.middleware, playlist);
const applications = db.model('Application');

// groupByCategory groups an array of badges by their category(s).
// Note that badges can be in multiple categories. It is up to the caller to
// handle this appropriately.
function groupByCategory(badges, categories) {
  var group = _.object(_.map(categories, function(c) { return [c, []]; }));
  _.each(badges, function(badge) {
    _.each(badge.categories, function(c) {
      if (c in group) {
        group[c].push(badge);
      }
    });
  });
  return group;
}

// Fisher-Yates shuffle
// Adapted from http://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

function twitterShareUrl(opts) {
  var queries = [];
  for (prop in opts) {
    queries.push(prop + '=' + encodeURIComponent(opts[prop]));
  }
  return '//twitter.com/share?' + queries.join('&');
}

function facebookShareUrl(url) {
  return '//facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
}

module.exports = function (app) {

  app.get('/claim', [
    isLearner
  ], function (req, res, next) {
    var claimCode = req.query.code;
    var user = res.locals.user;

    if (!claimCode)
      return res.render('claim.html');
    claimCode = claimCode.trim();

    openbadger.getBadgeFromCode({
      code: claimCode,
      email: user.email
    }, function(err, data) {
      if (err) {
        if (err.meta.code === 404)
          req.flash('error', "That claim code appears to be invalid.");
        else if (err.meta.code === 409)
          req.flash('warn', "You have already used that claim code.");
        else
          req.flash('error', "A problem was encountered.");
        return res.render('claim.html', {
          code: claimCode
        });
      }

      openbadger.getUserBadge({
        email: user.email,
        id: data.badge.shortname
      }, function (err, badge) {
        if (!badge)
          return res.render('claim.html', {
            code: claimCode,
            badge: data.badge
          });

        req.flash('error', 'You already have this badge');
        return res.render('claim.html', {
          badge: data.badge
        });
      });
    });

  });

  app.post('/claim', [
    isLearner
  ], function (req, res, next) {
    var claimCode = req.query.code;
    var user = res.locals.user;

    claim.findOrCreate({
      code: claimCode,
      LearnerId: user.id
    }).complete(function(err, claim) {
      if (err)
        return next(err);

      claim.submit(function(err, claim){
        if (err) {
          if (err.meta.code === 409)
            req.flash('warn', "You already have that badge.");
          else
            req.flash('error', "There has been an error claiming your badge.");
        }
        else {
          if (claim.state === 'waiting')
            req.flash('info', "Your badge claim is awaiting approval from your parent or guardian.");
          else
            req.flash('success', "You've claimed a new badge!");
        }
        return res.redirect('/mybadges');
      });
    });
  });

  app.get('/mybadges', [
    isUnderageLearner,
    openbadger.middleware('getUserBadges'),
    favoriteMiddleware
  ], function (req, res, next) {
    var data = req.remote;
    var user = req.session.user;

    res.render('user/backpack.html', {
      items: data.badges,
      template: 'includes/badge-instance-thumbnail.html'
    });
  });

  app.get('/mybadges/:id', [
    isUnderageLearner,
    openbadger.middleware('getUserBadge'),
    openbadger.middleware('getBadgeRecommendations', {limit:4})
  ], function (req, res, next) {
    var user = req.session.user;
    var data = req.remote;

    return res.render('user/badge.html', {
      badge: data.badge,
      user: req.session.user,
      similar: data.badges,
      share: false
    });
  });

  app.get('/mybadges', [
    isLearner,
    openbadger.middleware('getUserBadges'),
    favoriteMiddleware
  ], function (req, res, next) {
    var data = req.remote;
    var user = req.session.user;

    async.each(data.badges,
      function prepForSharing(badge, callback){
        shareToken.findOrCreate({
          shortName: badge.id,
          email: user.email
        }).complete(function(err, shareToken){
          if (shareToken) {
            badge.share = shareToken.values;
            badge.share.url = shareToken.getUrl();
            badge.share.toggleUrl = shareToken.getToggleUrl();
            badge.share.twitterUrl = twitterShareUrl({
              url: shareToken.getUrl(),
              text: 'Check out my newest badge from the Chicago Summer of Learning!',
              hashtags: 'CSOL2013',
              dnt: 1
            });
            badge.share.facebookUrl = facebookShareUrl(shareToken.getUrl());
          }
          callback(err);
        });
      },
      function done(err) {
        if (err)
          return next(err);

        res.render('user/backpack.html', {
          items: data.badges,
          template: 'includes/badge-instance-thumbnail.html'
        });
      }
    );
  });

  app.get('/mybadges/:id', [
    isLearner,
    openbadger.middleware('getUserBadge'),
    openbadger.middleware('getBadgeRecommendations', {limit:4})
  ], function (req, res, next) {
    var user = req.session.user;
    var data = req.remote;

    async.waterfall([
      function getToken (callback) {
        shareToken.findOrCreate({
          shortName: data.badge.shortname,
          email: user.email
        }).complete(callback);
      },
      function ensureTokenValue (token, callback) {
        if (!token.token)
          return token.generateToken(callback);
        return callback(null, token);
      }
    ], function renderPage (err, shareToken) {
      var share = false;
      if (shareToken) {
        share = shareToken.values;
        share.url = shareToken.getUrl();
        share.toggleUrl = shareToken.getToggleUrl();
      }

      return res.render('user/badge.html', {
        badge: data.badge,
        user: req.session.user,
        similar: data.badges,
        share: share
      });
    });
  });

  app.get('/share/:token', function (req, res, next) {
    var token = req.params.token;

    shareToken.find({
      where: {
        token: token
      }
    }).complete(function (err, token) {
      if (err)
        return next(err);

      if (token === null || !token.shared)
        return next('Invalid share token');

      openbadger.getUserBadge({
        id: token.shortName,
        email: token.email
      }, function (err, data) {
        if (err)
          return next(err);

        return res.render('user/badge-share.html', {
          badge: data.badge,
          user: {
            email: token.email
          },
          fullUrl: req.protocol + '://' + req.headers.host + req.originalUrl
        });
      });
    });
  });

  app.post('/share/toggle/:token', [
    isLearner
  ], function (req, res, next) {
    var token = req.params.token;
    var user = req.session.user;

    shareToken.find({
      where: {
        token: token
      }
    }).complete(function (err, token) {
      if (err)
        return next(err);

      if (token === null)
        return next('Could not find token ' + token);

      if (token.email !== user.email)
        return next('User does not own token');

      token.toggle(function (err) {
        if (err)
          return next(err);

        if (req.xhr) {
          return res.send(200);
        }
        return res.redirect('/mybadges/' + token.shortName);
      });
    });

  });

  app.post('/mybadges/:id/favorite', [
    isLearner,
    openbadger.middleware('getBadge')
  ], function (req, res, next) {
    var data = req.remote;
    var badge = data.badge;
    var user = res.locals.user;
    var shortname = req.params.id; // assume if we got here id is valid input

    favorite.favoriteBadge(user, shortname, function(err, fav) {
        if (err) {
            return next(err);
        }
        res.render('user/badge-favorited.html', {
            badge: badge
        });
    });
  });

  app.get('/myplaylist', [
    isLearner,
    openbadger.middleware('getAllBadges'),
    openbadger.middleware('getUserRecommendations'),
    playlistMiddleware
  ], function (req, res, next) {

    // Group recommendations into STEAM categories.
    // We also limit to `maxPerCat` badges per category.
    var maxPerCat = 4;
    var categories = openbadger.getFilters().categories.options;
    var grouped = groupByCategory(req.remote.recommendations, _.pluck(categories, 'value'));
    var recommended = _.object(_.map(categories, function(c) {
      return [c.value, {label: c.label, badges: shuffle(grouped[c.value]).slice(0, maxPerCat)}];
    }));

    // Construct the user's playlist
		// Expects that `req.remote.badges` exists and that it is the *full* list
		// of all badges -- this list is then filtered down by what's in the
		// playlist table to produce the user's playlist (nb: once/if the openbadger
		// API supports taking a list of badge shortnames to return badge details
		// about, retrieving the full list from the API is no longer necessary).
    var playlist = new Array(req.paylist_ids);
    _.each(req.remote.badges, function(badge) {
      if (badge.id in req.playlist_shortnames) {
        var index = req.playlist_shortnames[badge.id];
        playlist[index] = badge;
      }
    });

    res.render('user/myplaylist.html', {
      user: res.locals.user,
      recommended: recommended,
      playlist: req.playlist,
      paylist_ids: req.paylist_ids
    });
  });

  // This view supports both adding a badge to the playlist and removing a badge
  // from the playlist. It dispatches on which action by the HTTP method, which is
  // multiplexed onto POST -- the `_method` param, if present, overrides the
  // HTTP method. (This enables DELETEs from regular browser form submissions.)
  app.post('/myplaylist', [
    isLearner
  ], function (req, res, next) {
    var method = req.body._method ? req.body._method : "POST";

    var actions = {
      POST: _.bind(playlist.add, playlist),
      DELETE: _.bind(playlist.remove, playlist)
    };

    var user = res.locals.user;
    var shortname = req.body.shortname;

    actions[method](user, shortname, function(err) {
      if (err) return next(err);
      res.redirect('/myplaylist');
    });
  });

  app.get('/myapplications', [
    isLearner
  ], function (req, res, next) {
    var user = req.session.user;
    applications.findAll({where: ['LearnerId = ? AND State != ?', user.id, 'accepted']}).success(function (applications) {
      openbadger.getBadges(function (err, data) {
        _.each(applications, function(app) {
          _.extend(app, _.findWhere(data.badges, {id: app.badgeId}));
            app.url = '/earn/' + app.id + '/apply';
        });
        res.render('user/applications.html', {
          items: applications
        });
      });
    });
  });

  app.get('/favorites/:view?', function (req, res, next) {
    var badge = {
      thumbnail: '/media/img/badge.png',
      description: 'Badge blah in voluptate velit...',
      url: '/badges/ae784f'
    };

    var org = {
      thumbnail: '/media/img/org.png',
      description: 'Organization blah irure...',
      url: '/orgs/some-organization'
    };

    var program = {
      thumbnail: '/media/img/program.png',
      description: 'Program blah sed eiusmod...',
      url: '/programs/ae784f'
    };

    var view = req.params.view,
        favorites = [badge, org, badge, program];

    switch (view) {
      case 'badges':
        favorites = [badge, badge]; break;
      case 'programs':
        favorites = [program];
      case 'orgs':
        favorites = [org]; break;
      default:
        view = null;
    }

    res.render('user/bookmarks.html', {
      items: favorites,
      view: view
    })
  })

};
