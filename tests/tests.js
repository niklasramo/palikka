(function (Q) {

  /**
   * Configuration.
   */

  QUnit.config.reorder = false;

  /**
   * Tests.
   */

  Q.test('Modules.', function (assert) {

    assert.expect(42);
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
    m1Data = palikka._getModules(m1);

    /** Module data id should always be an array. */
    assert.strictEqual(m1Data.id, m1);

    /** Module state should not be ready before initiation. */
    assert.strictEqual(m1Data.ready, false);

    /** Module data value should always be undefined before factory is processed. */
    assert.strictEqual(m1Data.value, undefined);

    /** Module data dependencies should always be an array. */
    assert.strictEqual(m1Data.dependencies instanceof Array, true);

    /** Factory function should be called asynchronously. */
    assert.strictEqual(asyncTest, false);

    /** Require a single module. */
    palikka.require(m1, function (a) {

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

    /** Check that data matches. */
    window.setTimeout(function () {

      var
      m1Data = palikka._getModules(m1),
      m2Data = palikka._getModules(m2),
      m3Data = palikka._getModules(m3),
      m4Data = palikka._getModules(m4),
      m5Data = palikka._getModules(m5);

      /** Check module values. */
      assert.strictEqual(m1Data.value, m1Val);
      assert.strictEqual(m2Data.value, m2Val);
      assert.strictEqual(m3Data.value, m3Val);
      assert.strictEqual(m4Data.value, m4Val);
      assert.strictEqual(m5Data.value, m5Val);

      /** Check module states. */
      assert.strictEqual(m1Data.ready, true);
      assert.strictEqual(m2Data.ready, true);
      assert.strictEqual(m3Data.ready, true);
      assert.strictEqual(m4Data.ready, true);
      assert.strictEqual(m5Data.ready, true);

      /** Smoke test for getModules without value. */
      assert.strictEqual(typeof palikka._getModules(), 'object');

    }, 200);

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

    window.setTimeout(done, 1000);

  });

  Q.test('Modules - asynchronous test.', function (assert) {

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

  Q.test('Modules - synchronous test.', function (assert) {

    assert.expect(1);

    var test = [];

    palikka._config.asyncModules = false;

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

    palikka._config.asyncModules = true;

  });

  Q.test('Eventizer', function (assert) {

    var done = assert.async();
    assert.expect(18);

    var
    obj = {},
    evA = palikka.eventize(obj),
    evB = new palikka.Eventizer();

    /** Eventizing an object should return the same object that was eventized. */
    assert.strictEqual(evA instanceof palikka.Eventizer, false);
    assert.strictEqual(evA, obj);
    assert.strictEqual(palikka.eventize() instanceof palikka.Eventizer, true);

    /** Creating a new Eventizer instance should return an Eventizer instance. */
    assert.strictEqual(evB instanceof palikka.Eventizer, true);

    /** Eventizer instance methods should be chainable. */
    assert.strictEqual(evA.on('chainable'), evA);
    assert.strictEqual(evA.one('chainable'), evA);
    assert.strictEqual(evA.off('chainable'), evA);
    assert.strictEqual(evA.emit('chainable'), evA);
    assert.strictEqual(evA.emitAsync('chainable'), evA);

    /** on/off/emit should be synchronous. */
    evA
    .on('ev-1', function (e, a, b, c) {

      /** The first agument should always be an event object which contains the event's name and reference to the callback function. */
      assert.strictEqual(typeof e.type, 'string');
      assert.strictEqual(typeof e.fn, 'function');

      /** Test the arguments. */
      assert.strictEqual(arguments.length, 4);
      assert.strictEqual(a, 1);
      assert.strictEqual(b, 2);
      assert.strictEqual(c, 3);

      /** "this" should always refer to the object where to method is attached to, unless specifically set otherwise in emit method. */
      assert.strictEqual(this, evA);

      /** Unbind the event and emit again. */
      this.off(e.type, e.fn).emit('ev-1');

    })
    .emit('ev-1', [1, 2, 3])
    .on('ev-1', function () {
      assert.strictEqual(0, 1);
    });

    /** Callback context should be customizable via emit method. */
    evA
    .on('ev-2', function () {

      assert.strictEqual(arguments.length, 1);
      assert.equal(this, 'ev-2-context');

    })
    .emit('ev-2', [], 'ev-2-context');

    /** Unbind all events for a specified type at once when using off method without specifying a callback function. */
    evA
    .on('ev-3', function () {

      assert.strictEqual(1, 0);

    })
    .on('ev-3', function () {

      assert.strictEqual(1, 0);

    })
    .on('ev-3', function () {

      assert.strictEqual(1, 0);

    })
    .off('ev-3')
    .emit('ev-3');

    window.setTimeout(done, 1000);

  });

  Q.test('Eventizer - Automatic unbinding with ".one()".', function (assert) {

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

  Q.test('Eventizer - Asynchronous emit.', function (assert) {

    var done = assert.async();
    assert.expect(1);

    var
    eHub = palikka.eventize(),
    test = [];

    test.push(1);

    eHub.emitAsync('a');

    test.push(2);

    eHub.on('a', function () {

      test.push(3);

    });

    test.push(4);

    eHub.one('a', function () {

      test.push(5);
      assert.deepEqual(test, [1, 2, 4, 6, 3, 5]);
      done();

    });

    test.push(6);

  });

  Q.test('Eventizer - Bind/unbind multiple identical listeners (callback based unbind).', function (assert) {

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

  Q.test('Eventizer - Unbind a single listener (id based unbind).', function (assert) {

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

  Q.test('Deferred - Prototype properties.', function (assert) {

    assert.expect(9);

    assert.strictEqual(typeof palikka.Deferred.prototype.state, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.result, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.resolve, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.reject, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onFulfilled, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onRejected, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.onSettled, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.then, 'function');
    assert.strictEqual(typeof palikka.Deferred.prototype.and, 'function');

  });

  Q.test('Deferred - Instance creation.', function (assert) {

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

  Q.test('Deferred - asynchronous test.', function (assert) {

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

  Q.test('Deferred - synchronous test.', function (assert) {

    assert.expect(1);

    var test = [];

    palikka._config.asyncDeferreds = false;

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

    palikka._config.asyncDeferreds = true;

  });

  Q.test('Deferred - Arguments and context of constructor.', function (assert) {

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

  Q.test('Deferred - Arguments and context of instance callbacks.', function (assert) {

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

  Q.test('Deferred - resolve with another deferred.', function (assert) {

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

  Q.test('Deferred - then.', function (assert) {

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
      assert.strictEqual(palikka._typeOf(reason), 'error');
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

  Q.test('Deferred - when/and.', function (assert) {

    var done = assert.async();
    assert.expect(40);

    var
    d1 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        resolve('a');
      }, 500);
    }),
    d2 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        resolve('b');
      }, 100);
    }),
    d3 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        reject('fail-1');
      }, 300);
    }),
    d4 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        reject('fail-2');
      }, 400);
    }),
    m1 = d1.and([d2]),
    m2 = d1.and([d2, d3]),
    m3 = d1.and([d2, d3, d4]),
    m4 = d1.and([d2, d3, d4], true, true),
    m5 = d1.and([d2, d3, d4], false, false);

    /** Make sure master's returns deferred instance. */
    assert.strictEqual(m1 instanceof palikka.Deferred, true);
    assert.strictEqual(m2 instanceof palikka.Deferred, true);
    assert.strictEqual(m3 instanceof palikka.Deferred, true);
    assert.strictEqual(m4 instanceof palikka.Deferred, true);
    assert.strictEqual(m5 instanceof palikka.Deferred, true);

    palikka
    .when([])
    .onFulfilled(function (val) {

      assert.strictEqual(val.length, 0);

    });

    palikka
    .when([1, '2', {'a': 'a'}, ['a', 'b']])
    .onFulfilled(function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(val[0], 1);
      assert.strictEqual(val[1], '2');
      assert.strictEqual(val[2]['a'], 'a');
      assert.strictEqual(val[3][0], 'a');
      assert.strictEqual(val[3][1], 'b');

    });

    m1.onFulfilled(function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(d1.state(), 'fulfilled');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(val[0], 'a');
      assert.strictEqual(val[1], 'b');

    });

    m2.onRejected(function (reason) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(reason, 'fail-1');

    });

    m3.onRejected(function (reason) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'fulfilled');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(d4.state(), 'pending');
      assert.strictEqual(reason, 'fail-1');

    });

    m4.onFulfilled(function (val) {

      assert.strictEqual(arguments.length, 1);
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
      assert.strictEqual(reason, 'fail-1');

    });

    setTimeout(function () {
      done();
    }, 1000);

  });

  Q.test('Utils - _typeOf', function (assert) {

    assert.expect(24);

    /** Primitive (immutable) values */

    assert.strictEqual(palikka._typeOf(null), 'null');
    assert.strictEqual(palikka._typeOf(undefined), 'undefined');
    assert.strictEqual(palikka._typeOf(true), 'boolean');
    assert.strictEqual(palikka._typeOf(false), 'boolean');
    assert.strictEqual(palikka._typeOf(new Boolean()), 'boolean');
    assert.strictEqual(palikka._typeOf(''), 'string');
    assert.strictEqual(palikka._typeOf('1'), 'string');
    assert.strictEqual(palikka._typeOf(new String()), 'string');
    assert.strictEqual(palikka._typeOf(-1), 'number');
    assert.strictEqual(palikka._typeOf(0), 'number');
    assert.strictEqual(palikka._typeOf(1), 'number');
    assert.strictEqual(palikka._typeOf(NaN), 'number');
    assert.strictEqual(palikka._typeOf(Infinity), 'number');
    assert.strictEqual(palikka._typeOf(new Number()), 'number');
    if (window.Symbol) {
      assert.strictEqual(palikka._typeOf(Symbol()), 'symbol');
    }
    else {
      assert.strictEqual(true, true);
    }

    /** Objects */

    assert.strictEqual(palikka._typeOf({}), 'object');
    assert.strictEqual(palikka._typeOf(new Object()), 'object');

    assert.strictEqual(palikka._typeOf([]), 'array');
    assert.strictEqual(palikka._typeOf(new Array()), 'array');

    assert.strictEqual(palikka._typeOf(function () {}), 'function');
    assert.strictEqual(palikka._typeOf(new Function()), 'function');

    assert.strictEqual(palikka._typeOf(new Date()), 'date');

    /** Specials */

    assert.strictEqual(palikka._typeOf(JSON), 'json');
    assert.strictEqual(palikka._typeOf(arguments), 'arguments');

    /** DOM... (frowns)... later... */

  });

  Q.test('Utils - _nextTick', function (assert) {

    var done = assert.async();
    assert.expect(1);

    var test = [];

    palikka._nextTick(function () {

      test.push(2);

      palikka._nextTick(function () {

        test.push(5);

        palikka._nextTick(function () {

          palikka._nextTick(function () {

            palikka._nextTick(function () {

              test.push(10);

              assert.deepEqual(test, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

              done();

            });

          });

        });

      });

    });

    palikka._nextTick(function () {

      test.push(3);

      palikka._nextTick(function () {

        test.push(6);

        palikka._nextTick(function () {

          palikka._nextTick(function () {

            test.push(9);

          });

        });

      });

    });

    palikka._nextTick(function () {

      test.push(4);

      palikka._nextTick(function () {

        test.push(7);

          palikka._nextTick(function () {

            test.push(8);

          });

      });


    });

    test.push(1);

  });

})(QUnit);