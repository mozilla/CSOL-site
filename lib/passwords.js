var dictionary = require('./dictionary');

var adjectives = dictionary.adjectives;
var nouns = dictionary.nouns;

function random (limit) {
  return Math.floor(Math.random() * limit);
}

exports.generate = function generatePassword () {
  return (adjectives.random() + ' ' + nouns.random() + (10+random(89)))
    .toLowerCase()
    .replace(/(^|\W)(\w)/g, function(match, lead, character) { return lead + character.toUpperCase(); })
    .replace(/\W/, '');
}

exports.validate = function validatePassword (password) {
  // TODO - make sure password is valid
  return true;
}
