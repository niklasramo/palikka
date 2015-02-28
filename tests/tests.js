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

    return palikka._modules[moduleId].data;

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
      this('a');
    });
    assert.strictEqual(getVal('a'), 'a');

  });

  Q.test(testName('Object as factory argument.'), function (assert) {

    assert.expect(1);

    palikka.define('a', {text: 'a'});
    assert.strictEqual(getVal('a').text, 'a');

  });

  Q.test(testName('Returning module\'s value.'), function (assert) {

    assert.expect(2);

    palikka.define('a', function () {
      return 'a';
    });
    assert.strictEqual(getVal('a'), 'a');

    palikka.define('b', function () {
      return undefined;
    });
    assert.strictEqual(getVal('b'), undefined);

  });

  Q.test(testName('Dependencies argument.'), function (assert) {

    assert.expect(12);

    /** Dependencies as an array. */

    palikka.define('a', ['b', 'c'], function (b, c) {
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      this('a');
    });

    assert.strictEqual(getVal('a'), undefined);

    /** Dependency as a string. */

    palikka.define('b', 'c', function (c) {
      assert.strictEqual(c, 'c');
      this('b');
    });

    assert.strictEqual(getVal('b'), undefined);

    /** Dependencies as an object. */

    palikka.define(
      'd',
      {
        a: 'aa',
        b: '',
        c: null
      },
      function (deps) {
        assert.strictEqual(deps.aa, 'a');
        assert.strictEqual(deps.b, 'b');
        assert.strictEqual(deps.c, undefined);
        this('d');
      }
    );

    assert.strictEqual(getVal('d'), undefined);

    /** No dependencies. */

    palikka.define('c', function () {
      this('c');
    });

    assert.strictEqual(getVal('c'), 'c');
    assert.strictEqual(getVal('b'), 'b');
    assert.strictEqual(getVal('a'), 'a');

  });

  Q.test(testName('Deferred argument.'), function (assert) {

    var done = assert.async();
    assert.expect(12);

    palikka.define(
      'a',
      ['b', 'c'],
      function (b, c) {
        var init = this;
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
        var init = this;
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
        var init = this;
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

  Q.test(testName('Internal module registration and initiation logic.'), function (assert) {

    var done = assert.async();
    assert.expect(2);

    palikka.define(
      'a',
      function () {
        var init = this;
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

    assert.expect(2);

    var success = palikka.define('a', {a:'a'});
    var fail = palikka.define('b');

    assert.strictEqual(success, true);
    assert.strictEqual(fail, false);

  });

  Q.test(testName('Overriding modules.'), function (assert) {

    var done = assert.async();
    assert.expect(3);

    palikka.define('a', function () { this('a1'); });
    palikka.define('a', function () { this('a2'); });

    assert.strictEqual(getVal('a'), 'a1');

    palikka.define(
      'b',
      function () {
        var init = this;
        window.setTimeout(function () {
          init('b1');
        }, 500);
      }
    );
    palikka.define('b', function () { this('b2'); });

    assert.strictEqual(getVal('b'), undefined);
    window.setTimeout(function () {
      assert.strictEqual(getVal('b'), 'b1');
      done();
    }, 1000);

  });

  Q.module('.undefine()');

  Q.test(testName('Undefining locked, unlocked and non-existent module.'), function (assert) {

    assert.expect(6);

    palikka.define('a', 'b', function () {
      this('a');
    });

    palikka.define('b', function () {
      this('b');
    });

    var undefineB = palikka.undefine('b');
    var undefineA = palikka.undefine('a');
    var undefineC = palikka.undefine('c');

    /** Locked */
    assert.strictEqual(undefineB, false);
    assert.strictEqual(palikka._modules['b'] !== undefined, true);

    /** Unlocked */
    assert.strictEqual(undefineA, true);
    assert.strictEqual(palikka._modules['a'] === undefined, true);

    /** Non-existent */
    assert.strictEqual(undefineC, true);
    assert.strictEqual(palikka._modules['c'] === undefined, true);

  });

  Q.module('.require()');

  Q.test(testName('Requiring with and without dependencies.'), function (assert) {

    var done = assert.async();
    assert.expect(8);

    var test;

    palikka.define('a', function () {
      this('a');
    });

    palikka.define('b', function () {
      this('b');
    });

    palikka.define('c', function () {
      this('c');
    });

    palikka.define(
      'd',
      function () {
        var init = this;
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

  Q.module('.assign()');

  Q.test(testName('Importing global object\'s properties and plain object\'s properties.'), function (assert) {

    assert.expect(5);

    window.foo = 'foo';
    window.bar = 'bar';
    var obj = {a: 'a', b: 'b'};

    palikka.assign('foo');
    palikka.require('foo', function (foo) {
      assert.strictEqual(foo, 'foo');
    });

    palikka.assign(['foo', 'bar']);
    palikka.assign(['a', 'b'], obj);
    palikka.require(['foo', 'bar', 'a', 'b'], function (foo, bar, a, b) {
      assert.strictEqual(foo, 'foo');
      assert.strictEqual(bar, 'bar');
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
    });

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
      this('foobar');
    });

    /** Test triggering. */
    palikka.emit('initiate-a', [palikka._modules['a']]);

    /** Test unbinding. */
    palikka.off('initiate-a');
    assert.strictEqual(palikka._listeners['initiate-a'], undefined);

    done();

  });

  Q.module('._Eventizer()');

  Q.test(testName('Event system creator.'), function (assert) {

    var done = assert.async();
    assert.expect(12);

    palikka.define('a', function () {

      var m = {};

      /** Initiate Eventizer using call method. */
      palikka._Eventizer.call(m);

      /** Initiate another Eventizer using new keyword. */
      m.events = new palikka._Eventizer();

      /** Emit "tick" event with "foo" and "bar" arguments. */
      m.ticker = window.setInterval(function () {
        m.emit('tick', ['foo', 'bar']);
      }, 100);

      /** Emit "tock" event with "foo" and "bar" arguments. */
      m.tocker = window.setInterval(function () {
        m.events.emit('tock', ['foo', 'bar']);
      }, 100);

      this(m);

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

        assert.strictEqual(this, a.events);
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

      this(m);

    });


  });

})(QUnit);