const path = require('path');
const test = require('tap').test;
const sinon = require('sinon');
var openbadger = require('../openbadger');
var mock = sinon.mock(openbadger);

const DATA = {
  'badges': {
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
  },
  'badge': {
    status: 'ok',
    badge: {
      name: 'Link Badge, basic',
      description: 'For doing links.',
      prerequisites: [],
      image: 'http://openbadger-csol.mofostaging.net/badge/image/link-basic.png',
      behaviors: [ { name: 'link', score: 5 } ]
    }
  },
  'programs': {
    status: 'ok',
    programs: {
      "prog-a": {
        image: "http://some.org/prog-a/img.png",
        name: "Program A"
      },
      "prog-b": {
        image: "http://some.org/prog-b/img.png",
        name: "Program B"
      },
      "prog-c": {
        image: "http://some.org/prog-c/img.png",
        name: "Program C"
      }
    }
  },
  'program': {
    status: 'ok',
    program: {
      image: "http://some.org/prog-a/img.png",
      name: "Program A"
    }
  }
};

const DEFAULT_QUERY = {
  pageSize: 5,
  page: 1
};

test('getBadge', function(t) {

  t.test('called without id', function(t) {
    var getStub = mock.expects('get').never();
    openbadger.getBadge(function(err, data) {
      t.notOk(getStub.called, 'no call');
      t.similar(err, { code: 400, message: 'Invalid badge key' });
      t.notOk(data);
      t.end();
    });
  });

  t.test('on error', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, 404, 'barf');
    openbadger.getBadge({ id: 'whatever' }, function(err, data) {
      t.ok(getStub.calledOnce, "called");
      t.similar(err, 404);
      t.same(data, "barf", "error message");
      t.end();
    });
  });

  t.test('on success', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['badge']);
    openbadger.getBadge({ id: 'some-id' }, function(err, data) {
      t.notOk(err, "no error");
      t.ok(getStub.calledWithMatch('/badge/some-id'), 'remote endpoint');
      t.similar(data.badge, { name: "Link Badge, basic"}, 'badge');
      t.similar(data.badge, { id: 'some-id', url: '/earn/some-id' }, 'normalized');
      t.end();
    });
  });

});

test('getBadges', function(t){

  t.test('on error', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, 500, 'error of some sort');
    openbadger.getBadges(DEFAULT_QUERY, function(err, data) {
      t.same(err, 500, 'error');
      t.same(data, 'error of some sort', 'data');
      t.end();
    });
  });

  t.test('with data', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['badges']);
    openbadger.getBadges(DEFAULT_QUERY, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.badges.length, 3, 'data length');
      var badge = data.badges[0];
      t.ok(badge.id && badge.url && badge.name && badge.behaviors, 'looks like normalized badge');
      t.ok(getStub.calledWithMatch('/badges'), 'endpoint');
      t.end();
    });
  });

  t.test('paginates', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['badges']);
    openbadger.getBadges({ pageSize: 2, page: 1 }, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.badges.length, 2, 'paginated');
      t.end();
    });
  });

});

test('getProgram', function(t) {

  t.test('called without id', function(t) {
    var getStub = mock.expects('get').never();
    openbadger.getProgram(function(err, data) {
      t.notOk(getStub.called, 'no call');
      t.similar(err, { code: 400, message: "Invalid program key" });
      t.notOk(data);
      t.end();
    });
  });

  t.test('on error', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, 404, 'barf');
    openbadger.getProgram({ id: 'whatever' }, function(err, data) {
      t.ok(getStub.calledOnce, "called");
      t.same(err, 404);
      t.same(data, "barf", "error message");
      t.end();
    });
  });

  t.test('on success', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['program']);
    openbadger.getProgram({ id: 'some-id' }, function(err, data) {
      t.notOk(err, "no error");
      t.ok(getStub.calledWithMatch('/program/some-id'), 'endpoint');
      t.similar(data.program, { name: "Program A" }, 'program');
      t.similar(data.program, { id: 'some-id', url: '/learn/some-id' }, 'normalized');
      t.end();
    });
  });

});

test('getPrograms', function(t) {

  t.test('on error', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, 500, 'error of some sort');
    openbadger.getPrograms(DEFAULT_QUERY, function(err, data) {
      t.same(err, 500, 'error');
      t.similar(data, 'error of some sort', 'data');
      t.end();
    });
  });

  t.test('with data', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['programs']);
    openbadger.getPrograms(DEFAULT_QUERY, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.programs.length, 3, 'data length');
      var program = data.programs[0];
      t.ok(program.id && program.url && program.name, 'looks like normalized program');
      t.ok(getStub.calledWithMatch('/programs'), 'endpoint');
      t.end();
    });
  });

  t.test('paginates', function(t) {
    var getStub = mock.expects('get');
    getStub.callsArgWith(1, null, DATA['programs']);
    openbadger.getPrograms({ pageSize: 2, page: 1 }, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.programs.length, 2, 'paginated');
      t.end();
    });
  });

});
