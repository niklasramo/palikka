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

  Q.module('.on() / .off() / .emit()');

  Q.test('Triggering, binding and unbinding module events.', function (assert) {

    var done = assert.async();
    assert.expect(21);

    var regCb = function (ev, module) {
      assert.strictEqual(this, palikka);
      assert.strictEqual(ev.type, 'register-a');
      assert.strictEqual(ev.fn, regCb);
      assert.strictEqual(palikka._modules['a'], module);
    };

    var regCb2 = function (ev, module) {
      assert.strictEqual(this, palikka);
      assert.strictEqual(ev.type, 'register');
      assert.strictEqual(ev.fn, regCb2);
      assert.strictEqual(palikka._modules['a'], module);
    };

    var initCb = function (ev, module) {
      assert.strictEqual(this, palikka);
      assert.strictEqual(ev.type, 'initiate-a');
      assert.strictEqual(ev.fn, initCb);
      assert.strictEqual(palikka._modules['a'], module);
    };

    var initCb2 = function (ev, module) {
      assert.strictEqual(this, palikka);
      assert.strictEqual(ev.type, 'initiate');
      assert.strictEqual(ev.fn, initCb2);
      assert.strictEqual(palikka._modules['a'], module);
    };

    /** Test binding. */
    palikka.on('register-a', regCb);
    palikka.on('register', regCb2);
    palikka.on('initiate-a', initCb);
    palikka.on('initiate', initCb2);
    palikka.define('a', function () {
      return 'foobar';
    });

    /** Test triggering. */
    palikka.emit('initiate-a', [palikka._modules['a']]);

    /** Test unbinding. */
    palikka.off('initiate-a');
    assert.strictEqual(palikka._listeners['initiate-a'], undefined);

    done();

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
    assert.expect(12);

    palikka.define('a', function () {

      var m = {};

      /** Initiate Eventizer using eventize method. */
      palikka.eventize(m);

      /** Initiate another Eventizer using new keyword. */
      m.events = new palikka.Eventizer();

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

  Q.test('Base deferred system.', function (assert) {

    var done = assert.async();
    assert.expect(50);

    var
    d1 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        resolve('a', 'b', 'c');
      }, 500);
    }),
    d2 = new palikka.Deferred(function (resolve, reject) {
      setTimeout(function () {
        resolve('d');
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
    m1,
    m2,
    m3,
    m4,
    m5;

    // Make sure m1 is not resolved before d1.
    d1.done(function() {
      assert.strictEqual(d1.state(), 'resolved');
      assert.strictEqual(m1.state(), 'pending');
    });

    // Make sure m1 is not resolved before d2.
    d2.done(function() {
      assert.strictEqual(m1.state(), 'pending');
    });

    // Create master deferreds.
    m1 = d1.and(d2);
    m2 = d1.and([d2, d3]);
    m3 = d1.and([d2, d3, d4]);
    m4 = d1.and([d2, d3, d4], true, true);
    m5 = d1.and([d2, d3, d4], false, false);

    // Make sure .and() returns a deferred instance.
    assert.strictEqual(m1 instanceof palikka.Deferred, true);

    // Test .and()
    m1.done(function (d1Val, d2Val) {
      assert.strictEqual(d1.state(), 'resolved');
      assert.strictEqual(d2.state(), 'resolved');
      assert.strictEqual(d1Val[0], 'a');
      assert.strictEqual(d1Val[1], 'b');
      assert.strictEqual(d1Val[2], 'c');
      assert.strictEqual(d2Val, 'd');
    });

    // Test .and()
    m2.fail(function (reason) {
      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'resolved');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(reason, 'fail-1');
    });

    // Test .and()
    m3.fail(function (reason) {
      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'resolved');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(d4.state(), 'pending');
      assert.strictEqual(reason, 'fail-1');
    });

    // Test .and()
    m4.done(function (val) {
      assert.strictEqual(d1.state(), 'pending');
      assert.strictEqual(d2.state(), 'resolved');
      assert.strictEqual(d3.state(), 'pending');
      assert.strictEqual(d4.state(), 'pending');
      assert.strictEqual(val, 'd');
    });

    // Test .and()
    m5.fail(function (reason) {
      assert.strictEqual(d1.state(), 'resolved');
      assert.strictEqual(d2.state(), 'resolved');
      assert.strictEqual(d3.state(), 'rejected');
      assert.strictEqual(d4.state(), 'rejected');
      assert.strictEqual(reason, 'fail-1');
    });

    // Test .when() with empty values
    palikka
    .when()
    .done(function (val) {
      assert.strictEqual(val, undefined);
    });

    // Test .when() with non-deferred values
    palikka
    .when([1, '2', {'a': 'a'}, ['a', 'b']])
    .done(function (val1, val2, val3, val4) {
      assert.strictEqual(val1, 1);
      assert.strictEqual(val2, '2');
      assert.strictEqual(val3['a'], 'a');
      assert.strictEqual(val4[0], 'a');
      assert.strictEqual(val4[1], 'b');
    });

    // Test deferred chaining.
    d1
    .then(function (a, b, c) {
      assert.strictEqual(this, d1);
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      return 'd';
    }, function () {
      assert.strictEqual(1, 0);
    })
    .then(function (d) {
      assert.strictEqual(d, 'd');
      var ret = new palikka.Deferred();
      setTimeout(function () {
        ret.resolve('e', 'f', 'g');
      }, 100);
      return ret;
    }, function () {
      assert.strictEqual(1, 0);
    })
    .fail(function (e) {
      assert.strictEqual(1, 0);
    })
    .done(function (e, f, g) {
      assert.strictEqual(e, 'e');
      assert.strictEqual(f, 'f');
      assert.strictEqual(g, 'g');
    })
    .always(function (e, f, g) {
      assert.strictEqual(e, 'e');
      assert.strictEqual(f, 'f');
      assert.strictEqual(g, 'g');
    })
    .then(function () {
      throw new Error('fail');
    })
    .then(function () {
      assert.strictEqual(1, 0);
    }, function (e) {
      assert.strictEqual(e.message, 'fail');
    })
    .then(null, function (e) {
      assert.strictEqual(e.message, 'fail');
    })
    .done(function (e) {
      assert.strictEqual(1, 0);
    })
    .fail(function (e) {
      assert.strictEqual(e.message, 'fail');
    })
    .always(function (e) {
      assert.strictEqual(e.message, 'fail');
    });

    setTimeout(function () {
      done();
    }, 2000);

  });

})(QUnit);