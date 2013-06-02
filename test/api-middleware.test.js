const tap = require('tap');
const test = tap.test;
const path = require('path');
const _ = require('underscore');
const express = require('express');
const sinon = require('sinon');

/* Using injectr on a trial basis to inject request module,
then stubbing/mocking it with sinon to return remote API
dummy data. */
const injectr = require('injectr');
var request = require('request');
const Api = injectr(
  path.join(__dirname, '../api.js'),
  {
    request: request
  },
  {
    console: console /* api doesn't seem to have a console unless I do this? */
  }
);

function fakeRequest(func, config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = {};
  }

  // TODO: translating config object to req data is sloppy
  var req = _.extend(
    {
      __proto__: express.request,
      headers: {} ,
      session: config.session || {}
    },
    config
  );
  req.headers = {'x-requested-with': config.xhr ? 'XmlHttpRequest' : 'Whatever'};
  var res = { __proto__: express.response };
  sinon.stub(res, 'json');
  var next = sinon.stub();

  func(req, res, next);
  callback(req, res, next);
}

const ORIGIN = 'http://example.org';

test('Api()', function(t) {

  t.test('requires origin', function(t) {
    t.throws(function(){ new Api(); }, 'throws without');
    t.end();
  });

  t.test('uses method names', function(t) {
    var stubA = sinon.stub();
    var api = new Api(ORIGIN, {
      methodA: stubA,
      methodB: sinon.stub()
    });
    t.isa(api.methodA, 'function');
    t.isa(api.methodB, 'function');
    t.end();
  });

  t.test('wrapped method context has remote helpers', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get');
    var api = new Api(ORIGIN, {
      method: function(){ this.get() },
    });
    api.method();
    t.ok(get.calledOnce, 'this.get');
    t.end();
    requestMock.restore();
  });

  t.test('calls wrapped method with query and callback', function(t) {
    var method = sinon.stub(); 
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method();
    t.ok(method.calledOnce, 'wraps');
    t.ok(method.calledWith(sinon.match({}), sinon.match.func), 'args');
    t.end();
  });

  t.test('string arg becomes id', function(t) {
    var method = sinon.stub(); 
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method('foo');
    t.ok(method.calledWith(sinon.match({ id: 'foo' })), 'query arg');
    t.end();
  });

  t.test('query object passed through', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method({ some: 'data' });
    t.ok(method.calledWith(sinon.match({ some: 'data' })), 'query arg');
    t.end();
  });

  t.test('data passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, null, 'data');
    var callback = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method(callback);
    t.ok(callback.calledWith(null, 'data'), 'data');
    t.end();
  });

  t.test('err and message passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, 'err', 'msg');
    var callback = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0], 'err', 'err');
    t.same(args[1], 'msg', 'message');
    t.end();
  });

  t.test('err and data passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, 'err', { some: 'data' });
    var callback = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0], 'err', 'err');
    t.same(args[1], { some: 'data' }, 'data');
    t.end();
  });

});

test('api.middleware(method)', function(t) {
  
  t.test('invokes method', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware(api.method),
      function(req, res, next) {
        t.ok(method.calledOnce, 'method called');
        t.ok(method.calledWith(sinon.match.object, sinon.match.func), 'arg types');
        t.end();
      }
    );
  });

  t.test('string method lookup', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(method.calledOnce, 'method called');
        t.ok(method.calledWith(sinon.match.object, sinon.match.func), 'arg types');
        t.end();
      }
    );
  });

  t.test('query object contains request params', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      {
        params: { a: 1 },
        body: { b: 1 },
        query: { c: 1 }
      },
      function(req, res, next) {
        t.ok(method.calledWith(sinon.match({ a: 1, b: 1, c: 1 })), 'query object ok');
        t.end();
      }
    );
  });

  t.test('query object contains session', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      {
        session: { some: 'sessionstuff' }
      },
      function(req, res, next) {
        t.ok(method.calledWith(
          sinon.match({ session: { some: 'sessionstuff' }})
        ), 'session in query obj');
        t.end();
      }
    );
  });

  t.test('query object contains default params', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method', { default: 'hooray' }),
      function(req, res, next) {
        t.ok(method.calledWith(sinon.match({ default: 'hooray' })), 'query object ok');
        t.end();
      }
    );
  });

  t.test('callback(null, data) attaches data to request and calls next()', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { result: 1 });
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.same(req.remote, { result: 1 }, 'req.remote');
        t.ok(next.calledOnce, 'next');
        t.end();
      }
    );
  });

  t.test('callback(null, data) calls response.json with data for xhr', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { result: 1 });
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      {
        xhr: true
      },
      function(req, res, next) {
        t.ok(res.json.calledWithMatch({ result: 1 }), 'json called');
        t.notOk(next.callCount, 'next() not');
        t.end();
      }
    );
  });

  t.test('callback(err) calls next() with err', function(t) {
    var method = sinon.stub().callsArgWith(1, 500);
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledOnce, 'next called');
        var arg = next.getCall(0).args[0];
        t.same(arg, 500, 'error');
        t.end();
      }
    );
  });

  t.test('callback(err, msg) calls next() with err', function(t) {
    var method = sinon.stub().callsArgWith(1, 500, 'msg');
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledOnce, 'next called');
        var args = next.getCall(0).args;
        t.same(args[0], 500, 'error');
        t.notOk(args[1], 'no data');
        t.end();
      }
    );
  });

  t.test('callback(err, obj) calls next() with err', function(t) {
    var method = sinon.stub().callsArgWith(1, 500, { some: 'data' });
    var api = new Api(ORIGIN, {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledOnce, 'next called');
        var args = next.getCall(0).args;
        t.same(args[0], 500, 'error');
        t.notOk(args[1], 'no data');
        t.end();
      }
    );
  });

  t.test('callback(err) calls response.json for xhr', function(t) {
    /* There's an implicit requirement that errors coming from
       api methods must be objects with a status attribute. */
    /* TODO: either add error helpers to the api module that
       enforce the requirements, or loosen them. */
    var err = { code: 500, status: 'error' };
    var method = sinon.stub().callsArgWith(1, err);
    var api = new Api('ORIGIN', {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      {
        xhr: true
      },
      function(req, res, next) {
        t.ok(res.json.calledOnce);
        t.notOk(next.callCount, 'next() not');
        var arg = res.json.getCall(0).args[0];
        t.similar(arg, { status: 'error' }, 'error');
        t.end();
      }
    );
  });

});

/* Implicitly testing the wrapped request methods just by
   testing get, which is a bit lame but quicker. */
/* TODO: also test the underlying api.remote()? */
test('api.get', function(t) {
  var api = new Api(ORIGIN);

  t.test('calls request.get under the hood', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get');

    api.get('/foo', function(){});
    t.ok(get.calledOnce, 'called');
    t.ok(get.calledWith(sinon.match(ORIGIN + '/foo')), 'with origin and endpoint');
    requestMock.restore();
    t.end();
  });

  t.test('passes optional params through', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get');

    api.get('/foo', { some: 'params' }, function(){});
    t.ok(get.calledOnce, 'called');
    t.ok(get.calledWith(
      sinon.match(ORIGIN + '/foo'),
      sinon.match({ some: 'params' })
    ), 'with params too');
    requestMock.restore();
    t.end();
  });

  t.test('leading slashes don\'t indicate absolute path', function(t) {
    const WITH_PATH = 'http://example.org/base/';
    var api = new Api(WITH_PATH);
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').twice();

    api.get('/foo/bar', function(){});
    api.get('foo/bar', function(){});
    t.ok(get.alwaysCalledWith(sinon.match(WITH_PATH + 'foo/bar')), 'with origin/endpoint');
    requestMock.restore();
    t.end();
  });

  t.test('calls against different origins don\'t collide', function(t) {
    const ANOTHER = 'http://another.org';
    var api2 = new Api(ANOTHER);

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').twice();

    api.get('/foo', function(){});
    api2.get('/bar', function(){});
    t.same(get.getCall(0).args[0], ORIGIN + '/foo', 'api');
    t.same(get.getCall(1).args[0], ANOTHER + '/bar', 'api2');
    requestMock.restore();
    t.end();
  });

  t.test('calls callback with 500 if request.get errors', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').callsArgWith(2, 'Error');

    api.get('/foo', function(err, data){
      t.similar(err, { code: 500, name: 'Internal', message: 'Error' }, 'error');
      t.notOk(data, 'no data');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('calls callback with 502 if request.get response is not 200', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').callsArgWith(2, null, { statusCode: 404 });

    api.get('/foo', function(err, data){
      t.similar(err, { code: 502, name: 'BadGateway' }, 'error');
      t.notOk(data, 'no data');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('calls callback with 500 if request.get response is not json', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(2, null, { statusCode: 200 }, "NOPE!");

    api.get('/foo', function(err, data){
      t.similar(err, { code: 500, name: 'Internal', message: 'Unexpected token N' }, 'error');
      t.notOk(data, 'no data');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('calls callback with 500 if request.get json response status not "ok"', function(t) {
    var response = {
      status: 'NOPE',
      reason: 'It broke.'
    };

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(2, null, { statusCode: 200 }, JSON.stringify(response));

    api.get('/foo', function(err, data){
      t.similar(err, { code: 500, name: 'Internal', message: 'It broke.' }, 'error');
      t.similar(data, response, 'data');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('stringified JSON data gets parsed', function(t) {
    var response = {
      status: 'ok',
      data: 'Stuff.'
    };

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(2, null, { statusCode: 200 }, JSON.stringify(response));

    api.get('/foo', function(err, data){
      t.notOk(err, 'no error');
      t.same(data, { status: 'ok', data: 'Stuff.' }, 'data');
      requestMock.restore();
      t.end(); 
    });
  });

  /* request parses for you if you post with { json: ... } */
  t.test('pre-parsed data is passed through', function(t) {
    var response = {
      status: 'ok',
      data: 'Stuff.'
    };

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(2, null, { statusCode: 200 }, response);

    api.get('/foo', function(err, data){
      t.notOk(err, 'no error');
      t.same(data, { status: 'ok', data: 'Stuff.' }, 'data');
      requestMock.restore();
      t.end(); 
    });
  });

});

test('paginate', function(t) {

  t.test('wrapped method context has remote helpers', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get');
    var api = new Api(ORIGIN, {
      method: { 
        func: function(){ this.get() },
        paginate: true
      }
    });
    api.method();
    t.ok(get.calledOnce, 'this.get');
    t.end();
    requestMock.restore();
  });

  t.test('page and pageSize defaults', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({}, callback);
    t.similar(method.getCall(0).args[0], { page: 1, pageSize: 12 }, 'defaults');
    t.end();
  });

  t.test('intercepts bad pageSize', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: -1 }, callback);
    var args = callback.getCall(0).args;
    t.same(args[0].name, 'BadRequest', 'err');
    t.notOk(args[1], 'data');
    t.end();
  });

  t.test('intercepts bad page', function(t) {
    var method = sinon.stub();
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ page: -1 }, callback);
    var args = callback.getCall(0).args;
    t.same(args[0].name, 'BadRequest', 'err');
    t.notOk(args[1], 'data');
    t.end();
  });

  t.test('error on non-pageable data', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: 1 });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0].name, 'BadGateway', 'error');
    t.same(args[1], { data: 1 }, 'data');
    t.end();
  });

  t.test('don\'t error out on no data', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: [] });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method(callback);
    var args = callback.getCall(0).args;
    t.notOk(args[0], 'no error');
    t.similar(args[1], { data: [], pages: 0 }, 'data');
    t.end();
  });

  t.test('calls paginated method with query and callback', function(t) {
    var method = sinon.stub(); 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    api.method({ pageSize: 5, page: 1 });
    t.ok(method.calledOnce, 'wraps');
    t.ok(method.calledWith(sinon.match({}), sinon.match.func), 'args');
    t.end();
  });

  t.test('paginates data.data from wrapped method', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: [1, 2, 3, 4, 5] });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: 2, page: 1 }, callback);
    t.ok(callback.calledOnce, 'callback');
    var args = callback.getCall(0).args;
    t.notOk(args[0], 'no error');
    t.similar(args[1], { data: [1, 2] }, 'data paginated');
    t.end();
  });

  t.test('paginates data.key from wrapped method if key provided', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { foo: [1, 2, 3, 4, 5] });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true, key: 'foo' }
    });
    var callback = sinon.stub();
    api.method({ pageSize: 2, page: 1 }, callback);
    t.ok(callback.calledOnce, 'callback');
    var args = callback.getCall(0).args;
    t.notOk(args[0], 'no error');
    t.similar(args[1], { foo: [1, 2] }, 'foo paginated');
    t.end();
  });

  t.test('page count and page passed along', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: [1, 2, 3, 4, 5] });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: 2, page: 1 }, callback);
    t.ok(callback.calledOnce, 'callback');
    var args = callback.getCall(0).args;
    t.notOk(args[0], 'no error');
    t.similar(args[1], { page: 1, pages: 3 }, 'page/pages');
    t.end();
  });

  t.test('intercepts page out of range', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: [1, 2, 3, 4, 5] });; 
    var api = new Api(ORIGIN, {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: 2, page: 5 }, callback);
    t.ok(callback.calledOnce, 'callback');
    var args = callback.getCall(0).args;
    t.same(args[0].name, 'NotFound', 'error');
    t.same(args[1], { page: 5, pages: 3 }, 'data');
    t.end();
  });
});
