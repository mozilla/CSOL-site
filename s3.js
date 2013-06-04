var s3;

const S3_REQUIRED_ENV_VARS = [
  "CSOL_AWS_KEY",
  "CSOL_AWS_SECRET",
  "CSOL_AWS_BUCKET"
];
const USE_FAKE_S3 = process.env['NODE_ENV'] == 'development' &&
                    process.env["CSOL_AWS_FAKE_S3_DIR"];
if (USE_FAKE_S3) {
  var FakeS3 = require('./s3-fake');
  s3 = new FakeS3(process.env["CSOL_AWS_FAKE_S3_DIR"]);
} else {
  var knox = require('knox');
  S3_REQUIRED_ENV_VARS.forEach(function(name) {
    if (!process.env[name])
      throw new Error("missing environment var " + name + ", please " +
                      "define it or specify CSOL_AWS_FAKE_S3_DIR");
  });
  s3 = knox.createClient({
    key:    process.env["CSOL_AWS_KEY"],
    secret: process.env["CSOL_AWS_SECRET"],
    region: process.env["CSOL_AWS_REGION"],
    bucket: process.env["CSOL_AWS_BUCKET"]
  });
}

s3.healthCheck = function(meta, cb) {
  var async = require('async');
  var rnd = Math.floor(Math.random() * 100000).toString();
  var url = '/healthChecker_test_' + rnd;

  if (USE_FAKE_S3)
    meta.notes = 'fake s3';
  else
    meta.notes = process.env["CSOL_AWS_BUCKET"] + '.s3.amazonaws.com';

  async.series([
    s3.putBuffer.bind(s3, new Buffer(rnd), url, {
      'Content-Type': 'text/plain'
    }),
    function(cb) {
      s3.get(url).on('response', function(proxy) {
        var chunks = [];
        proxy.on('data', function(chunk) {
          chunks.push(chunk);
        });
        proxy.on('end', function() {
          var buf = Buffer.concat(chunks);
          if (buf.toString('ascii') != rnd)
            return cb("expected " + rnd + ", got " + buf.toString('ascii'));
          cb();
        });
      }).end();
    },
    s3.deleteFile.bind(s3, url)
  ], cb);
};

module.exports = s3;
