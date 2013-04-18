const Sequelize = require('sequelize');

const DB_NAME = process.env['CSOL_DB_NAME'] || 'csol';
const USERNAME = process.env['CSOL_DB_USER'] || 'root';
const PASSWORD = process.env['CSOL_DB_PASS'];
const MODEL_PATH = process.env['CSOL_MODEL_PATH'] || __dirname + '/models';

const db = new Sequelize(DB_NAME, USERNAME, PASSWORD, {
  define: { charset: 'utf8' }
});

var modelCache = {};

db.model = function(name) {
  var normalized = name.replace(/(^| +)([a-z])/ig, function(match, space, character) {
        return character[space ? 'toUpperCase' : 'toLowerCase']();
      }),
      name = normalized.replace(/(^| +)([a-z])/ig, function(match, space, character) {
        return character.toUpperCase();
      }),
      key = name.toLowerCase();

  if (!modelCache[key]) {
    console.log('Defining model:', name);

    var definition = require(MODEL_PATH + '/' + normalized),
        properties = definition.properties,
        relationships = definition.relationships;

    delete definition.properties;
    delete definition.relationships;

    var model = db.define(name, properties, definition);
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

    model.sync();
  }

  return modelCache[key];
}

db.type = Sequelize;
module.exports = db;
