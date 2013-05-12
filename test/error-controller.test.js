const tap = require('tap');
const test = tap.test;
const express = require('express');
const sinon = require('sinon');
const errors = require('../controllers/errors');
const ServerError = require('../server-error');

test('handles ServerError', function(t) {
  var req = { __proto__: express.request, headers: {
    'x-requested-with': 'Whatever'
  } };
  var res = { __proto__: express.response };
  var resMock = sinon.mock(res);
  var next = sinon.stub();

  resMock.expects('send').once().withArgs(501, 'foo');

  errors.errorHandler(new ServerError(501, 'foo'), req, res, next);

  t.ok(resMock.verify());
  t.end();
});

test('handles ServerError xhr', function(t) {
  var req = { __proto__: express.request, headers: {
    'x-requested-with': 'XmlHttpRequest'
  } };
  var res = { __proto__: express.response };
  var resMock = sinon.mock(res);
  var next = sinon.stub();

  resMock.expects('json').once().withArgs(501, { error: 'foo' });

  errors.errorHandler(new ServerError(501, 'foo'), req, res, next);

  t.ok(resMock.verify());
  t.end();
});

test('handles Error', function(t) {
  var req = { __proto__: express.request, headers: {
    'x-requested-with': 'Whatever'
  } };
  var res = { __proto__: express.response };
  var resMock = sinon.mock(res);
  var next = sinon.stub();

  resMock.expects('send').once().withArgs(500, 'foo');

  errors.errorHandler(new Error('foo'), req, res, next);

  t.ok(resMock.verify());
  t.end();
});
