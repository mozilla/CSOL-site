const ENV = process.env['NODE_ENV'];

if (ENV !== 'test' && ENV !== 'travis') {
  console.log('Tests must be run with NODE_ENV=test');
  console.log('Also ensure that CSOL_DB_NAME is set to the test database');
  process.exit(1);
}

if (!process.env['CSOL_DB_NAME']) {
  console.log('No test database name set, defaulting to "test_csol"');
  process.env['CSOL_DB_NAME'] = 'test_csol';
}


const path = require('path');
const async = require('async');

exports.prepare = function (fixtures, callback) {
  if (typeof fixtures == 'function')
    callback = fixtures, fixtures = [];

  function requireModel (filename) {
    return require(path.join(__dirname, '..', 'models',  filename));
  }

  function saveFixture(models, fixture, callback) {
    const Model = models[fixture.model];
    Model.create(fixture.values)
      .success(function (instance) {
        console.log('success');
        return callback(null, instance);
      })
      .error(function (error) {
        return callback(error);
      });
  }

  const db = require('../db');

  const models = fixtures.reduce(function (models, fixture) {
    const filename = fixture.model.toLowerCase();
    models[fixture.model] = requireModel(filename);
    return models;
  }, {});

  const save = saveFixture.bind(null, models);

  db.sync({force: true})
    .success(function () {
      async.mapSeries(fixtures, save, function (err, instances) {
        if (err) throw err;
        const named = instances.reduce(function (named, instance, idx) {
          const name = fixtures[idx].name;
          named[idx] = named[name] = instance;
          return named;
        }, {});
        return callback(named);
      });
    })
    .error(function (error) {
      console.log('Could not sync database models:');
      console.dir(error);
      process.exit(1);
    });
};