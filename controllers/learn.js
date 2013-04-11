module.exports = function(app) {

    app.param('section', function(req, res, next, section) {
        if (section == 'programs') {
            req.params.section = {
                title: 'Programs',
                model: 'program'
            };
        } else if (section == 'orgs') {
            req.params.section = {
                title: 'Organizations',
                model: 'organization'
            };
        } else if (section == 'activities') {
            req.params.section = {
                title: 'Activities',
                model: 'activity'
            };
        } else if (section == 'games') {
            req.params.section = {
                title: 'Games',
                model: 'game'
            };
        } else {
            return next(new Error('Learn section "' + section + '" not found'));
        }

        next();
    });

    app.param('item_id', function(req, res, next, id) {
        var section = req.params.section,
            model = require('../models/' + section.model);

        model.find(id).success(function(item) {
            if (item) {
                req.params.item = item;
                next();
            } else {
                next(new Error('<' + section.model + ': ' + id + '> not found'));
            }
        });
    });

    app.get('/learn/:section?/:item_id?', function(req, res) {
        var section = req.params.section,
            item = req.params.item;

        if (item) {
            res.render('learn/' + section.model + '/single.html', {
                item: item
            })
        } else if (section) {
            var model = require('../models/' + section.model);

            model.all().success(function(items) {
                res.render('learn/' + section.model + '/list.html', {
                    items: items || []
                });
            });
        } else {
            res.render('learn/list.html', {
                items: []
            });
        }
    });

    app.get('/learn/:section/:item_id/:action', function(req, res, next) {
        var item = req.params.item,
            action = req.params.action;

        switch (action) {
            case 'favorite':
                res.send('Favoriting ' + item);
                break;
            case 'unfavorite':
                res.send('Unfavoriting ' + item);
                break;
            default:
                next();
        }
    });

}