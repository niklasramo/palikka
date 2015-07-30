module.exports = function (done) {

  var
  Benchmark = require('benchmark'),
  palikka = require('../palikka.js'),
  bluebird = require('bluebird'),
  fee = require('eventemitter3'),
  eventizerA = new palikka.Eventizer(),
  eventizerB = new palikka.Eventizer(),
  eventizerC = new palikka.Eventizer(),
  eventizerD = new palikka.Eventizer(),
  feeA = new fee(),
  feeB = new fee(),
  feeC = new fee(),
  feeD = new fee(),
  counter = 0,
  suite = new Benchmark.Suite('palikka', {

    onStart: function () {

      console.log('Benchmark started');
      /*
      palikka.config.asyncDeferreds = false;
      palikka.config.asyncModules = false;
      */

    },

    onCycle: function (e) {

      console.log(String(e.target));

    },

    onError: function (e) {

      console.log(e);

    },

    onComplete: function () {

      console.log('Benchmark finished');
      /*
      palikka.config.asyncDeferreds = true;
      palikka.config.asyncModules = true;
      */

      if (typeof done === 'function') {

        done();

      }

    }

  });

  suite.add('Emit one event - Palikka', function() {

    ++counter;

    eventizerC
    .on('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .emit('ev' + counter, [1,2,3,4,5,6,7,8,9,10]);

  });

  suite.add('Emit one event - FEE', function() {

    ++counter;

    feeC.on('ev' + counter, function () {});
    feeC.on('ev' + counter, function () {});
    feeC.emit('ev' + counter, 1,2,3,4,5,6,7,8,9,10);

  });

  suite.add('Create emitter - Palikka', function() {

    new palikka.Eventizer();

  });

  suite.add('Create emitter - FEE', function() {

    new fee();

  });

  suite.add('Bind an event listener - Palikka', function() {

    ++counter;

    eventizerA
    .on('ev' + counter, function () {});

  });

  suite.add('Bind an event listener - FEE', function() {

    ++counter;

    feeA.on('ev' + counter, function () {});

  });

  suite.add('Unbind an event listener (no target) - Palikka', function() {

    ++counter;

    eventizerB
    .on('ev' + counter, function () {})
    .off('ev' + counter);

  });

  suite.add('Unbind an event listener (no target) - FEE', function() {

    ++counter;

    feeB.on('ev' + counter, function () {});
    feeB.off('ev' + counter);

  });

  /*

  suite.add('Real world - Palikka', function() {

    ++counter;

    function test() {

    }

    eventizerD
    .on('ev' + counter, test)
    .one('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .one('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .one('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .one('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .one('ev' + counter, function () {})
    .emit('ev' + counter)
    .emit('ev' + counter, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .off('ev' + counter, test)
    .off('ev' + counter);

  });

  suite.add('Real world - FEE', function() {

    ++counter;

    function test() {

    }

    feeD.on('ev' + counter, test);
    feeD.once('ev' + counter, function () {});
    feeD.on('ev' + counter, function () {});
    feeD.once('ev' + counter, function () {});
    feeD.on('ev' + counter, function () {});
    feeD.once('ev' + counter, function () {});
    feeD.on('ev' + counter, function () {});
    feeD.once('ev' + counter, function () {});
    feeD.on('ev' + counter, function () {});
    feeD.once('ev' + counter, function () {});
    feeD.emit('ev' + counter);
    feeD.emit('ev' + counter, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    feeD.off('ev' + counter, test);
    feeD.off('ev' + counter);

  });

  suite.add('Create promise - Bluebird', function() {

   new bluebird.Promise(function() {});

  });

  suite.add('Create promise - Palikka', function() {

    palikka.defer();

  });

  suite.add('Resolve promise - Bluebird', function() {

    new bluebird.Promise(function (resolve) {
      resolve();
    });

  });

  suite.add('Resolve promise - Palikka', function() {

    palikka.defer().resolve();

  });

  suite.add('Reject promise - Bluebird', function() {

    new bluebird.Promise(function (resolve, reject) {
      reject();
    });

  });

  suite.add('Reject promise - Palikka', function() {

    palikka.defer().reject();

  });

  suite.add('Thenify - Bluebird', function() {

    new bluebird.Promise(function () {}).then(function () {}, function () {});

  });

  suite.add('Thenify - Palikka', function() {

    palikka.defer().then(function () {}, function () {});

  });

  suite.add('Create a module', function() {

    ++counter;

    palikka.define('m' + counter, function () {});

  });

  */

  suite.run({ 'async': true });

};