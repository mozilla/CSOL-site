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

/**
 * Prepare the database by syncing all known models and optionally
 * saving some test data.
 *
 * If only one argument is passed, it is treated as the callback. When
 * there are no fixtures passed, the only tables that will get synced
 * are those that are known about (through `require`ing the models in
 * in the test file) before `prepare` is called.
 *
 * @param fixtures Array of fixture objects. A fixture object is
 *   expected to have the following properties:
 *     - model: Name of the model. Should correspond to a filein models/ dir
 *     - name: Name to give the resulting instance
 *     - values: Object with the values to save
 */
exports.prepare = function (fixtures, callback) {
  if (typeof fixtures == 'function')
    callback = fixtures, fixtures = [];

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
        instances.forEach(function (instance, idx) {
          const name = fixtures[idx].name;
          if (name)
            instances[name] = instance;
        });
        return callback(instances);
      });
    })
    .error(function (error) {
      console.log('Could not sync database models:');
      console.dir(error);
      process.exit(1);
    });
};

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

const express = require('express');
const sinon = require('sinon');
const _ = require('underscore');

exports.fakeRequest = function fakeRequest(func, config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = {};
  }

  // TODO: translating config object to req data is sloppy
  var req = _.extend(
    { __proto__: express.request,
      headers: {} },
    config
  );
  req.headers = {'x-requested-with': config.xhr ? 'XmlHttpRequest' : 'Whatever'};
  var res = { __proto__: express.response };
  sinon.stub(res, 'json');
  var next = sinon.stub();

  func(req, res, next);
  callback(req, res, next);
};
