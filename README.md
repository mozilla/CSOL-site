# Chicago Summer of Learning

The website for the Chicago Summer of Learning, developed by Ocupop and Mozilla.

## Environment

Property          | Default  | Description
------------------|----------|-------------------------
`CSOL_DB_NAME`    | `"csol"` | Name of the database.
`CSOL_DB_USER`    | `"root"` | Database username.
`CSOL_DB_PASS`    | `null`   | Database password.
`CSOL_DB_HOST`    | `null`   | Database host.
`CSOL_DB_PORT`    | `null`   | Database port.
`CSOL_AWS_KEY`    | `null`   | AWS key (for storing uploads)
`CSOL_AWS_SECRET` | `null`   | AWS secret
`CSOL_AWS_REGION` | `null`   | AWS region (optional)
`CSOL_AWS_BUCKET` | `null`   | AWS bucket
`CSOL_HOST`       | `null`   | Canonical CSOL host (eg chicagosummeroflearning.org)
`COOKIE_SECRET`   | `null`   | Seed for session cookie.
`CSOL_OPENBADGER_URL`    | `null` | Openbadger API Location, http://obr.com/v2/
`CSOL_OPENBADGER_SECRET` | `null` | A shared secret with Open Badger. Should match the OPENBADGER_JWT_SECRET variable on open badger
`CSOL_MANDRILL_KEY` | `null` | The Mandrill key to use for mailings.

Note that instead of providing AWS credentials, you can specify a pathname
in `CSOL_AWS_FAKE_S3_DIR`. This is for development purposes only, and
will store all uploaded files in the local filesystem instead of S3.
