const Api = require('./api');
const errors = require('./lib/errors');
const _ = require('underscore');
const jwt = require('jwt-simple');

const ENDPOINT = process.env['CSOL_OPENBADGER_URL'];
const JWT_SECRET = process.env['CSOL_OPENBADGER_SECRET'];
const TOKEN_LIFETIME = process.env['CSOL_OPENBADGER_TOKEN_LIFETIME'] || 10000;

if (!ENDPOINT)
  throw new Error('Must specify CSOL_OPENBADGER_URL in the environment');
if (!JWT_SECRET)
  throw new Error('Must specify CSOL_OPENBADGER_SECRET in the environment');

function normalizeBadge (badge, id) {
  if (!id)
    id = badge.shortname;

  if (!badge.id)
    badge.id = id;

  if (!badge.url)
    badge.url = '/earn/' + badge.id;

  return badge;
}

function normalizeBadgeInstance (badge, id) {
  /*  This is dumb, but let's us reuse current templates to
      build out a single-level object. */
  _.extend(badge, badge.badgeClass);

  if (!badge.url)
    badge.url = '/mybadges/' + id;

  return badge;
}

function normalizeProgram(program, id) {
  if (!id)
    id = program.shortname;

  if (!program.id)
    program.id = id;

  if (!program.url)
    program.url = '/explore/' + program.id;

  return program;
}

function filterBadges(data, query) {
  // TO DO - We should probably be a little less naive about this, and make sure
  // that these values are from an allowed list

  var category = query.category,
      ageGroup = query.age,
      program = query.program;

  data = _.filter(data, function(item) {
    if (category && !_.contains(item.categories, category))
      return false;

    if (ageGroup && !_.contains(item.ageRange, ageGroup))
      return false;

    if (program && item.program !== program)
      return false;

    return true;
  });

  return data;
}

function getJWTToken(email) {
  var claims = {
    prn: email,
    exp: Date.now() + TOKEN_LIFETIME
  };
  return jwt.encode(claims, JWT_SECRET);
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
    filters: filterBadges,
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
    this.get('/issuers/', function(err, data) {
      if (err)
        return callback(err, data);

      return callback(null, {
        orgs: _.values(data.issuers)
      });
    });
  },

  getUserBadges: {
    func: function getUserBadges (query, callback) {
      var email = query.session.user.email;
      var params = {
        auth: getJWTToken(email),
        email: email
      };
      this.get('/user', { qs: params }, function(err, data) {
        if (err)
          return callback(err, data);


        console.log(data);
        badges = _.map(data.badges, normalizeBadgeInstance)

        return callback(null, {
          badges: badges.sort(function(a, b) {
            return b.issuedOn - a.issuedOn;
          })
        });
      });
    },
    paginate: true,
    key: 'badges'
  },

  getUserBadge: function getUserBadge (query, callback) {
    var id = query.id;

    var email = query.session.user.email;
    var params = {
      auth: getJWTToken(email),
      email: email
    };

    this.get('/user/badge/' + id, { qs: params }, function(err, data) {
      if (err)
        return callback(err, data);

      return callback(null, {
        badge: normalizeBadgeInstance(data.badge, id)
      });
    });
  },

  getBadgeFromCode: function getBadgeFromCode (query, callback) {
    var email = query.email;
    var code = query.code;
    var params = {
      auth: getJWTToken(email),
      email: email,
      code: code,
    };
    this.get('/unclaimed', { qs: params }, function(err, data) {
      return callback(err, data);
    });
  },

  claim: function claim (query, callback) {
    var email = query.email;
    var code = query.code;
    var params = {
      auth: getJWTToken(email),
      email: email,
      code: code,
    };
    this.post('/claim', { json: params }, function(err, data) {
      return callback(err, data);
    });
  },
});

module.exports = openbadger;
