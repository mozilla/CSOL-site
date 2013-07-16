var asm = require('../asm')

module.exports = function (app) {
  app.get('/asm', asm.get_asm_programs, function (req, res, next) {
    //var data = req.remote;
    var orgs = [];
    res.render('landing/after-school-matters.html', {
      programs: res.programs,
      split_column_number:res.split_column_number,
      filters:res.filters
    });
  });
};