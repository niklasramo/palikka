(function (Q) {

  /**
   * Configuration.
   */

  QUnit.config.reorder = false;

  Q.testStart(function () {

    var prop;

    /** Reset modules. */
    for (prop in palikka._modules) {
      if (palikka._modules.hasOwnProperty(prop)) {
        delete palikka._modules[prop];
      }
    }

    /** Reset listeners. */
    for (prop in palikka._listeners) {
      if (palikka._listeners.hasOwnProperty(prop)) {
        delete palikka._listeners[prop];
      }
    }

  });

  /**
   * Helper functions.
   */

  function getModuleValue(moduleId) {

    return palikka._modules[moduleId].value;

  }

  /**
   * Tests.
   */

  Q.module('.define()');

  Q.test('Function as factory argument.', function (assert) {

    assert.expect(1);

    palikka.define('a', function () {
      return 'a';
    });
    assert.strictEqual(getModuleValue('a'), 'a');

  });

  Q.test('Object as factory argument.', function (assert) {

    assert.expect(1);

    palikka.define('a', {text: 'a'});
    assert.strictEqual(getModuleValue('a').text, 'a');

  });

  Q.test('Defining multiple modules.', function (assert) {

    assert.expect(8);

    window.foo = 'foo';
    window.bar = 'bar';
    var obj = {a: 'a', b: 'b'};

    palikka.define(['a', 'b'], ['foo', 'bar'], function (foo, bar) {
      assert.strictEqual(foo, 'foo');
      assert.strictEqual(bar, 'bar');
      return obj[this.id];
    });

    palikka.define(['foo', 'bar'], function() {
      return window[this.id];
    });

    palikka.require(['foo', 'bar', 'a', 'b'], function (foo, bar, a, b) {
      assert.strictEqual(foo, 'foo');
      assert.strictEqual(bar, 'bar');
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
    });

  });

  Q.test('Dependencies argument.', function (assert) {

    assert.expect(8);

    /** Dependencies as an array. */

    palikka.define('a', ['b', 'c'], function (b, c) {
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      return 'a';
    });

    assert.strictEqual(getModuleValue('a'), undefined);

    /** Dependency as a string. */

    palikka.define('b', 'c', function (c) {
      assert.strictEqual(c, 'c');
      return 'b';
    });

    assert.strictEqual(getModuleValue('b'), undefined);

    /** No dependencies. */

    palikka.define('c', function () {
      return 'c';
    });

    assert.strictEqual(getModuleValue('c'), 'c');
    assert.strictEqual(getModuleValue('b'), 'b');
    assert.strictEqual(getModuleValue('a'), 'a');

  });

  Q.test('Async module initiation.', function (assert) {

    var done = assert.async();
    assert.expect(12);

    palikka.define(
      'a',
      ['b', 'c'],
      function (b, c) {
        var init = this.async();
        assert.strictEqual(b, 'b');
        assert.strictEqual(c, 'c');
        setTimeout(function () {
          init('a');
        }, 1000);
      }
    );

    assert.strictEqual(getModuleValue('a'), undefined);

    palikka.define(
      'b',
      'c',
      function (c) {
        var init = this.async();
        assert.strictEqual(c, 'c');
        setTimeout(function () {
          init('b');
        }, 1000);
      }
    );

    assert.strictEqual(getModuleValue('b'), undefined);

    palikka.define(
      'c',
      function () {
        var init = this.async();
        setTimeout(function () {
          init('c');
        }, 1000);
      }
    );

    assert.strictEqual(getModuleValue('c'), undefined);

    setTimeout(function () {
      assert.strictEqual(getModuleValue('a'), undefined);
      assert.strictEqual(getModuleValue('b'), undefined);
      assert.strictEqual(getModuleValue('c'), 'c');
    }, 1500);

    setTimeout(function () {
      assert.strictEqual(getModuleValue('a'), undefined);
      assert.strictEqual(getModuleValue('b'), 'b');
    }, 2500);

    setTimeout(function () {
      assert.strictEqual(getModuleValue('a'), 'a');
      done();
    }, 3500);

  });

  Q.test('Define factory context.', function (assert) {

    assert.expect(11);

    var
    moduleIds = ['a', 'b', 'c'],
    i = 0;

    palikka.define(['a', 'b', 'c'], ['e'], function () {

      assert.strictEqual(this.id, moduleIds[i]);
      assert.strictEqual(this.dependencies.e === 'eVal', true);
      assert.strictEqual(typeof this.async === 'function', true);

      ++i;

      return this.id + 'Val';
    });

    palikka.define('e', function () {

      assert.strictEqual(this.id, 'e');
      assert.strictEqual(typeof this.dependencies === 'object', true);

      return this.id + 'Val';

    });

  });

  Q.test('Internal module registration and initiation logic.', function (assert) {

    var done = assert.async();
    assert.expect(2);

    palikka.define(
      'a',
      function () {
        var init = this.async();
        setTimeout(function () {
          init('a');
        }, 500);
      }
    );

    assert.strictEqual(palikka._modules.a.loaded, false);
    setTimeout(function () {
      assert.strictEqual(palikka._modules.a.loaded, true);
      done();
    }, 1000);

  });

  Q.test('Return values of successful and failed definitions.', function (assert) {

    assert.expect(7);

    var success = palikka.define('a', {});
    var successMultiple = palikka.define(['b', 'c'], {});
    var fail = palikka.define('d');

    assert.strictEqual(success instanceof Array, true);
    assert.strictEqual(successMultiple instanceof Array, true);
    assert.strictEqual(fail instanceof Array, true);
    assert.strictEqual(success[0].id, 'a');
    assert.strictEqual(successMultiple[0].id, 'b');
    assert.strictEqual(successMultiple[1].id, 'c');
    assert.strictEqual(fail[0], undefined);

  });

  Q.test('Overriding modules.', function (assert) {

    var done = assert.async();
    assert.expect(3);

    palikka.define('a', function () { return 'a1'; });
    palikka.define('a', function () { return 'a2'; });

    assert.strictEqual(getModuleValue('a'), 'a1');

    palikka.define(
      'b',
      function () {
        var init = this.async();
        setTimeout(function () {
          init('b1');
        }, 500);
      }
    );
    palikka.define('b', function () { return 'b2'; });

    assert.strictEqual(getModuleValue('b'), undefined);
    setTimeout(function () {
      assert.strictEqual(getModuleValue('b'), 'b1');
      done();
    }, 1000);

  });

  Q.module('.undefine()');

  Q.test('Undefining locked, unlocked and non-existent module.', function (assert) {

    assert.expect(12);

    palikka.define(['a', 'c', 'd'], 'b', function () {
      return 'a';
    });

    palikka.define('b', function () {
      return 'b';
    });

    var undefLocked = palikka.undefine('b');
    var undefSingle = palikka.undefine('a');
    var undefMultiple = palikka.undefine(['c', 'd']);
    var undefUndefined = palikka.undefine('x');

    /** Make sure that all return an array. */
    assert.strictEqual(undefLocked instanceof Array, true);
    assert.strictEqual(undefSingle instanceof Array, true);
    assert.strictEqual(undefMultiple instanceof Array, true);
    assert.strictEqual(undefUndefined instanceof Array, true);

    /** Locked */
    assert.strictEqual(undefLocked.length === 0 && undefLocked[0] === undefined, true);
    assert.strictEqual(palikka._modules['b'] !== undefined, true);

    /** Unlocked - Single */
    assert.strictEqual(undefSingle.length === 1 && undefSingle[0] === 'a', true);
    assert.strictEqual(palikka._modules['a'] === undefined, true);

    /** Unlocked - Multiple */
    assert.strictEqual(undefMultiple.length === 2 && undefMultiple[0] === 'c' && undefMultiple[1] === 'd', true);
    assert.strictEqual(palikka._modules['c'] === undefined && palikka._modules['d'] === undefined, true);

    /** Undefined */
    assert.strictEqual(undefUndefined.length === 0 && undefUndefined[0] === undefined, true);
    assert.strictEqual(palikka._modules['x'] === undefined, true);

  });

  Q.module('.require()');

  Q.test('Requiring with and without dependencies.', function (assert) {

    var done = assert.async();
    assert.expect(8);

    var test;

    palikka.define('a', function () {
      return 'a';
    });

    palikka.define('b', function () {
      return 'b';
    });

    palikka.define('c', function () {
      return 'c';
    });

    palikka.define(
      'd',
      function () {
        var init = this.async();
        setTimeout(function () {
          init('d');
        }, 500);
      }
    );

    palikka.require(['a', 'b', 'c'], function (a, b, c) {
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
    });

    palikka.require('a', function (a) {
      assert.strictEqual(a, 'a');
    });

    test = true;
    palikka.require(function () {
      test = false;
    });
    assert.strictEqual(test, true);

    test = true;
    palikka.require([], function () {
      test = false;
    });
    assert.strictEqual(test, false);

    test = true;
    palikka.require('d', function (d) {
      test = false;
      assert.strictEqual(d, 'd');
      done();
    });
    assert.strictEqual(test, true);

  });

  Q.module('.typeOf()');

  Q.test('Type checker system.', function (assert) {

    assert.expect(24);

    // Primitive (immutable) values

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

    // Objects

    assert.strictEqual(palikka.typeOf({}), 'object');
    assert.strictEqual(palikka.typeOf(new Object()), 'object');

    assert.strictEqual(palikka.typeOf([]), 'array');
    assert.strictEqual(palikka.typeOf(new Array()), 'array');

    assert.strictEqual(palikka.typeOf(function () {}), 'function');
    assert.strictEqual(palikka.typeOf(new Function()), 'function');

    assert.strictEqual(palikka.typeOf(new Date()), 'date');

    // Specials

    assert.strictEqual(palikka.typeOf(JSON), 'json');
    assert.strictEqual(palikka.typeOf(arguments), 'arguments');

    // DOM (todo)

  });

  Q.module('.Eventizer()');

  Q.test('Event system.', function (assert) {

    /* TODO: context param test */

    var done = assert.async();
    assert.expect(13);

    palikka.define('a', function () {

      var m = {};

      /** Initiate Eventizer using eventize method. */
      palikka.eventize(m);

      /** Initiate another Eventizer using new keyword. */
      m.events = new palikka.Eventizer();

      /** Make sure that eventize method returns a new Eventizer instance when called with no args. */
      var test = palikka.eventize();
      assert.strictEqual(test instanceof palikka.Eventizer, true);

      /** Emit "tick" event with "foo" and "bar" arguments. */
      m.ticker = window.setInterval(function () {
        m.emit('tick', ['foo', 'bar']);
      }, 100);

      /** Emit "tock" event with "foo" and "bar" arguments. */
      m.tocker = window.setInterval(function () {
        m.events.emit('tock', ['foo', 'bar'], ['test']);
      }, 100);

      return m;

    });
    palikka.define('b', ['a'], function (a) {

      var
      m = {},
      counter = 0,
      tickCb = function (ev, foo, bar) {

        assert.strictEqual(this, a);
        assert.strictEqual(ev.type, 'tick');
        assert.strictEqual(ev.fn, tickCb);
        assert.strictEqual(foo, 'foo');
        assert.strictEqual(bar, 'bar');

        /** Unbind specific listener from module a's "tick" event. */
        a.off('tick', ev.fn);

      },
      tockCb = function (ev, foo, bar) {

        assert.strictEqual(this[0], 'test');
        assert.strictEqual(ev.type, 'tock');
        assert.strictEqual(ev.fn, tockCb);
        assert.strictEqual(foo, 'foo');
        assert.strictEqual(bar, 'bar');

        /** Unbind specific listener from module a's "tick" event. */
        a.events.off('tock', ev.fn);

      };

      /** Bind a listener to a's "tick" event. */
      a.on('tick', tickCb);

      /** Bind a listener to a.events' "tock" event. */
      a.events.on('tock', tockCb);

      /** Bind tick event 5 times (to test unbinding all events at once). */
      setTimeout(function () {
        for (var i = 0; i < 5; i++) {
          a.on('tick', function () {});
        }
        assert.strictEqual(a._listeners['tick'].length, 5);
        a.off('tick');
        assert.strictEqual(a._listeners['tick'], undefined);
        a.ticker = clearInterval(a.ticker);
        a.tocker = clearInterval(a.tocker);
        done();
      }, 1000);

      return m;

    });


  });

  Q.module('.Deferred()');

  Q.test('Prototype properties.', function (assert) {

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

  Q.test('Instance creation.', function (assert) {

    assert.expect(2);

    /** Constructor should return a palikka.Deferred instance. */
    var y = new palikka.Deferred(function () {});
    assert.strictEqual(y instanceof palikka.Deferred, true);

    /** Constructor callback should be optional. */
    var x = new palikka.Deferred();
    assert.strictEqual(x instanceof palikka.Deferred, true);

  });

  Q.test('Arguments and context of constructor.', function (assert) {

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

  });

  Q.test('Arguments and context of instance callbacks.', function (assert) {

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
      assert.strictEqual(arguments[0], 1);

    });

  });

  Q.test('Deferred.prototype.then()', function (assert) {

    var done = assert.async();
    assert.expect(14);

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
    .resolve(1,2,3)
    .then(function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(val, 1);

    });

    // Test fail callback execution, context and arguments.
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

    // Test fail callback arguments.
    (new palikka.Deferred())
    .reject(1,2,3)
    .then(null, function (val) {

      assert.strictEqual(arguments.length, 1);
      assert.strictEqual(val, 1);

    });

    // Test chaining.
    var a = new palikka.Deferred();
    var b = a.then();
    var c = b.then();
    assert.strictEqual(b instanceof palikka.Deferred, true);
    assert.strictEqual(c instanceof palikka.Deferred, true);
    assert.strictEqual(b !== a, true);
    assert.strictEqual(c !== b, true);

    // Test error throwing / catching.

    setTimeout(function () {
      done();
    }, 1000);

  });

  Q.test('.when() / Deferred.prototype.and()', function (assert) {

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
    m1 = d1.and(d2),
    m2 = d1.and([d2, d3]),
    m3 = d1.and([d2, d3, d4]),
    m4 = d1.and([d2, d3, d4], true, true),
    m5 = d1.and([d2, d3, d4], false, false);

    // Make sure master's returns deferred instance.
    assert.strictEqual(m1 instanceof palikka.Deferred, true);
    assert.strictEqual(m2 instanceof palikka.Deferred, true);
    assert.strictEqual(m3 instanceof palikka.Deferred, true);
    assert.strictEqual(m4 instanceof palikka.Deferred, true);
    assert.strictEqual(m5 instanceof palikka.Deferred, true);

    palikka
    .when()
    .onFulfilled(function (val) {

      assert.strictEqual(val[0], undefined);

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

})(QUnit);