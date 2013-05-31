var exec = require('child_process').exec;
var im = require('imagemagick');
var path = require('path');

var imageThumb = function (input, output, format, width, height, callback) {
  if (typeof height === 'function') {
    callback = height;
    height = null;
  }

  return im.crop({
    srcPath: input,
    dstPath: output,
    width: width,
    height: height,
    format: format
  }, callback);
}

var videoThumb = function (input, output, format, width, height, callback) {
  if (typeof height === 'function') {
    callback = height;
    height = '?';
  }

  function escapePath (str) {
    return '"' + path.normalize(str.replace(/(["\s'$`\\])/g,'\\$1')) + '"';
  }

  if (output)
    output = escapePath(output);
  else
    output = 'pipe:' + format;

  // Ideally, we'd be doing this via some library, but I'm yet to find one
  // that seems to allow for buffer output, rather than saving to file.

  var args = [
    '-loglevel', 0,             // Turn off output
    '-i', escapePath(input),    // Use input file
    '-vframes', 1,              // Use only one frame
    '-ss', '00:00:02',          // Taken from two seconds in
    '-s', width + 'x' + height, // Thumbnail dimensions
    '-f', 'image2',             // Set commands file
    output                      // Output
  ];

  var cmd = 'ffmpeg ' + args.join(' ');

  return exec(cmd, {encoding: 'binary'}, callback);
}

module.exports.image = imageThumb;
module.exports.video = videoThumb;
