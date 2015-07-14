module.exports = function (done) {

  var
  memtest = require('../tests/memtest.js'),
  palikka = require('../palikka.js'),
  samples = 100000,
  tests = [];

  tests.push(function () {

    console.log('Unresolved deferreds');
    for (var i = 0; i < samples; i++) {
      palikka.defer();
    }

  });

  tests.push(function () {

    console.log('Resolved deferreds');
    for (var i = 0; i < samples; i++) {
      palikka.defer().resolve();
    }

  });

  tests.push(function () {

    console.log('Rejected deferreds');
    for (var i = 0; i < samples; i++) {
      palikka.defer().reject();
    }

  });

  tests.push(function () {

    console.log('Long unresolved .then() chain');
    var d = palikka.defer();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Long resolved .then() chain');
    var d = palikka.defer().resolve();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Long rejected .then() chain');
    var d = palikka.defer().reject();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  memtest(tests, done);

};