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
    { __proto__: express.request,
      headers: {} },
    config
  );
  req.headers = {'x-requested-with': config.xhr ? 'XmlHttpRequest' : 'Whatever'};
  var res = { __proto__: express.response };
  sinon.stub(res, 'json');
  var next = sinon.stub();

  func(req, res, next);
  callback(req, res, next);
}

test('Api()', function(t) {

  t.test('uses method names', function(t) {
    var stubA = sinon.stub();
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
      method: function(){ this.get() },
    });
    api.method();
    t.ok(get.calledOnce, 'this.get');
    t.end();
    requestMock.restore();
  });

  t.test('calls wrapped method with query and callback', function(t) {
    var method = sinon.stub(); 
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method();
    t.ok(method.calledOnce, 'wraps');
    t.ok(method.calledWith(sinon.match({}), sinon.match.func), 'args');
    t.end();
  });

  t.test('string arg becomes id', function(t) {
    var method = sinon.stub(); 
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method('foo');
    t.ok(method.calledWith(sinon.match({ id: 'foo' })), 'query arg');
    t.end();
  });

  t.test('query object passed through', function(t) {
    var method = sinon.stub();
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method({ some: 'data' });
    t.ok(method.calledWith(sinon.match({ some: 'data' })), 'query arg');
    t.end();
  });

  t.test('data passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, null, 'data');
    var callback = sinon.stub();
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method(callback);
    t.ok(callback.calledWith(null, 'data'), 'data');
    t.end();
  });

  t.test('err passed through to wrapped method callback with default message', function(t) {
    var method = sinon.stub().callsArgWith(1, 'err');
    var callback = sinon.stub();
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0], 'err', 'err');
    t.ok(args[1].message, 'message');
    t.end();
  });

  t.test('err and message passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, 'err', 'msg');
    var callback = sinon.stub();
    var api = new Api('ORIGIN', {
      method: method
    });
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0], 'err', 'err');
    t.same(args[1].message, 'msg', 'message');
    t.end();
  });

  t.test('err and data passed through to wrapped method callback', function(t) {
    var method = sinon.stub().callsArgWith(1, 'err', { some: 'data' });
    var callback = sinon.stub();
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
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

  t.test('query object contains default params', function(t) {
    var method = sinon.stub();
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.similar(req.remote, { result: 1 }, 'req.remote');
        t.ok(next.calledOnce, 'next');
        t.end();
      }
    );
  });

  t.test('callback(null, data) calls response.json with data for xhr', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { result: 1 });
    var api = new Api('ORIGIN', {
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

  t.test('callback(err) calls next() with err and default message', function(t) {
    var method = sinon.stub().callsArgWith(1, 500);
    var api = new Api('ORIGIN', {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledWith(sinon.match.object), 'next called');
        var arg = next.getCall(0).args[0];
        t.same(arg.error, 500, 'error');
        t.ok(arg.message, 'default message');
        t.end();
      }
    );
  });

  t.test('callback(err, msg) calls next() with err and message', function(t) {
    var method = sinon.stub().callsArgWith(1, 500, 'msg');
    var api = new Api('ORIGIN', {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledWith(sinon.match.object), 'next called');
        var arg = next.getCall(0).args[0];
        t.same(arg.error, 500, 'error');
        t.same(arg.message, 'msg', 'message');
        t.end();
      }
    );
  });

  t.test('callback(err, obj) calls next() with err and obj', function(t) {
    var method = sinon.stub().callsArgWith(1, 500, { some: 'data' });
    var api = new Api('ORIGIN', {
      method: method
    });
    fakeRequest(
      api.middleware('method'),
      function(req, res, next) {
        t.ok(next.calledWith(sinon.match.object), 'next called');
        var arg = next.getCall(0).args[0];
        t.same(arg.error, 500, 'error');
        t.similar(arg, { some: 'data' }, 'obj');
        t.end();
      }
    );
  });

  t.test('callback(err) calls response.json for xhr', function(t) {
    var method = sinon.stub().callsArgWith(1, 500);
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
        t.same(arg.error, 500, 'error');
        t.ok(arg.message, 'default message');
        t.end();
      }
    );
  });

});

test('api.get', function(t) {
  var api = new Api('ORIGIN');

  t.test('calls request.get under the hood', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get');

    api.get('/foo', function(){});
    t.ok(get.calledOnce, 'called');
    t.ok(get.calledWith(sinon.match('ORIGIN/foo')), 'with origin and endpoint');
    requestMock.restore();
    t.end();
  });

  t.test('calls against different origins don\'t collide', function(t) {
    var api2 = new Api('ANOTHER');

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').twice();

    api.get('/foo', function(){});
    api2.get('/bar', function(){});
    t.same(get.getCall(0).args[0], 'ORIGIN/foo', 'api');
    t.same(get.getCall(1).args[0], 'ANOTHER/bar', 'api2');
    requestMock.restore();
    t.end();
  });

  t.test('calls callback with 500 if request.get errors', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').callsArgWith(1, 'Error');

    api.get('/foo', function(err, data){
      t.same(err, 500, 'error code');
      t.same(data, 'Error', 'error message');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('calls callback with 500 if request.get response is not 200', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get').callsArgWith(1, null, { statusCode: 404 });

    api.get('/foo', function(err, data){
      t.same(err, 500, 'error code');
      t.same(data, 'Upstream error', 'error message');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('calls callback with 500 if request.get response is not json', function(t) {
    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(1, null, { statusCode: 200 }, "NOPE!");

    api.get('/foo', function(err, data){
      t.same(err, 500, 'error code');
      t.same(data, 'Unexpected token N', 'error message');
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
      .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(response));

    api.get('/foo', function(err, data){
      t.same(err, 500, 'error code');
      t.same(data, 'It broke.', 'error message');
      requestMock.restore();
      t.end(); 
    });
  });

  t.test('successful call passes data through', function(t) {
    var response = {
      status: 'ok',
      data: 'Stuff.'
    };

    var requestMock = sinon.mock(request);
    var get = requestMock.expects('get')
      .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(response));

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
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({}, callback);
    t.similar(method.getCall(0).args[0], { page: 1, pageSize: 12 }, 'defaults');
    t.end();
  });

  t.test('intercepts bad pageSize', function(t) {
    var method = sinon.stub();
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: -1 }, callback);
    t.ok(callback.getCall(0).calledWith(400, 
      sinon.match({ message: 'Invalid pageSize number'})), 'error on -1');
    t.end();
  });

  t.test('intercepts bad page', function(t) {
    var method = sinon.stub();
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ page: -1 }, callback);
    t.ok(callback.getCall(0).calledWith(400, 
      sinon.match({ message: 'Invalid page number' })), 'error on -1');
    t.end();
  });

  t.test('error on non-pageable data', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: 1 });; 
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method(callback);
    var args = callback.getCall(0).args;
    t.same(args[0], 500, 'error');
    t.similar(args[1], { message: 'Unpageable data returned from upstream' }, 'message');
    t.end();
  });

  t.test('calls paginated method with query and callback', function(t) {
    var method = sinon.stub(); 
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    api.method({ pageSize: 5, page: 1 });
    t.ok(method.calledOnce, 'wraps');
    t.ok(method.calledWith(sinon.match({}), sinon.match.func), 'args');
    t.end();
  });

  t.test('paginates data.data from wrapped method', function(t) {
    var method = sinon.stub().callsArgWith(1, null, { data: [1, 2, 3, 4, 5] });; 
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
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
    var api = new Api('ORIGIN', {
      method: { func: method, paginate: true }
    });
    var callback = sinon.stub();
    api.method({ pageSize: 2, page: 5 }, callback);
    t.ok(callback.calledOnce, 'callback');
    var args = callback.getCall(0).args;
    t.same(args[0], 404, 'error');
    t.similar(args[1], { message: 'Page not found' }, 'msg');
    t.end();
  });
});
