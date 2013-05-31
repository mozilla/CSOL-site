const path = require('path');

const Sequelize = require('sequelize');

const DB_NAME = process.env['CSOL_DB_NAME'] || 'csol';
const USERNAME = process.env['CSOL_DB_USER'] || 'root';
const PASSWORD = process.env['CSOL_DB_PASS'];
const DB_HOST = process.env['CSOL_DB_HOST'];
const DB_PORT = process.env['CSOL_DB_PORT'];
const MODEL_PATH = process.env['CSOL_MODEL_PATH'] || path.join(__dirname, 'models');

const db = new Sequelize(DB_NAME, USERNAME, PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  define: { charset: 'utf8' }
});

/**
 * In order to get useful bi-directional relationships on models, the relationship
 * has to be defined on both sides:
 *
 *     Learner.belongsTo(Guardian);
 *     Guardian.hasMany(Learner);
 *
 * This automatically adds functionality to both parties, and without both
 * relationships being defined, half would be missing:
 *
 *     <learner instance>.[get|set]Guardian();
 *     <guardian instance>.[get|set]Learners();
 *     <guardian instance>.[add|remove]Learner();
 *
 * However, this doesn't work when models are split out into their own files, as
 * we end up with circular references. That is, in order for `Learner` to reference
 * `Guardian`, it has to `require(.../guardian)`, but `Guardian` has to do likewise
 * in order to reference `Learner`.
 *
 * Hence the following abstraction, which allows us to define models in their own
 * files, but also allows for fully-defined bi-directional relationships. So,
 * rather than pull in models directly by `require(.../model)`, we now go via the
 * database instead.
 *
 *     model = require(.../db).model('Model');
 */

var modelCache = {};

db.model = function(name) {
  // `normalizedName` is a conversion from 'some name' to 'someName'
  var normalized = name.replace(/(^| +)([a-z])/ig, function(match, space, character) {
        return character[space ? 'toUpperCase' : 'toLowerCase']();
      });

  // `name` is a conversion from 'some name' into 'SomeName'
  var name = normalized.replace(/(^| +)([a-z])/ig, function(match, space, character) {
        return character.toUpperCase();
      });

  // `key` is a conversion from 'some name' to 'somename'
  var key = name.toLowerCase();

  if (!modelCache[key]) {
    console.log('Defining model:', name);

    var definition = require(path.join(MODEL_PATH, normalized)),
        properties = definition.properties,
        relationships = definition.relationships,
        setup = definition.setup;

    delete definition.properties;
    delete definition.relationships;
    delete definition.setup;

    var model = db.define(name, properties, definition);
    // We need to cache the model before resolving any relationships, so that it
    // is available to any related models that might reference it.
    modelCache[key] = model;

    if (relationships) {
      relationships.forEach(function(relationship) {
        var relatedModel = db.model(relationship.model),
            type = relationship.type;

        console.log('Establishing relationship:', name + '.' + type + '(' + relatedModel.name + ')');

        delete relationship.model;
        delete relationship.type;

        model[type](relatedModel, relationship);
      });
    }

    if (typeof setup === 'function')
      setup(model);
  }

  return modelCache[key];
}

db.type = Sequelize;
module.exports = db;
