(function (Q) {

  /**
   * Configuration.
   */

  var testCounter = 0;

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

  function getVal(moduleId) {

    return palikka._modules[moduleId].value;

  }

  function testName(name) {

    return '#' + (++testCounter) + ' - ' + name;

  }

  /**
   * Tests.
   */

  Q.module('.define()');

  Q.test(testName('Function as factory argument.'), function (assert) {

    assert.expect(1);

    palikka.define('a', function () {
      return 'a';
    });
    assert.strictEqual(getVal('a'), 'a');

  });

  Q.test(testName('Object as factory argument.'), function (assert) {

    assert.expect(1);

    palikka.define('a', {text: 'a'});
    assert.strictEqual(getVal('a').text, 'a');

  });

  Q.test(testName('Defining multiple modules.'), function (assert) {

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

  Q.test(testName('Dependencies argument.'), function (assert) {

    assert.expect(8);

    /** Dependencies as an array. */

    palikka.define('a', ['b', 'c'], function (b, c) {
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      return 'a';
    });

    assert.strictEqual(getVal('a'), undefined);

    /** Dependency as a string. */

    palikka.define('b', 'c', function (c) {
      assert.strictEqual(c, 'c');
      return 'b';
    });

    assert.strictEqual(getVal('b'), undefined);

    /** No dependencies. */

    palikka.define('c', function () {
      return 'c';
    });

    assert.strictEqual(getVal('c'), 'c');
    assert.strictEqual(getVal('b'), 'b');
    assert.strictEqual(getVal('a'), 'a');

  });

  Q.test(testName('Async module initiation.'), function (assert) {

    var done = assert.async();
    assert.expect(12);

    palikka.define(
      'a',
      ['b', 'c'],
      function (b, c) {
        var init = this.async();
        assert.strictEqual(b, 'b');
        assert.strictEqual(c, 'c');
        window.setTimeout(function () {
          init('a');
        }, 1000);
      }
    );

    assert.strictEqual(getVal('a'), undefined);

    palikka.define(
      'b',
      'c',
      function (c) {
        var init = this.async();
        assert.strictEqual(c, 'c');
        window.setTimeout(function () {
          init('b');
        }, 1000);
      }
    );

    assert.strictEqual(getVal('b'), undefined);

    palikka.define(
      'c',
      function () {
        var init = this.async();
        window.setTimeout(function () {
          init('c');
        }, 1000);
      }
    );

    assert.strictEqual(getVal('c'), undefined);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), undefined);
      assert.strictEqual(getVal('b'), undefined);
      assert.strictEqual(getVal('c'), 'c');
    }, 1500);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), undefined);
      assert.strictEqual(getVal('b'), 'b');
    }, 2500);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), 'a');
      done();
    }, 3500);

  });

  Q.test(testName('Define factory context.'), function (assert) {

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

  Q.test(testName('Internal module registration and initiation logic.'), function (assert) {

    var done = assert.async();
    assert.expect(2);

    palikka.define(
      'a',
      function () {
        var init = this.async();
        window.setTimeout(function () {
          init('a');
        }, 500);
      }
    );

    assert.strictEqual(palikka._modules.a.loaded, false);
    window.setTimeout(function () {
      assert.strictEqual(palikka._modules.a.loaded, true);
      done();
    }, 1000);

  });

  Q.test(testName('Return values of successful and failed definitions.'), function (assert) {

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

  Q.test(testName('Overriding modules.'), function (assert) {

    var done = assert.async();
    assert.expect(3);

    palikka.define('a', function () { return 'a1'; });
    palikka.define('a', function () { return 'a2'; });

    assert.strictEqual(getVal('a'), 'a1');

    palikka.define(
      'b',
      function () {
        var init = this.async();
        window.setTimeout(function () {
          init('b1');
        }, 500);
      }
    );
    palikka.define('b', function () { return 'b2'; });

    assert.strictEqual(getVal('b'), undefined);
    window.setTimeout(function () {
      assert.strictEqual(getVal('b'), 'b1');
      done();
    }, 1000);

  });

  Q.module('.undefine()');

  Q.test(testName('Undefining locked, unlocked and non-existent module.'), function (assert) {

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

  Q.test(testName('Requiring with and without dependencies.'), function (assert) {

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
        window.setTimeout(function () {
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

  Q.test(testName('Triggering, binding and unbinding module events.'), function (assert) {

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

  Q.test(testName('Type checker system.'), function (assert) {

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

  Q.test(testName('Event system.'), function (assert) {

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
      window.setTimeout(function () {
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

  Q.test(testName('Deferred system.'), function (assert) {

    var done = assert.async();
    assert.expect(21);

    var defer = new palikka.Deferred(function (fulfill, reject) {
      window,setTimeout(function () {
        fulfill('a', 'b', 'c');
      }, 500);
    });

    defer
    .then(function (a, b, c) {
      assert.strictEqual(this, defer);
      assert.strictEqual(this._chain.length, 0);
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      return 'd';
    }, function () {
      assert.strictEqual(1, 0);
    })
    .then(function (d) {
      assert.strictEqual(this._chain.length, 1);
      assert.strictEqual(this._chain[0], defer);
      assert.strictEqual(d, 'd');
      var ret = new palikka.Deferred();
      window.setTimeout(function () {
        ret.fulfill('e', 'f', 'g');
      }, 500);
      return ret;
    }, function () {
      assert.strictEqual(1, 0);
    })
    .onRejected(function (e) {
      assert.strictEqual(1, 0);
    })
    .onFulfilled(function (e, f, g) {
      assert.strictEqual(e, 'e');
      assert.strictEqual(f, 'f');
      assert.strictEqual(g, 'g');
    })
    .onFulfilled(function (e, f, g) {
      assert.strictEqual(e, 'e');
      assert.strictEqual(f, 'f');
      assert.strictEqual(g, 'g');
    })
    .then(function () {
      assert.strictEqual(this._chain.length, 2);
      throw new Error('fail');
    })
    .then(function () {
      assert.strictEqual(1, 0);
    }, function (e) {
      assert.strictEqual(this._chain.length, 3);
      assert.strictEqual(e.message, 'fail');
    })
    .then(null, function (e) {
      assert.strictEqual(this._chain.length, 4);
      assert.strictEqual(e.message, 'fail');
    })
    .onFulfilled(function (e) {
      assert.strictEqual(1, 0);
    })
    .onRejected(function (e) {
      assert.strictEqual(e.message, 'fail');
    })
    .onFulfilled(function (e) {
      assert.strictEqual(e.message, 'fail');
      done();
    });

  });

})(QUnit);