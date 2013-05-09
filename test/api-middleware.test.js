const tap = require('tap');
const test = tap.test;
const path = require('path');
const sinon = require('sinon');
const fakeRequest = require('./').fakeRequest;

/* Using injectr on a trial basis to inject request module,
   then stubbing/mocking it with sinon to return remote API
   dummy data. */
const injectr = require('injectr');
var request = require('request');
const api = injectr(
  path.join(__dirname, '../api.js'),
  {
    request: request
  },
  {
    console: console /* api doesn't seem to have a console unless I do this? */
  }
);

/* TODO: refresh data */
/* TODO: do something more sophisticated when we have more dummy data */
const DATA = {
  status: 'ok',
  badges: {
    'link-basic': {
      name: 'Link Badge, basic',
      description: 'For doing links.',
      prerequisites: [],
      image: 'http://openbadger-csol.mofostaging.net/badge/image/link-basic.png',
      behaviors: [ { name: 'link', score: 5 } ]
    },
    'link-advanced': {
      name: 'Link Badge, advanced',
      description: 'For doing links, but like, a lot of them',
      prerequisites: [],
      image: 'http://openbadger-csol.mofostaging.net/badge/image/link-advanced.png',
      behaviors: [ { name: 'link', score: 5 } ]
    },
    comment: {
      name: 'Commenting badge',
      description: 'For doing lots of comments.',
      prerequisites: [],
      image: 'http://openbadger-csol.mofostaging.net/badge/image/comment.png',
      behaviors: [ { name: 'link', score: 5 } ]
    }
  }
};

test ('api(callback)', function(t) {
  t.test('basic case', function(t) {
    var func = sinon.stub().callsArgWith(1, null, { result: 1 });
    fakeRequest(
      api(func),
      {
        params: { a: 1 },
        body: { b: 1 },
        query: { c: 1 }
      },
      function(req, res, next) {
        t.ok(func.calledWithMatch({ a: 1, b: 1, c: 1 }), 'func gets params, body, query data');
        t.similar(req.remote, { data: { result: 1 }}, 'func return data in req.remote');
        t.ok(next.calledOnce, 'next called');
        t.end();
      }
    );
  });

  t.test('calls json for xhr request', function(t) {
    var func = sinon.stub().callsArgWith(1, null, { result: 1 });
    fakeRequest(
      api(func),
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

  t.test('function error', function(t) {
    var func = sinon.stub().callsArgWith(1, 'Kaboom');
    fakeRequest(
      api(func),
      function(req, res, next) {
        t.ok(next.calledWith('Kaboom'));
        t.end();
      }
    );
  });
});

test('api(bad string)', function(t) {
  fakeRequest(
    api('NOPE'),
    function(req, res, next) {
      t.ok(next.calledWith('Supplied method not valid'), 'next called with error');
      t.end();
    }
  );
});

test('getBadge', function(t) {

  t.test('without id', function(t) {
    api.getBadge(function(err, data) {
      t.isa(err, 'ServerError');
      t.same(err.message, "Invalid badge key");
      t.end();
    });
  });

  t.test('with bad id', function(t) {
    var mock = sinon.mock(request);
    mock.expects('get')
      .once().withArgs(sinon.match('/v1/badges'))
      .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(DATA));
    api.getBadge({ id: 'NOPE' }, function(err, data) {
      t.ok(mock.verify(), "mock verified");
      t.isa(err, "ServerError");
      t.same(err.message, "Badge not found", "error message is correct");
      t.end();
    });
  });

  t.test('with good id', function(t) {
    var mock = sinon.mock(request);
    mock.expects('get')
      .once().withArgs(sinon.match('/v1/badges'))
      .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(DATA));
    api.getBadge({ id: 'link-basic' }, function(err, data) {
      t.ok(mock.verify(), "mock verified");
      t.notOk(err, "no error");
      t.similar(data.badge, { name: "Link Badge, basic"});
      t.end();
    });
  });

});

test('getBadges', function(t){

  t.test('request.get error', function(t) {
    sinon.stub(request, "get").callsArgWith(1, 'asplode');
    api.getBadges(function(err, data) {
      t.isa(err, 'ServerError');
      t.same(err.statusCode, 500);
      t.same(err.message, 'asplode');
      t.end();
      request.get.restore();
    });
  });

  t.test('remote API returns non-200 response', function(t) {
    sinon.stub(request, "get").callsArgWith(1, null, { statusCode: 404 });
    api.getBadges(function(err, data) {
      t.isa(err, 'ServerError');
      t.same(err.statusCode, 500);
      t.same(err.message, 'Upstream error');
      t.end();
      request.get.restore();
    });
  });

  t.test('remote API returns non-JSON body', function(t) {
    sinon.stub(request, "get").callsArgWith(1, null, { statusCode: 200 }, 'Nope!');
    api.getBadges(function(err, data) {
      t.isa(err, 'ServerError');
      t.same(err.statusCode, 500);
      t.same(err.message, 'Unexpected token N');
      t.end();
      request.get.restore();
    });
  });

  t.test('remote API returns non-ok status', function(t) {
    sinon.stub(request, "get").callsArgWith(1,
      null, { statusCode: 200 },
      JSON.stringify({ status: 'Nope!', reason: "Meh." }));
    api.getBadges(function(err, data) {
      t.isa(err, 'ServerError');
      t.same(err.statusCode, 500);
      t.same(err.message, 'Meh.');
      t.end();
      request.get.restore();
    });
  });

  t.test('remote API returns badges', function(t) {

    t.test('basic case', function(t) {
      var mock = sinon.mock(request);
      mock.expects('get')
        .once().withArgs(sinon.match('/v1/badges'))
        .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(DATA));
      api.getBadges(function(err, data) {
        t.ok(mock.verify(), 'mock passes');
        t.notOk(err, 'no err');
        t.similar(data, { page: 1, pages: 1 }, 'page and pages in data');
        t.same(data.items.length, 3, 'three badges returned');
        //TODO: test for normalization?
        t.end();
      });
    });

    t.test('asking for unavailable page', function(t) {
      var mock = sinon.mock(request);
      mock.expects('get')
        .once().withArgs(sinon.match('/v1/badges'))
        .callsArgWith(1, null, { statusCode: 200 }, JSON.stringify(DATA));
      api.getBadges({ page: 2 }, function(err, data) {
        t.ok(mock.verify(), 'mock passes');
        t.isa(err, 'ServerError');
        t.same(err.statusCode, 404);
        t.same(err.message, 'Page not found');
        t.end();
      });
    });

  });
});
