[![Build Status](https://travis-ci.org/mozilla/CSOL-site.png?branch=master)](https://travis-ci.org/mozilla/CSOL-site)

# Chicago Summer of Learning

Learning happens everywhere in the city—in libraries, parks, museums and cultural institutions, community-based organizations, colleges and universities, schools, and beyond. This summer, Mayor Rahm Emanuel is challenging all Chicago youth to participate in the Summer of Learning, a citywide effort to engage youth in hands-on learning opportunities—particularly in science, technology, engineering, arts, and math. School stops for the summer, but learning never should.

More than 100 organizations across the city have joined forces to integrate learning into summer activities for youth of all ages in every Chicago neighborhood.

*This is the code that makes all that possible*

## Overview

The CSOL site depends on two backend services, [OpenBadger](http://github.com/mozilla/openbadger) to issue the badges and [Aestimia](http://github.com/mozilla/aestimia) to assess online learning. All three applications are written in Node.js and use Express as a web framework. CSOL uses MySQL as a data store, while OpenBadger and Aestimia use Mongoose. We also use the really excellent [Mandrill](http://mandrillapp.com) to send emails via their API, and Amazon S3 to host uploaded work.

Each app is developed with Heroku's [12 factor app](http://www.12factor.net/) structure in mind. The entire environment is hosted on Amazon EC2, but is highly portable.

## Get Involved

There's a lot of organizations involved with launching the Chicago Summer of Learning, the Chicago Mayor's Office, the MacArthur Foundation, the Digital Youth Network and the Mozilla Foundation, plus 100+ organizations offering youth opportunities to learn this summer.

Our code is open source, because we want this to be a community driven project. If you're interested in the goals of this project - we'd love your contributions.

Contributing is relatively easy,

1. Set up a development environment. Each app is Node.js, so if you're familiar with the firing up a Node app, you're in good shape. All configuration is passed to the app via environment variables, see below for how to define your environment.
2. Fork the code.
3. Find an issue to work on. We're actively marking issues that should be easy to grab as a first or second ticket as [onboarding](https://github.com/mozilla/csol-site/issues?labels=onboard&state=open).
4. Work on the issue in your fork. Be sure to write tests for any new code!
5. When you're done, make sure all tests pass, submit the code as a pull request to the main repository (master branch). We'll review it and merge it asap!
6. GOTO step 3

If you want to tackle a bigger ticket, find a core developer and ask them what to work on. We hang out in IRC at irc.mozilla.org in the #badges room. Core devs include cmcavoy, arhayward, mlarsson, atul and brianloveswords. Any of those irc folks will be able to direct you towards meatier issues.

If you're working on a ticket that needs copy, it's most likely in this [google doc](https://docs.google.com/document/d/1UJ1X5mMpFnleNeh58VALNLf7y1P2kuJIsQOqI7vSUWE/edit#) but if not, ping @threeqube in IRC, or through an issue.

## Getting started

Install the application dependencies:

```bash
$ npm install
```

Start the app server:

```base
$ node_modules/.bin/up -t 0 -n 1 -w -p 7000 app.js
```

Check out site in browser at [http://127.0.0.1:7000/](http://127.0.0.1:7000/)

## Running Tests

You can use the following commands to run the entire suite:

```bash
$ bin/test.js          # normally you'd use this
$ bin/test.js --debug  # if you want to see debugging
```

You can also run just a few of the tests:

```bash
$ bin/test.js tests/foo.test.js  # run only one test file
$ bin/test.js -f bad             # run all test files w/ 'bad' in their name
```

This is useful for when one file (or area of code) is giving you trouble
and you don't want to run through the whole suite to debug just that one
thing.

## Environment

These variables should be configured in your applications environment through env variables. An easy way to do that is create a config.env in your application directly that looks something like,

```
#MySQL Config
export CSOL_DB_PASS=db

#Local Config
export COOKIE_SECRET='chris is cool'
export CSOL_HOST='chicagosummeroflearning.org'


#Location of OpenBadger
export CSOL_OPENBADGER_URL='http://localhost:8000/v2/'
export CSOL_OPENBADGER_SECRET='lecarre'

#Amazon S3
export CSOL_AWS_FAKE_S3_DIR='csol-s3'

#Aestimia
export CSOL_AESTIMIA_URL='http://localhost:8001'
export CSOL_AESTIMIA_SECRET='lksdafjjtitiejrwejjjresfs'
export CSOL_HOST='http://chicagosummeroflearning.org'

#Mandrill
export CSOL_MANDRILL_KEY=''
```

Then you can source the file like `. config.env`.

Here's the full list of variables,

Property            | Default  | Description
--------------------|----------|-------------------------
`CSOL_DB_NAME`      | `"csol"` | Name of the database.
`CSOL_DB_USER`      | `"root"` | Database username.
`CSOL_DB_PASS`      | `null`   | Database password.
`CSOL_DB_HOST`      | `null`   | Database host.
`CSOL_DB_PORT`      | `null`   | Database port.
`CSOL_AWS_KEY`      | `null`   | AWS key (for storing uploads)
`CSOL_AWS_SECRET`   | `null`   | AWS secret
`CSOL_AWS_REGION`   | `null`   | AWS region (optional)
`CSOL_AWS_BUCKET`   | `null`   | AWS bucket
`CSOL_HOST`         | `null`   | Canonical CSOL host (eg http://chicagosummeroflearning.org)
`CSOL_EMAIL_DOMAIN` | `null`   | Domain to send email from (if different from CSOL_HOST)
`COOKIE_SECRET`     | `null`   | Seed for session cookie.
`CSOL_OPENBADGER_URL`    | `null` | Openbadger API Location, http://obr.com/v2/
`CSOL_OPENBADGER_SECRET` | `null` | A shared secret with Open Badger. Should match the OPENBADGER_JWT_SECRET variable on open badger
`CSOL_MANDRILL_KEY` | `null` | The Mandrill key to use for mailings.
`CSOL_AESTIMIA_URL`      | `null` | Aestimia API Location
`CSOL_AESTIMIA_SECRET`   | `null` | A shared secret with Aestimia

Note that instead of providing AWS credentials, you can specify a pathname
in `CSOL_AWS_FAKE_S3_DIR`. This is for development purposes only, and
will store all uploaded files in the local filesystem instead of S3.

## Database

The database can be sync'd by running

    npm run-script sync-db

Any migrations can be run with

    npm run-script migrate-db
