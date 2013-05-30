var knox = require('knox');

var s3 = knox.createClient({
  key:    process.env["CSOL_AWS_KEY"],
  secret: process.env["CSOL_AWS_SECRET"],
  region: process.env["CSOL_AWS_REGION"],
  bucket: process.env["CSOL_AWS_BUCKET"]
});

module.exports = s3;
