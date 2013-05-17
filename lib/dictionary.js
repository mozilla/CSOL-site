var fs = require('fs');
var path = require('path');


function Dictionary (filepath, options) {
  this.words = [];

  if (filepath)
    this.read(filepath, options);
}


Dictionary.load = function (dictionary, options) {
  var filepath = path.join(__dirname, '..', 'dict', dictionary + '.txt');
  return new Dictionary(filepath, options);
}

Dictionary.prototype.read = function (filepath, options) {
  var words = this.words,
      encoding = (options||{}).encoding || 'utf-8',
      data;

  if (({}).toString.call(filepath) === '[object Array]') {
    data = filepath;
  } else {
    data = fs.readFileSync(filepath, encoding).split(/\s+/)
  }

  data.forEach(function(word) {
    if (word) words.push(word);
  });

  return this;
};

Dictionary.prototype.random = function () {
  return this.words[random(this.words.length)];
};

function random (limit) {
  return Math.floor(Math.random() * limit);
}

exports.Dictionary = Dictionary;
exports.load = Dictionary.load;
exports.nouns = Dictionary.load('nouns');
exports.adjectives = Dictionary.load('adjectives');
