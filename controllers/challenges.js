var querystring = require('querystring');

module.exports = function(app) {

  app.param('challenge_id', function(req, res, next, id) {
    // TODO - hook this into a model somewhere
    req.params.challenge = {};

    next();
  });

  app.get('/challenges/:challenge_id?', function(req, res) {
    var challenge = req.params.challenge;

    if (challenge)
      return res.render('challenges/single.html', {
        challenge: challenge
      });

    var items = [];

    for (var i = 0; i < 12; ++i) {
      items.push({
        thumbnail: '/media/images/challenge.png',
        description: 'Challenge blah irure...',
        url: '/challenges/some-challenge'
      });
    }

    res.render('challenges/list.html', {
      filters: [],
      items: items
    });
  });

  app.get('/challenges/:challenge_id/:action', function(req, res, next) {
    var item = req.params.item;
    var action = req.params.action;

    if (action === 'apply')
      return res.send('Apply');

    if (action === 'favorite')
      return res.send('Favoriting ' + item);

    if (action === 'unfavorite')
      return res.send('Unfavoriting ' + item);

    next();
  });

}