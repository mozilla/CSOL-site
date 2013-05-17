const Api = require('./api');
const errors = require('./lib/errors');
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_OPENBADGER_URL'];
if (!ENDPOINT)
  throw new Error('Must specify CSOL_OPENBADGER_URL in the environment');

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

function normalizeProgram(program, id) {
  if (!id)
    id = program.shortname;

  if (!program.id)
    program.id = id;

  if (!program.url)
    program.url = '/learn/' + program.id;

  return program;
}

var openbadger = new Api(ENDPOINT, {
  getBadges: {
    func: function getBadges (query, callback) {
      this.get('/badges', function(err, data) {
        if (err)
          return callback(err, data);

        var badges = _.map(data.badges, normalizeBadge);

        return callback(null, {
          badges: badges
        });
      });
    },
    paginate: true,
    key: 'badges'
  },

  getBadge: function getBadge (query, callback) {
    var id = query.id;

    if (!id)
      return callback(new errors.BadRequest('Invalid badge key'));

    this.get('/badge/' + id, function(err, data) {
      if (err)
        return callback(err, data);

      var badge = data.badge;

      normalizeBadge(badge, id);

      callback(null, {
        badge: badge
      });
    });
  },

  getPrograms: {
    func: function getPrograms (query, callback) {
      this.get('/programs', function(err, data) {
        if (err)
          return callback(err, data);

        var programs = _.map(data.programs, normalizeProgram);

        return callback(null, {
          programs: programs
        });
      });
    },
    paginate: true,
    key: 'programs'
  },

  getProgram: function getProgram (query, callback) {
    var id = query.id;

    if (!id)
      return callback(new errors.BadRequest('Invalid program key'));

    this.get('/program/' + id, function(err, data) {
      if (err)
        return callback(err, data);

      var program = data.program;

      normalizeProgram(program, id);

      callback(null, {
        program: program
      });
    });
  }
});

module.exports = openbadger;
