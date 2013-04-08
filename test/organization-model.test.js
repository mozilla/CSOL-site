const $ = require('./');
const test = require('tap').test;
const Organization = require('../models/organization');

$.prepare([
  { model: 'Organization',
    name: 'wbez',
    values: {
      id: 10,
      name: 'WBEZ 91.5',
      description: 'Chicago Public Radio',
      url: 'http://www.wbez.org/',
      imageUrl: 'https://twimg0-a.akamaihd.net/profile_images/858641792/WBEZ915_LOGO.jpg',
      address: '848 East Grand Ave, Navy Pier, Chicago, Illinois 60611',
      phone: '312.948.4600',
      email: 'admin@wbez.org'
    }
  }
], function (fixtures) {
  test('Finding an organization', function (t) {
    const expect = fixtures['wbez'];
    Organization.find(expect.id).success(function (instance) {
      t.same(instance.rawAttributes, expect.rawAttributes);
      t.end();
    });
  });
});
