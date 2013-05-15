const Api = require('./api');
const errors = require('./lib/errors');
const _ = require('underscore');

const ENDPOINT = process.env['CSOL_OPENBADGER_URL'];
if (!ENDPOINT)
  throw new Error('Must specify CSOL_OPENBADGER_URL in the environment');

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

        return callback(null, {
          badges: _.map(data.badges, normalizeBadge)
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

      return callback(null, {
        badge: normalizeBadge(data.badge, id)
      });
    });
  },

  getPrograms: {
    func: function getPrograms (query, callback) {
      this.get('/programs', function(err, data) {
        if (err)
          return callback(err, data);

        return callback(null, {
          programs: _.map(data.programs, normalizeProgram)
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

      return callback(null, {
        program: normalizeProgram(data.program, id)
      });
    });
  },

  getOrgs: function getOrgs (query, callback) {
    this.get('/v2/issuers/', function(err, data) {
      if (err)
        return callback(err, data);

      return callback(null, {
        orgs: _.values(data.issuers)
      });
    });
  }
});

module.exports = openbadger;
