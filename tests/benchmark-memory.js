module.exports = function (done) {

  var
  memtest = require('../tests/memory-tester.js'),
  palikka = require('../palikka.js'),
  when = require('when'),
  bb = require('bluebird'),
  samples = 1000000,
  tests = [];

  tests.push(function () {

    var d = new palikka.Deferred(function (res) {
      res('moro');
    });
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  memtest(tests, done);

};