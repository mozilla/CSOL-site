var dictionary = require('./dictionary');

var adjectives = dictionary.adjectives;
var nouns = dictionary.nouns;
var invalidCharacterSet = /[^\w -]/g;

exports.generate = function generateUsername () {
  return (adjectives.random() + ' ' + nouns.random())
    .toLowerCase()
    .replace(/(^| )(\w)/g, function(match, lead, character) { return lead + character.toUpperCase(); });
}

exports.validate = function validateUsername (username) {
  if ((''+username).length < 5)
    throw 'Username must be at least five characters long';

  if (invalidCharacterSet.test(username))
    throw 'Username can only include letters, numbers, spaces, and dashes'

  return true;
}

exports.normalize = function normalizeUsername (username) {
  return (''+username)
    // Remove whitespace
    .replace(/\s/g, '')
    // Remove invalid characters
    .replace(invalidCharacterSet, '')
    // Convert to lower case
    .toLowerCase();
}