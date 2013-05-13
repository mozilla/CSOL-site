const api = require('./api');
const apiMethod = api.apiMethod;
const paginate = api.paginate;
const _ = require('underscore');

var remote = api.remote('http://openbadger-csol.mofostaging.net');

/* For swapping in a test object */
exports.setRemote = function setRemote(newRemote) {
  var oldRemote = remote;
  remote = newRemote;  
  return oldRemote;
};

// Make sure badges returned from remote API
// contain all the information we need
function normalizeBadge (badge, id) {
  if (!id)
    id = badge.shortname;

  if (!badge.id)
    badge.id = id;

  if (!badge.url)
    badge.url = '/badges/' + badge.id;

  return badge;
}

exports.getBadges = apiMethod(paginate('badges', function getBadges (query, callback) {
  remote.get('/v2/badges', function(err, data) {
    if (err)
      return callback(err, data);

    var badges = _.map(data.badges, normalizeBadge);

    return callback(null, {
      badges: badges
    });
  });
}));

exports.getBadge = apiMethod(function getBadge (query, callback) {
  var id = query.id;

  if (!id)
    return callback(400, 'Invalid badge key');

  remote.get('/v2/badge/' + id, function(err, data) {
    if (err)
      return callback(err, data);

    var badge = data.badge;

    normalizeBadge(badge, id);

    callback(null, {
      badge: badge
    });
  });
});
