var s3;

const S3_REQUIRED_ENV_VARS = [
  "CSOL_AWS_KEY",
  "CSOL_AWS_SECRET",
  "CSOL_AWS_BUCKET"
];

if (process.env["CSOL_AWS_FAKE_S3_DIR"]) {
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

module.exports = s3;
