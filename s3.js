var knox = require('knox');

var s3 = knox.createClient({
  key:    env.get("CSOL_AWS_KEY"),
  secret: env.get("CSOL_AWS_SECRET"),
  region: env.get("CSOL_AWS_REGION"),
  bucket: env.get("CSOL_AWS_BUCKET")
});

module.exports = s3;
