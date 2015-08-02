module.exports = function (done) {

  var
  Benchmark = require('benchmark'),
  palikka = require('../palikka.js'),
  when = require('when'),
  ee = require('eventemitter3'),
  eventizerA = new palikka.Eventizer(),
  eventizerB = new palikka.Eventizer(),
  eventizerC = new palikka.Eventizer(),
  eventizerD = new palikka.Eventizer(),
  eeA = new ee(),
  eeB = new ee(),
  eeC = new ee(),
  eeD = new ee(),
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
  // Next tick
  //

  suite.add('nextTick - Palikka', function() {

    palikka.nextTick(function () {});

  });

  suite.add('nextTick - Promise', function() {

    Promise.resolve().then(function () {});

  });

  if (process.nextTick) {

    suite.add('nextTick - process.nextTick', function() {

      process.nextTick(function () {});

    });

  }

  if (global.setImmediate) {

    suite.add('nextTick - setImmediate', function() {

      global.setImmediate(function () {});

    });

  }

  //
  // Promises
  //

  suite.add('Create promise - When', function() {

   new when.promise(function() {});

  });

  suite.add('Create promise - Palikka', function() {

    palikka.defer();

  });

  suite.add('Resolve promise - When', function() {

    new when.promise(function (resolve) {
      resolve();
    });

  });

  suite.add('Resolve promise - Palikka', function() {

    palikka.defer().resolve();

  });

  suite.add('Reject promise - When', function() {

    new when.promise(function (resolve, reject) {
      reject();
    });

  });

  suite.add('Reject promise - Palikka', function() {

    palikka.defer().reject();

  });

  suite.add('Thenify - When', function() {

    new when.promise(function () {}).then(function () {}, function () {});

  });

  suite.add('Thenify - Palikka', function() {

    palikka.defer().then(function () {}, function () {});

  });

  //
  // Events
  //

  suite.add('Emit one event - Palikka', function() {

    ++counter;

    eventizerC
    .on('ev' + counter, function () {})
    .on('ev' + counter, function () {})
    .emit('ev' + counter, [1,2,3,4,5,6,7,8,9,10]);

  });

  suite.add('Emit one event - EE', function() {

    ++counter;

    eeC.on('ev' + counter, function () {});
    eeC.on('ev' + counter, function () {});
    eeC.emit('ev' + counter, 1,2,3,4,5,6,7,8,9,10);

  });

  suite.add('Create emitter - Palikka', function() {

    new palikka.Eventizer();

  });

  suite.add('Create emitter - EE', function() {

    new ee();

  });

  suite.add('Bind an event listener - Palikka', function() {

    ++counter;

    eventizerA
    .on('ev' + counter, function () {});

  });

  suite.add('Bind an event listener - EE', function() {

    ++counter;

    eeA.on('ev' + counter, function () {});

  });

  suite.add('Unbind an event listener (no target) - Palikka', function() {

    ++counter;

    eventizerB
    .on('ev' + counter, function () {})
    .off('ev' + counter);

  });

  suite.add('Unbind an event listener (no target) - EE', function() {

    ++counter;

    eeB.on('ev' + counter, function () {});
    eeB.off('ev' + counter);

  });

  suite.add('Event system generic - Palikka', function() {

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

  suite.add('Event system generic - EE', function() {

    ++counter;

    function test() {

    }

    eeD.on('ev' + counter, test);
    eeD.once('ev' + counter, function () {});
    eeD.on('ev' + counter, function () {});
    eeD.once('ev' + counter, function () {});
    eeD.on('ev' + counter, function () {});
    eeD.once('ev' + counter, function () {});
    eeD.on('ev' + counter, function () {});
    eeD.once('ev' + counter, function () {});
    eeD.on('ev' + counter, function () {});
    eeD.once('ev' + counter, function () {});
    eeD.emit('ev' + counter);
    eeD.emit('ev' + counter, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    eeD.off('ev' + counter, test);
    eeD.off('ev' + counter);

  });

  suite.add('Create a module', function() {

    ++counter;

    palikka.define('a' + counter, ['b' + counter, 'c' + counter], function () {});
    palikka.define('b' + counter, ['c' + counter], function () {});
    palikka.define('c' + counter, function () {});

  });

  suite.run({ 'async': false });

};