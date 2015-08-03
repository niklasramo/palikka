(function (Q) {

  /**
   * Configuration.
   */

  QUnit.config.reorder = false;

  /**
   * Tests.
   */

  Q.test('Modules', function (assert) {

    assert.expect(45);
    var done = assert.async();

    var

    m1 = 'a',
    m1Val = 'aVal',
    m1Data,

    m2 = 'b',
    m2Val = {b: 'b'},

    m3 = 'c',
    m3Val = 'cVal',

    m4 = 'd',
    m4Val = {d: 'd'},

    m5 = 'e',
    m5Val = 'eVal',

    asyncTest = false;

    /** List method should always return a new object. */
    assert.notEqual(palikka.list(), palikka.list());

    /** List method should return an empty object when no modules are defined. */
    assert.deepEqual(palikka.list(), {});

    /** Define a single module without dependencies. */
    palikka.define(m1, function () {

      /** Context should be an object. */
      assert.strictEqual(typeof this, 'object');

      /** Context dependencies type should be an object. */
      assert.strictEqual(typeof this.dependencies, 'object');

      /** Context id type should be a string. */
      assert.strictEqual(typeof this.id, 'string');

      /** Context id should be the module id. */
      assert.strictEqual(this.id, m1);

      /** There should be no arguments at all when there are no dependencies. */
      assert.strictEqual(arguments.length, 0);

      asyncTest = true;

      return m1Val;

    });

    /** Get module data before it is initiated. */
    m1Data = palikka.list()[m1];

    /** Module "id" should always be the same string it was initiated with. */
    assert.strictEqual(m1Data.id, m1);

    /** Module "ready" should be false before initiation. */
    assert.strictEqual(m1Data.ready, false);

    /** Module "value" should be undefined before initiation. */
    assert.strictEqual(m1Data.value, undefined);

    /** Module "dependencies" should always be an array. */
    assert.strictEqual(m1Data.dependencies instanceof Array, true);

    /** Module "dependencies" should be empty when there are no dependencies. */
    assert.strictEqual(m1Data.dependencies.length, 0);

    /** Factory function should be called asynchronously. */
    assert.strictEqual(asyncTest, false);

    /** Require a single module. */
    palikka.require(m1, function (a) {

      /** Require callback's context should be an object which contains all the modules as key value pairs. */
      assert.strictEqual(this.dependencies[m1], a);

      /** There should be as many arguments as there are required modules. */
      assert.strictEqual(arguments.length, 1);

      /** Dependency values should be assigned as function arguments in the order they were defined. */
      assert.strictEqual(a, m1Val);

    });

    /** Try to redefine a module, should not be possible. */
    assert.throws(function () {
      palikka.define(m1, {});
    });

    /** Define multiple modules with a single dependency. */
    palikka.define([m2, m3], m4, function (val) {

      /** There should be as many arguments as there are required modules. */
      assert.strictEqual(arguments.length, 1);

      /** Dependency values should be assigned as function arguments in the order they were defined. */
      assert.strictEqual(val, m4Val);

      return this.id === m2 ? m2Val : m3Val;

    });

    /** Define a single module with multiple dependencies. */
    palikka.define(m5, [m1, m2, m3, m4], function (val1, val2, val3, val4) {

      /** There should be as many arguments as there are required modules. */
      assert.strictEqual(arguments.length, 4);

      /** Dependency values should be assigned as function arguments in the order they were defined. */
      assert.strictEqual(val1, m1Val);
      assert.strictEqual(val2, m2Val);
      assert.strictEqual(val3, m3Val);
      assert.strictEqual(val4, m4Val);

      /** Context dependencies should match the function arguments. */
      assert.strictEqual(this.dependencies[m1], m1Val);
      assert.strictEqual(this.dependencies[m2], m2Val);
      assert.strictEqual(this.dependencies[m3], m3Val);
      assert.strictEqual(this.dependencies[m4], m4Val);

      /** Deferred as a return value. */
      return new palikka.Deferred(function (resolve) {
        window.setTimeout(function () {
          resolve(m5Val);
        }, 100);
      });

    });

    /** Define a moule using object as the facotry. */
    palikka.define(m4, [m1], m4Val);

    /** Try to define two modules with circular dependency. */
    palikka.define('circ1', 'circ2', {});
    assert.throws(function () {
      palikka.define('circ2', 'circ1', {});
    });

    /** Try to define a module with an empty id. */
    assert.throws(function () {
      palikka.define('', [], {});
    });

    /** Try to define a module with wrong types. */
    assert.throws(function () {
      palikka.define(1, {});
    });

    /** Try to define a module with wrong types. */
    assert.throws(function () {
      palikka.define('1', 'test');
    });

    /** Try to define a module with wrong types. */
    assert.throws(function () {
      palikka.define('1', [], 'test');
    });

    /** Check that data matches. */
    window.setTimeout(function () {

      var
      m1Data = palikka.list()[m1],
      m2Data = palikka.list()[m2],
      m3Data = palikka.list()[m3],
      m4Data = palikka.list()[m4],
      m5Data = palikka.list()[m5];

      /** Check module deferred results. */
      assert.strictEqual(m1Data.value, m1Val);
      assert.strictEqual(m2Data.value, m2Val);
      assert.strictEqual(m3Data.value, m3Val);
      assert.strictEqual(m4Data.value, m4Val);
      assert.strictEqual(m5Data.value, m5Val);

      /** Check module deferred states. */
      assert.strictEqual(m1Data.ready, true);
      assert.strictEqual(m2Data.ready, true);
      assert.strictEqual(m3Data.ready, true);
      assert.strictEqual(m4Data.ready, true);
      assert.strictEqual(m5Data.ready, true);

      done();

    }, 500);

  });

  Q.test('Modules - Asynchronous test', function (assert) {

    var done = assert.async();
    assert.expect(1);

    var test = [];

    test.push(1);

    palikka.require('asyncTest', function () {
      test.push(2);
    });

    palikka.define('asyncTest2', ['asyncTest'], function () {
      test.push(3);
      assert.deepEqual(test, [1, 5, 4, 2, 3]);
      done();
    });

    palikka.define('asyncTest', function () {
      test.push(4);
      return 'asyncTest';
    });

    test.push(5);

  });

  Q.test('Modules - Synchronous test', function (assert) {

    assert.expect(1);

    var test = [];

    palikka.config.asyncModules = false;

    test.push(1);

    palikka.require('syncTest', function () {
      test.push(2);
    });

    palikka.define('syncTest2', ['syncTest'], function () {
      test.push(3);
    });

    palikka.define('syncTest', function () {
      test.push(4);
      return 'asyncTest';
    });

    test.push(5);

    assert.deepEqual(test, [1, 4, 2, 3, 5]);

    palikka.config.asyncModules = true;

  });

  Q.test('Eventizer - Instance', function (assert) {

    assert.expect(3);

    assert.strictEqual((new palikka.Eventizer()) instanceof palikka.Eventizer, true);
    assert.strictEqual(palikka.eventize() instanceof palikka.Eventizer, true);
    assert.strictEqual(palikka.eventize({}) instanceof palikka.Eventizer, false);

  });

  Q.test('Eventizer - Eventized object', function (assert) {

    assert.expect(1);

    /** Eventizing an object should return the same object that was eventized. */
    var obj = {};
    assert.strictEqual(palikka.eventize(obj), obj);

  });

  Q.test('Eventizer - Listeners collection', function (assert) {

    assert.expect(6);

    /** By default every eventizer instance and eventized object should have "_listeners" property which is an object. */
    assert.strictEqual(typeof (new palikka.Eventizer())._listeners, 'object');
    assert.strictEqual(typeof palikka.eventize()._listeners, 'object');
    assert.strictEqual(typeof palikka.eventize({})._listeners, 'object');

    /** Custom listeners object should be added to the created instance as "_listeners" property. */
    var obj = {};
    assert.strictEqual((new palikka.Eventizer(obj))._listeners, obj);
    assert.strictEqual(palikka.eventize(null, obj)._listeners, obj);
    assert.strictEqual(palikka.eventize({}, obj)._listeners, obj);

  });

  Q.test('Eventizer - Chainability', function (assert) {

    assert.expect(12);

    /** Eventizer methods should be chainable. */
    var tests = function (hub) {
      assert.strictEqual(hub.on('a'), hub);
      assert.strictEqual(hub.one('a'), hub);
      assert.strictEqual(hub.off('a'), hub);
      assert.strictEqual(hub.emit('a'), hub);
    };

    tests(palikka.eventize());
    tests(palikka.eventize({}));
    tests(new palikka.Eventizer());

  });

  Q.test('Eventizer - Synchronous execution', function (assert) {

    assert.expect(2);

    /** .on(), .one(), .off() and .emit() methods should execute synchronously. */
    palikka.eventize()
    .on('a', function () {
      assert.strictEqual(1, 1);
    })
    .one('a', function () {
      assert.strictEqual(1, 1);
    })
    .emit('a')
    .on('a', function () {
      assert.strictEqual(0, 1);
    })
    .one('a', function () {
      assert.strictEqual(0, 1);
    });

  });

  Q.test('Eventizer - Cloned handlers', function (assert) {

    assert.expect(1);

    var array = [];

    /** Emit method should clone the handlers before looping and executing them. */
    palikka.eventize()
    .on('a', function (e) {
      array.push(1);
      this.off('a', e.id).on('a', function () {
        array.push(4);
      });
    })
    .on('a', function (e) {
      array.push(2);
      this.off('a', e.id).on('a', function () {
        array.push(5);
      });
    })
    .on('a', function (e) {
      array.push(3);
      this.off('a', e.id).on('a', function () {
        array.push(6);
      });
    })
    .emit('a')
    .emit('a');

    assert.deepEqual(array, [1,2,3,4,5,6]);

  });

  Q.test('Eventizer - Callback arguments', function (assert) {

    assert.expect(14);

    var cb = function (e, a, b, c) {

      /** There should be four arugments in total. */
      assert.strictEqual(arguments.length, 4);

      /** The first agument should always be an event object which contains the event's name, id and reference to the callback function. */
      assert.strictEqual(e.type, 'a');
      assert.strictEqual(e.fn, cb);
      assert.strictEqual(typeof e.id, 'number');

      /** Test following arguments should be the ones provided via .emit() method. */
      assert.strictEqual(a, 1);
      assert.strictEqual(b, 2);
      assert.strictEqual(c, 3);

    };

    palikka.eventize()
    .on('a', cb)
    .one('a', cb)
    .emit('a', [1, 2, 3]);

  });

  Q.test('Eventizer - Function context', function (assert) {

    assert.expect(24);

    var
    ctxA = {},
    ctxB = {},
    tests = function (hub) {

      /* By default the context (this) should be the object that called the method. */
      hub
      .on('a', function () {
        assert.strictEqual(this, hub);
      })
      .one('a', function () {
        assert.strictEqual(this, hub);
      })
      .emit('a')
      .off('a');

      /* .on() and .one() methods should be able to change the context. */
      hub
      .on('a', function () {
        assert.strictEqual(this, ctxA);
      }, ctxA)
      .one('a', function () {
        assert.strictEqual(this, ctxA);
      }, ctxA)
      .emit('a')
      .off('a');

      /* .emit() method should be able to change the context. */
      hub
      .on('a', function () {
        assert.strictEqual(this, ctxA);
      })
      .one('a', function () {
        assert.strictEqual(this, ctxA);
      })
      .emit('a', [], ctxA)
      .off('a');

      /* .emit() method should be able to override .on() and .one() methods' bound context. */
      hub
      .on('a', function () {
        assert.strictEqual(this, ctxB);
      }, ctxA)
      .one('a', function () {
        assert.strictEqual(this, ctxB);
      }, ctxA)
      .emit('a', [], ctxB)
      .off('a');

    };

    tests(new palikka.Eventizer());
    tests(palikka.eventize());
    tests(palikka.eventize({}));

  });

  Q.test('Eventizer - Unbind all event listeners (event type based unbind)', function (assert) {

    assert.expect(0);

    palikka.eventize()
    .on('a', function () {
      assert.strictEqual(1, 0);
    })
    .on('a', function () {
      assert.strictEqual(1, 0);
    })
    .on('a', function () {
      assert.strictEqual(1, 0);
    })
    .off('a')
    .emit('a');

  });

  Q.test('Eventizer - Unbind multiple identical listeners (callback based unbind)', function (assert) {

    assert.expect(6);

    var
    eHub = palikka.eventize(),
    args = [1, 2, 3, 4, 5],
    cb = function (ev, a1, a2, a3, a4, a5) {
      assert.deepEqual(args, [a1, a2, a3, a4, a5]);
    };

    eHub
    .on('a', cb)
    .on('a', cb)
    .on('a', cb)
    .emit('a', args)
    .emit('a', args)
    .off('a', cb)
    .emit('a', args);

  });

  Q.test('Eventizer - Unbind a single listener (id based unbind)', function (assert) {

    assert.expect(6);

    var
    eHub = palikka.eventize(),
    id  = null,
    cb = function (ev) {
      id = ev.id;
      assert.strictEqual(1, 1);
    };

    eHub
    .on('a', cb)
    .on('a', cb)
    .on('a', cb)
    .emit('a')
    .off('a', id)
    .emit('a')
    .off('a', id)
    .emit('a')
    .off('a', id)
    .emit('a');

  });

  Q.test('Eventizer - Automatic unbinding with .one()', function (assert) {

    assert.expect(1);

    var
    eHub = palikka.eventize();

    eHub
    .one('a', function () {
      assert.strictEqual(1, 1);
    })
    .emit('a')
    .emit('a');

  });

  Q.test('Deferred - Prototype properties', function (assert) {

    assert.expect(11);

    assert.strictEqual(typeof palikka.Deferred.prototype.inspect, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.state, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.result, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.resolve, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.reject, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onFulfilled, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onRejected, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onSettled, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.then, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.spread, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.and, 'function');

  });

  Q.test('Deferred - Instance creation', function (assert) {

    assert.expect(6);

    /** Constructor should return a palikka.Deferred instance. */
    var y = new palikka.Deferred(function () {});
    assert.strictEqual(y instanceof palikka.Deferred, true);
    assert.strictEqual(y.state(), 'pending');

    /** Constructor callback should be optional. */
    var x = new palikka.Deferred();
    assert.strictEqual(x instanceof palikka.Deferred, true);
    assert.strictEqual(x.state(), 'pending');

    /** Shorthand instance creation. */
    var z = palikka.defer();
    assert.strictEqual(z instanceof palikka.Deferred, true);
    assert.strictEqual(z.state(), 'pending');

  });

  Q.test('Deferred - Asynchronous test', function (assert) {

    var done = assert.async();
    assert.expect(1);

    var test = [];

    palikka
    .defer()
    .resolve()
    .onFulfilled(function () {
      test.push(1);
    });

    test.push(2);

    palikka
    .defer()
    .reject()
    .onRejected(function () {
      test.push(3);
    });

    test.push(4);

    palikka
    .defer()
    .resolve()
    .then(function () {
      test.push(5);
    });

    test.push(6);

    palikka
    .defer()
    .reject()
    .then(null, function () {
      test.push(7);
      assert.deepEqual(test, [2, 4, 6, 8, 1, 3, 5, 7]);
      done();
    })
    .resolve();

    test.push(8);

  });

  Q.test('Deferred - Synchronous test', function (assert) {

    assert.expect(1);

    var test = [];

    palikka.config.asyncDeferreds = false;

    palikka
    .defer()
    .resolve()
    .onFulfilled(function () {
      test.push(1);
    });

    test.push(2);

    palikka
    .defer()
    .reject()
    .onRejected(function () {
      test.push(3);
    });

    test.push(4);

    palikka
    .defer()
    .resolve()
    .then(function () {
      test.push(5);
    });

    test.push(6);

    palikka
    .defer()
    .reject()
    .then(null, function () {
      test.push(7);
    })
    .resolve();

    test.push(8);

    assert.deepEqual(test, [1, 2, 3, 4, 5, 6, 7, 8]);

    palikka.config.asyncDeferreds = true;

  });

  Q.test('Deferred - Arguments and context of constructor', function (assert) {

    var done = assert.async();
    assert.expect(4);

    new palikka.Deferred(function (resolve, reject, fake) {

      /** "this" keyword should refer to global scope. */
      assert.strictEqual(this === window, true);

      /** First argument type should be a function. */
      assert.strictEqual(typeof resolve, 'function');

      /** Second argument type should be a function. */
      assert.strictEqual(typeof reject, 'function');

      /* There should be only two arguents available.  */
      assert.strictEqual(arguments.length, 2);

    });

    window.setTimeout(done, 1000);

  });

  Q.test('Deferred - Arguments and context of instance callbacks', function (assert) {

    var done = assert.async();
    assert.expect(12);

    var x = new palikka.Deferred();
    var y = new palikka.Deferred();

    x
    .resolve(1, 2, 3)
    .onFulfilled(function () {

      /** "this" keyword should refer to global scope. */
      assert.strictEqual(this === window, true);

      /** There should only be one argument. */
      assert.strictEqual(arguments.length, 1);

      /** The argument should be the first value of resolve function. */
      assert.strictEqual(arguments[0], 1);

    })
    .onRejected(function () {

      /** onRejected should not be called on fulfillment. */
      assert.strictEqual(true, false);

    })
    .onSettled(function () {

      /** "this" keyword should refer to global scope. */
      assert.strictEqual(this, window);

      /** There should only be one argument. */
      assert.strictEqual(arguments.length, 1);

      /** The argument should be the first value of resolve function. */
      assert.strictEqual(arguments[0], 1);

    });

    y
    .reject(1, 2, 3)
    .onFulfilled(function () {

      /** onFulfilled should not be called on rejection. */
      assert.strictEqual(true, false);

    })
    .onRejected(function () {

      /** "this" keyword should refer to global scope. */
      assert.strictEqual(this, window);

      /** There should only be one argument. */
      assert.strictEqual(arguments.length, 1);

      /** The argument should be the first value of resolve function. */
      assert.strictEqual(arguments[0], 1);

    })
    .onSettled(function () {

      /** "this" keyword should refer to global scope. */
      assert.strictEqual(this, window);

      /** There should only be one argument. */
      assert.strictEqual(arguments.length, 1);

      /** The argument should be the first value of resolve function. */
      assert.strictEqual(arguments[0], 1);;

    });

    window.setTimeout(done, 1000);

  });

  Q.test('Deferred - Resolve with another deferred', function (assert) {

    var done = assert.async();
    assert.expect(2);

    (new palikka.Deferred())
    .resolve(new palikka.Deferred(function (resolve) {

      resolve('a');

    }))
    .onFulfilled(
      function (val) {

        assert.strictEqual(val, 'a');

      }
    );

    (new palikka.Deferred())
    .resolve(new palikka.Deferred(function (resolve, reject) {

      reject('a');

    }))
    .onRejected(
      function (reason) {

        assert.strictEqual(reason, 'a');
        done();

      }
    );

  });

  Q.test('Deferred - .inspect()', function (assert) {

    var done = assert.async();
    assert.expect(2);

    var
    d = palikka.defer(),
    inspectA = d.inspect(),
    inspectB = d.resolve().inspect();

    assert.deepEqual(inspectA, {
      state: 'pending',
      result: undefined,
      async: true,
      locked: false
    });

    assert.deepEqual(inspectB, {
      state: 'fulfilled',
      result: undefined,
      async: true,
      locked: true
    });

    d.then(function () {
      done();
    });

  });

  Q.test('Deferred - .then()', function (assert) {

    var done = assert.async();
    assert.expect(21);

    // Test success callback execution, context and arguments.
    (new palikka.Deferred())
    .resolve()
    .then(
      function (val) {

        assert.strictEqual(this, window);
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(val, undefined);

      },
      function () {

        assert.strictEqual(1, 0);

      }
    );

    // Test success callback arguments.
    (new palikka.Deferred())
    .resolve(1, 2, 3)
    .then(function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(val, 1);

    });

    /** Test fail callback execution, context and arguments. */
    (new palikka.Deferred())
    .reject()
    .then(
      function () {

        assert.strictEqual(1, 0);

      },
      function (val) {

        assert.strictEqual(this, window);
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(val, undefined);

      }
    );

    /** Test fail callback arguments. */
    (new palikka.Deferred())
    .reject(1,2,3)
    .then(null, function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(val, 1);

    });

    /** Test chaining. */
    var a = new palikka.Deferred();
    var b = a.then();
    var c = b.then();
    assert.strictEqual(b instanceof palikka.Deferred, true);
    assert.strictEqual(c instanceof palikka.Deferred, true);
    assert.strictEqual(b !== a, true);
    assert.strictEqual(c !== b, true);

    /** Test resolving with self. */
    a.resolve(a)
    .onRejected(function (reason) {
      assert.strictEqual(palikka.typeOf(reason), 'error');
    });

    /** Test success catching. */
    (new palikka.Deferred())
    .resolve('a')
    .then()
    .then()
    .then(function (val) {
      assert.strictEqual(val, 'a');
    });

    /** Test error throwing and catching. */
    (new palikka.Deferred())
    .resolve()
    .then(function () {

      /** Here we go... */
      throw Error('error-1');

    })
    .then(function () {

      /** Success callback should not be fired before error is caught. */
      assert.strictEqual(1, 0);

    })
    .then(null, function (reason) {

      /** Fail callback should catch the error. */
      assert.strictEqual(reason.message, 'error-1');

    })
    .then(function () {

      /** Success callback should be fired after error is caught. */
      assert.strictEqual(1, 1);

      /** Let's throw another error. */
      throw Error('error-2');

    }, function () {

      /** Fail callback should not be fired after error is caught, unless new error is thrown. */
      assert.strictEqual(1, 0);

    })
    .then(null, function (reason) {

      /** Fail callback should catch the error. */
      assert.strictEqual(reason.message, 'error-2');

      /** Throw new error within fail callback. */
      throw Error('error-3');

    })
    .then(function () {

      /** Success callback should not be fired before error is caught. */
      assert.strictEqual(1, 0);

    })
    .then(function () {

      /** Success callback should not be fired before error is caught. */
      assert.strictEqual(1, 0);

    })
    .onRejected(function (reason) {

      /** onRejected callback should NOT catch the error, but it should be able to "see" it before it falls down the then chain. */
      assert.strictEqual(reason.message, 'error-3');

    })
    .then(null, function (reason) {

      /** Fail callback should catch the error. */
      assert.strictEqual(reason.message, 'error-3');

    });

    setTimeout(function () {
      done();
    }, 1000);

  });

  Q.test('Deferred - .spread()', function (assert) {

    var done = assert.async();
    assert.expect(8);

    palikka
    .defer()
    .resolve([1, 2])
    .spread(function (a, b) {

      assert.strictEqual(arguments.length, 2);
      assert.strictEqual(a, 1);
      assert.strictEqual(b, 2);

      throw [1, 2];

    })
    .spread(null, function (a, b) {

      assert.strictEqual(arguments.length, 2);
      assert.strictEqual(a, 1);
      assert.strictEqual(b, 2);

    })
    .spread(function (a) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(a, undefined);
      done();

    });

  });

  Q.test('Deferred - .isLocked()', function (assert) {

    assert.expect(4);

    var d1 = palikka.defer();
    var d2 = palikka.defer();

    assert.strictEqual(d1.isLocked(), false);
    d1.resolve();
    assert.strictEqual(d1.isLocked(), true);

    assert.strictEqual(d2.isLocked(), false);
    d2.reject();
    assert.strictEqual(d2.isLocked(), true);

  });

  Q.test('Deferred - .async() / .sync() / .isAsync()', function (assert) {

    assert.expect(3);

    var d1 = palikka.defer();

    assert.strictEqual(d1.isAsync(), true);
    d1.sync();
    assert.strictEqual(d1.isAsync(), false);
    d1.async();
    assert.strictEqual(d1.isAsync(), true);

  });

  Q.test('Deferred - .when()', function (assert) {

    var done = assert.async();
    assert.expect(8);

    /** .when() should always return Deferred instance.  */
    assert.strictEqual(palikka.when([]) instanceof palikka.Deferred, true);

    /** .when() should throw an error if the first argument is not an array. */
    assert.throws(function() {
      palikka.when();
    });

    /** .when() deferred's result should be an empty array when an empty array is provided as the first argument. */
    palikka.when([]).onFulfilled(function (val) {
      assert.strictEqual(val.length, 0);
    });

    /** .when() method's first argument should accept an array with any type of values within it and promisify all non-Deferred values. */
    palikka
    .when([1, '2', {'a': 'a'}, ['a', 'b'], palikka.defer().resolve(null)])
    .onFulfilled(function (val) {

      assert.strictEqual(val[0], 1);
      assert.strictEqual(val[1], '2');
      assert.deepEqual(val[2], {'a': 'a'});
      assert.deepEqual(val[3], ['a', 'b']);
      assert.strictEqual(val[4], null);

    });

    setTimeout(function () {
      done();
    }, 1000);

  });

  Q.test('Deferred - .and()', function (assert) {

    var done = assert.async();
    assert.expect(28);

    var
    d1 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        resolve('a');
      }, 1500);
    }),
    d2 = new palikka.Deferred(function (resolve, reject) {
      resolve('b');
    }),
    d3 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        reject('fail-1');
      }, 500);
    }),
    d4 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        reject('fail-2');
      }, 1000);
    }),
    m1 = d1.and([d2]),
    m2 = d1.and([d2, d3]),
    m3 = d1.and([d2, d3, d4]),
    m4 = d1.and([d2, d3, d4], true, true),
    m5 = d1.and([d2, d3, d4], false, false);

    m1.onFulfilled(function (val) {

      assert.strictEqual(d1.state(), 'fulfilled');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(val[0], 'a');
      assert.strictEqual(val[1], 'b');

    });

    m2.onRejected(function (reason) {

      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(reason, 'fail-1');

    });

    m3.onRejected(function (reason) {

      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(d4.state(), 'pending');
      assert.strictEqual(reason, 'fail-1');

    });

    m4.onFulfilled(function (val) {

      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'pending');
      assert.strictEqual(d4.state(), 'pending');
      assert.strictEqual(val[0], 'b');

    });

    m5.onRejected(function (reason) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(d1.state(), 'fulfilled');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(d4.state(), 'rejected');
      assert.strictEqual(reason.length, 4);
      assert.deepEqual(reason[0], d1.inspect());
      assert.deepEqual(reason[1], d2.inspect());
      assert.deepEqual(reason[2], d3.inspect());
      assert.deepEqual(reason[3], d4.inspect());

    });

    palikka.when([m1, m2, m3, m4, m5], false, false).onSettled(function () {
      done();
    });

  });

  Q.test('Type checker', function (assert) {

    assert.expect(24);

    /** Primitive (immutable) values */

    assert.strictEqual(palikka.typeOf(null), 'null');
    assert.strictEqual(palikka.typeOf(undefined), 'undefined');
    assert.strictEqual(palikka.typeOf(true), 'boolean');
    assert.strictEqual(palikka.typeOf(false), 'boolean');
    assert.strictEqual(palikka.typeOf(new Boolean()), 'boolean');
    assert.strictEqual(palikka.typeOf(''), 'string');
    assert.strictEqual(palikka.typeOf('1'), 'string');
    assert.strictEqual(palikka.typeOf(new String()), 'string');
    assert.strictEqual(palikka.typeOf(-1), 'number');
    assert.strictEqual(palikka.typeOf(0), 'number');
    assert.strictEqual(palikka.typeOf(1), 'number');
    assert.strictEqual(palikka.typeOf(NaN), 'number');
    assert.strictEqual(palikka.typeOf(Infinity), 'number');
    assert.strictEqual(palikka.typeOf(new Number()), 'number');
    if (window.Symbol) {
      assert.strictEqual(palikka.typeOf(Symbol()), 'symbol');
    }
    else {
      assert.strictEqual(true, true);
    }

    /** Objects */

    assert.strictEqual(palikka.typeOf({}), 'object');
    assert.strictEqual(palikka.typeOf(new Object()), 'object');

    assert.strictEqual(palikka.typeOf([]), 'array');
    assert.strictEqual(palikka.typeOf(new Array()), 'array');

    assert.strictEqual(palikka.typeOf(function () {}), 'function');
    assert.strictEqual(palikka.typeOf(new Function()), 'function');

    assert.strictEqual(palikka.typeOf(new Date()), 'date');

    /** Specials */

    assert.strictEqual(palikka.typeOf(JSON), 'json');
    assert.strictEqual(palikka.typeOf(arguments), 'arguments');

    /** DOM... (frowns)... later... */

  });

  Q.test('Next tick - Chainability', function (assert) {

    assert.expect(1);

    /** .nextTick() should return palikka object. */
    assert.strictEqual(palikka.nextTick(function () {}), palikka);

  });

  Q.test('Next tick - Arguments', function (assert) {

    assert.expect(4);

    /** Providing non-function values should fail silently. */
    assert.strictEqual(palikka.nextTick(), palikka);
    assert.strictEqual(palikka.nextTick(1), palikka);
    assert.strictEqual(palikka.nextTick('a'), palikka);
    assert.strictEqual(palikka.nextTick({}), palikka);

  });

  Q.test('Next tick - Execution order', function (assert) {

    var done = assert.async();
    assert.expect(1);

    var test = [];

    palikka.nextTick(function () {

      test.push(2);

      palikka.nextTick(function () {

        test.push(5);

        palikka.nextTick(function () {

          palikka.nextTick(function () {

            palikka.nextTick(function () {

              test.push(10);

              assert.deepEqual(test, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

              done();

            });

          });

        });

      });

    });

    palikka.nextTick(function () {

      test.push(3);

      palikka.nextTick(function () {

        test.push(6);

        palikka.nextTick(function () {

          palikka.nextTick(function () {

            test.push(9);

          });

        });

      });

    });

    palikka.nextTick(function () {

      test.push(4);

      palikka.nextTick(function () {

        test.push(7);

          palikka.nextTick(function () {

            test.push(8);

          });

      });


    });

    test.push(1);

  });

})(QUnit);