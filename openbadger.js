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

var categories = [
  {label: 'Science', value: 'science'},
  {label: 'Technology', value: 'technology'},
  {label: 'Engineering', value: 'engineering'},
  {label: 'Art', value: 'art'},
  {label: 'Math', value: 'math'}
];
var ageRanges = [
  {label: 'Under 13', value: '0-13'},
  {label: '13-18', value: '13-18'},
  {label: '19-24', value: '19-24'}
];
var activityTypes = [
  {label: 'Online', value: 'online'},
  {label: 'Offline', value: 'offline'}
];
var badgeTypes = [
  {label: 'Participation', value: 'participation'},
  {label: 'Skill', value: 'skill'},
  {label: 'Activity', value: 'activity'}
];
var orgs = [];

function updateOrgs (callback) {
  if (typeof callback !== 'function')
    callback = function () {};

  openbadger.getOrgs(function (err, data) {
    if (err)
      return callback(err);

    orgs = [];

    (data.orgs || data.issuers).forEach(function (org) {
      orgs.push({
        label: org.name,
        value: org.shortname
      });
    });

    orgs.sort(function(a, b) {
      var aVal = (a && a.label || '').toLowerCase().replace(/^\s*the\s+/, ''),
          bVal = (b && b.label || '').toLowerCase().replace(/^\s*the\s+/, '');

      return aVal.localeCompare(bVal);
    });

    callback(null, orgs);
  });
}

function confirmFilterValue (value, list) {
  if (!value && value !== 0)
    return null;

  for (var i = 0, l = list.length; i < l; ++i)
    if (list[i].value === value)
      return value;

  return null;
}

function applyFilter (data, query) {
  return _.filter(data, function(item) {
    return _.reduce(query, function(memo, value, field) {
      if (!memo) // We've already failed a test - no point in continuing
        return memo;

      if (!value && value !== 0)
        return memo;

      var data = item;

      if (field.indexOf('.') > -1) {
        var fieldParts = field.split('.').reverse();

        while (data && fieldParts.length > 1) {
          data = data[fieldParts.pop()];
        }

        field = fieldParts.reverse().join('.');
      }

      var itemValue = data ? data[field] : null;

      if (_.isArray(itemValue))
        return memo && _.contains(itemValue, value);

      return memo && (itemValue === value);
    }, true);
  })
}

function filterBadges (data, query) {
  var category = confirmFilterValue(query.category, categories),
      ageGroup = confirmFilterValue(query.age, ageRanges),
      badgeType = confirmFilterValue(query.type, badgeTypes),
      activityType = confirmFilterValue(query.activity, activityTypes);

  if (!category && !ageGroup && !badgeType && !activityType)
    return data;

  return applyFilter(data, {
    'categories': category,
    'ageRange': ageGroup,
    'badgeType': badgeType,
    'activityType': activityType
  });

  return data;
}

function filterPrograms (data, query) {
  var category = confirmFilterValue(query.category, categories),
      org = confirmFilterValue(query.org, orgs),
      ageGroup = confirmFilterValue(query.age, ageRanges),
      activityType = confirmFilterValue(query.activity, activityTypes);

  if (!category && !org && !ageGroup && !activityType)
    return data;

  return applyFilter(data, {
    'categories': category,
    'issuer.shortname': org,
    'ageRange': ageGroup,
    'activityType': activityType
  });
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
    filters: filterPrograms,
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

  getBadgeRecommendations: function getBadgeRecommendations (query, callback) {
    var id = query.badgeName;

    if (!id)
      return callback(new errors.BadRequest('Invalid badge key'));

    this.get('/badge/' + id + '/recommendations', function(err, data) {
      if (err)
        return callback(err, data);

      return callback(null, {
        badges: _.map(data.badges, normalizeBadge)
      });
    });
  },
});

updateOrgs();

module.exports = openbadger;
module.exports.getFilters = function getFilters () {
  return {
    categories: {
      name: 'category',
      label: 'Category',
      options: categories
    },
    ageRanges: {
      name: 'age',
      label: 'Age',
      options: ageRanges
    },
    orgs: {
      name: 'org',
      label: 'Organization',
      options: orgs
    },
    activityTypes: {
      name: 'activity',
      label: 'Activity',
      options: activityTypes
    },
    badgeTypes: {
      name: 'type',
      label: 'Type',
      options: badgeTypes
    }
  };
}
module.exports.updateOrgs = updateOrgs;
module.exports.healthCheck = function(meta, cb) {
  // Use a privileged API call to ensure we're testing the JWT secret.
  // A random email should guarantee we bust through any caches.
  var email = 'healthCheck_test_' +
              Math.floor(Math.random() * 100000) + '@mozilla.org';

  meta.notes = ENDPOINT;
  openbadger.getUserBadges({
    session: {user: {email: email}}
  }, cb);
};
