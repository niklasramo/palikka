module.exports = function (done) {

  var
  memtest = require('../tests/memory-tester.js'),
  palikka = require('../palikka.js'),
  when = require('when'),
  samples = 10000,
  tests = [];

  //
  // Next tick
  //

  tests.push(function () {

    console.log('nextTick - Palikka');
    for (var i = 0; i < samples; i++) {
      palikka.nextTick(function () {});
    }

  });

  tests.push(function () {

    console.log('nextTick - Native promise');
    for (var i = 0; i < samples; i++) {
      Promise.resolve().then(function () {});
    }

  });

  if (process.nextTick) {

    tests.push(function () {

      console.log('nextTick - process.nextTick');
      for (var i = 0; i < samples; i++) {
        process.nextTick(function () {});
      }

    });

  }

  if (global.setImmediate) {

    tests.push(function () {

      console.log('nextTick - setImmediate');
      for (var i = 0; i < samples; i++) {
        global.setImmediate(function () {});
      }

    });

  }

  //
  // Promises
  //

  tests.push(function () {

    console.log('Unresolved deferreds - Palikka');
    for (var i = 0; i < samples; i++) {
      palikka.defer();
    }

  });

  tests.push(function () {

    console.log('Unresolved deferreds - When');
    for (var i = 0; i < samples; i++) {
      when.promise(function () {});
    }

  });

  tests.push(function () {

    console.log('Resolved deferreds - Palikka');
    for (var i = 0; i < samples; i++) {
      palikka.defer().resolve();
    }

  });

  tests.push(function () {

    console.log('Resolved deferreds - When');
    for (var i = 0; i < samples; i++) {
      new when.promise(function (res, rej) { res(); });
    }

  });

  tests.push(function () {

    console.log('Resolved deferreds (with another promise) - Palikka');
    for (var i = 0; i < samples; i++) {
      palikka.defer().resolve( palikka.defer().resolve() );
    }

  });

  tests.push(function () {

    console.log('Resolved deferreds (with another promise) - When');
    for (var i = 0; i < samples; i++) {
      new when.promise(function (resolve) { resolve( new when.promise(function (res) { res(); }) ); });
    }

  });

  tests.push(function () {

    console.log('Rejected deferreds - Palikka');
    for (var i = 0; i < samples; i++) {
      palikka.defer().reject();
    }

  });

  tests.push(function () {

    console.log('Rejected deferreds - When');
    for (var i = 0; i < samples; i++) {
      new when.promise(function (res, rej) { rej(); });
    }

  });

  tests.push(function () {

    console.log('Unresolved .then() chain - Palikka');
    var d = palikka.defer();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Unresolved .then() chain - When');
    var d = new when.promise(function () {});
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Resolved .then() chain - Palikka');
    var d = palikka.defer().resolve();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Resolved .then() chain - When');
    var d = new when.promise(function (res) { res(); });
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Rejected .then() chain - Palikka');
    var d = palikka.defer().reject();
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  tests.push(function () {

    console.log('Rejected .then() chain - When');
    var d = new when.promise(function (res, rej) { rej(); });
    for (var i = 0; i < samples; i++) {
      d = d.then(function () {}, function () {});
    }

  });

  memtest(tests, done);

};