const test = require('tap').test;
const sinon = require('sinon');
const api = require('../api');
const openbadger = require('../openbadger');

var getStub = sinon.stub();
openbadger.setRemote({ get: getStub });

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

test('getBadge(query, cb)', function(t) {

  t.test('called without id', function(t) {
    openbadger.getBadge(function(err, data) {
      t.notOk(getStub.called, 'no call');
      t.same(err, 400);
      t.same(data, { message: "Invalid badge key" });
      t.end();
    });
  });

  t.test('called with missing id', function(t) {
    getStub.callsArgWith(1, null, DATA);
    openbadger.getBadge({ id: 'NOPE' }, function(err, data) {
      t.ok(getStub.calledOnce, "called");
      t.same(err, 404);
      t.same(data.message, "Badge not found", "error message is correct");
      t.end();
    });
  });

  t.test('called with good id', function(t) {
    getStub.callsArgWith(1, null, DATA);
    openbadger.getBadge({ id: 'link-basic' }, function(err, data) {
      t.notOk(err, "no error");
      t.similar(data.badge, { name: "Link Badge, basic"}, 'badge');
      t.similar(data.badge, { id: 'link-basic', url: '/badges/link-basic' }, 'normalized');
      t.end();
    });
  });

});

test('getBadges', function(t){
  var DEFAULT_QUERY = {
    pageSize: 5, 
    page: 1
  };

  t.test('on error', function(t) {
    getStub.callsArgWith(1, 500, 'error of some sort');
    openbadger.getBadges(DEFAULT_QUERY, function(err, data) {
      t.same(err, 500, 'error');
      t.similar(data, { message: 'error of some sort' }, 'data');
      t.end(); 
    });
  });

  t.test('with data', function(t) {
    getStub.callsArgWith(1, null, DATA);
    openbadger.getBadges(DEFAULT_QUERY, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.badges.length, 3, 'data length');
      var badge = data.badges[0];
      t.ok(badge.id && badge.url && badge.name && badge.behaviors, 'looks like normalized badge');
      t.end(); 
    });
  });

  t.test('paginates', function(t) {
    getStub.callsArgWith(1, null, DATA);
    openbadger.getBadges({ pageSize: 2, page: 1 }, function(err, data) {
      t.notOk(err, 'no error');
      t.same(data.badges.length, 2, 'paginated');
      t.end(); 
    });
  });

});
