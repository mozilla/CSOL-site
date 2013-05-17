var dictionary = require('./dictionary');

var adjectives = dictionary.adjectives;
var nouns = dictionary.nouns;

exports.generate = function generateUsername () {
  return (adjectives.random() + ' ' + nouns.random())
    .toLowerCase()
    .replace(/(^| )(\w)/g, function(match, lead, character) { return lead + character.toUpperCase(); });
}

exports.validate = function validateUsername (username) {
  // TODO - make sure username is valid
  if (username.length < 5)
    return false;
  return true;
}