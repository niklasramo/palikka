module.exports = function (done) {

  var
  Benchmark = require('benchmark'),
  palikka = require('../palikka.js'),
  counter = 0,
  suite = new Benchmark.Suite('palikka', {
    onStart: function () {
      console.log('Benchmark started');
    },
    onCycle: function (e) {
      console.log(String(e.target));
    },
    onError: function (e) {
      console.log(e);
    },
    onComplete: function () {
      console.log('Benchmark finished');
      if (typeof done === 'function') {
        done();
      }
    }
  });

  //
  // Modules
  //

  suite.add('Create and require modules', function() {

    ++counter;

    palikka.define('a' + counter, ['b' + counter, 'c' + counter], function () {});
    palikka.define('b' + counter, ['c' + counter], function () {});
    palikka.define('c' + counter, function () {});

  });

  suite.run({ 'async': false });

};