const tap = require('tap');
const test = tap.test;
const ServerError = require('../server-error');

test('ServerError', function(t) {
  var err = new ServerError(500, 'barf');
  t.isa(err, 'ServerError');
  t.same(err.statusCode, 500);
  t.same(err.message, 'barf');
  t.end();
});

test('toString', function(t) {
  var err = new ServerError(500, 'barf');
  t.same(err.toString(), 'Error: barf'); /* Error's toString fine for now */
  t.end();
});