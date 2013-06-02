var querystring = require('querystring');

module.exports = function(app) {

  app.param('section', function(req, res, next, section) {
    if (section == 'programs') {
      req.params.section = {
        title: 'Programs',
        set: 'program'
      };
    } else if (section == 'orgs') {
      req.params.section = {
        title: 'Organizations',
        set: 'organization'
      };
    } else if (section == 'activities') {
      req.params.section = {
        title: 'Activities',
        set: 'activity'
      };
    } else {
      return next(new Error('Learn section "' + section + '" not found'));
    }

    req.params.section.path = section;

    next();
  });

  app.param('item_id', function(req, res, next, id) {
    var section = req.params.section;

    // TODO - hook this into a model somewhere
    req.params.item = {};

    next();
  });

  app.get('/explore/:section?/:item_id?', function(req, res) {
    var section = req.params.section;
    var item = req.params.item;

    var items = [];

    var itemOptions = [{
      thumbnail: '/media/images/org.png',
      description: 'Organization blah irure...',
      url: '/explore/orgs/some-organization'
    },{
      thumbnail: '/media/images/program.png',
      description: 'Program blah sed eiusmod...',
      url: '/explore/programs/some-program'
    },{
      thumbnail: '/media/images/activity.png',
      description: 'Activity id est laborum...',
      url: '/explore/activities/some-activity'
    }];

    if (item)
      return res.render('learn/' + section.set + '/single.html', {
        item: item
      });

    if ('category' in req.query) {
      var category = req.query['category'];
      delete req.query['category'];
      var query = querystring.stringify(req.query);
      return res.redirect('/explore/' + category + '?' + query);
    }

    for (var i = 0; i < 12; ++i) {
      items.push(itemOptions[Math.floor(Math.random()*itemOptions.length)]);
    }

    var filters = [{
      name: 'category',
      label: 'Category',
      selected: (section || {}).path,
      options: {
        activities: 'Activities',
        orgs: 'Organizations',
        programs: 'Programs'
      }
    },{
      name: 'age',
      label: 'Age',
      options: {}
    },{
      name: 'topic',
      label: 'Topic',
      options: {}
    },{
      name: 'date',
      label: 'Date',
      options: {}
    },{
      name: 'search',
      label: 'Search',
      value: '',
      type: 'search'
    }];

    if (section)
      return res.render('learn/' + section.set + '/list.html', {
        filters: filters,
        pageTitle: section.title,
        items: items
      });

    res.render('learn/list.html', {
      filters: filters,
      items: items
    });
  });

  app.get('/explore/:section/:item_id/:action', function(req, res, next) {
    var item = req.params.item;
    var action = req.params.action;

    if (action === 'favorite')
      return res.send('Favoriting ' + item);

    if (action === 'unfavorite')
      return res.send('Unfavoriting ' + item);

    next();
  });

}