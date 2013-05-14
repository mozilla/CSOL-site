const api = require('./api');
const apiMethod = api.apiMethod;
const paginate = api.paginate;
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_OPENBADGER_URL'];
var remote = api.remote(ENDPOINT);

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
    badge.url = '/earn/' + badge.id;

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

function normalizeProgram(program, id) {
  if (!id)
    id = program.shortname;

  if (!program.id)
    program.id = id;

  if (!program.url)
    program.url = '/learn/' + program.id;

  return program;
}

exports.getPrograms = apiMethod(paginate('programs', function getPrograms (query, callback) {
  remote.get('/v2/programs', function(err, data) {
    if (err)
      return callback(err, data);

    var programs = _.map(data.programs, normalizeProgram);

    return callback(null, {
      programs: programs
    });
  });
}));

exports.getProgram = apiMethod(function getProgram (query, callback) {
  var id = query.id;

  if (!id)
    return callback(400, 'Invalid program key');

  remote.get('/v2/program/' + id, function(err, data) {
    if (err)
      return callback(err, data);

    var program = data.program;

    normalizeProgram(program, id);

    callback(null, {
      program: program
    });
  });

});
