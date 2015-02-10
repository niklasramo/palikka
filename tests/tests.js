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
    for (prop in palikka._events.listeners) {
      if (palikka._events._listeners.hasOwnProperty(prop)) {
        delete palikka._events._listeners[prop];
      }
    }

  });

  /**
   * Helper functions.
   */

  function getVal(moduleId) {

    return palikka._modules[moduleId].factory;

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

  Q.test(testName('Dependencies argument.'), function (assert) {

    assert.expect(8);

    /** Dependencies as an array. */

    palikka.define('a', ['b', 'c'], function (b, c) {
      assert.strictEqual(b, 'b');
      assert.strictEqual(c, 'c');
      return 'a';
    });

    assert.strictEqual(getVal('a'), null);

    /** Dependency as a string. */

    palikka.define('b', 'c', function (c) {
      assert.strictEqual(c, 'c');
      return 'b';
    });

    assert.strictEqual(getVal('b'), null);

    /** No dependencies. */

    palikka.define('c', function () {
      return 'c';
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
        assert.strictEqual(b, 'b');
        assert.strictEqual(c, 'c');
        return 'a';
      },
      function (cb) {
        window.setTimeout(cb, 1000);
      }
    );

    assert.strictEqual(getVal('a'), null);

    palikka.define(
      'b',
      'c',
      function (c) {
        assert.strictEqual(c, 'c');
        return 'b';
      },
      function (cb) {
        window.setTimeout(cb, 1000);
      }
    );

    assert.strictEqual(getVal('b'), null);

    palikka.define(
      'c',
      function () {
        return 'c';
      },
      function (cb) {
        window.setTimeout(cb, 1000);
      }
    );

    assert.strictEqual(getVal('c'), null);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), null);
      assert.strictEqual(getVal('b'), null);
      assert.strictEqual(getVal('c'), 'c');
    }, 1500);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), null);
      assert.strictEqual(getVal('b'), 'b');
    }, 2500);

    window.setTimeout(function () {
      assert.strictEqual(getVal('a'), 'a');
      done();
    }, 3500);

  });

  Q.test(testName('Internal module registration and initialization logic.'), function (assert) {

    var done = assert.async();
    assert.expect(2);

    palikka.define(
      'a',
      function () {
        return 'a';
      },
      function (cb) {
        window.setTimeout(cb, 500);
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

    palikka.define('a', function () { return 'a1'; });
    palikka.define('a', function () { return 'a2'; });

    assert.strictEqual(getVal('a'), 'a1');

    palikka.define(
      'b',
      function () { return 'b1'; },
      function (cb) { window.setTimeout(cb, 500); }
    );
    palikka.define('b', function () { return 'b2'; });

    assert.strictEqual(getVal('b'), null);
    window.setTimeout(function () {
      assert.strictEqual(getVal('b'), 'b1');
      done();
    }, 1000);

  });

  Q.module('.undefine()');

  Q.test(testName('Undefining locked, unlocked and non-existent module.'), function (assert) {

    assert.expect(6);

    palikka.define('a', 'b', function () {
      return 'a';
    });

    palikka.define('b', function () {
      return 'b';
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
      function () { return 'd'; },
      function (cb) { window.setTimeout(cb, 500); }
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

  Q.module('.get()');

  Q.test(testName('Importing global object\'s properties and plain object\s properties.'), function (assert) {

    assert.expect(5);

    window.foo = 'foo';
    window.bar = 'bar';
    var obj = {a: 'a', b: 'b'};

    palikka.get('foo');
    palikka.require('foo', function (foo) {
      assert.strictEqual(foo, 'foo');
    });

    palikka.get(['foo', 'bar']);
    palikka.get(['a', 'b'], obj);
    palikka.require(['foo', 'bar', 'a', 'b'], function (foo, bar, a, b) {
      assert.strictEqual(foo, 'foo');
      assert.strictEqual(bar, 'bar');
      assert.strictEqual(a, 'a');
      assert.strictEqual(b, 'b');
    });

  });

})(QUnit);