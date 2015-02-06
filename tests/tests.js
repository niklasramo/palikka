(function (Q) {

  Q.test('tests', function (assert) {

    var done = assert.async();
    var obj = {
      wuu: 'wuu',
      huu: 'huu'
    };

    window.foo = 'foo';
    window.bar = 'bar';

    // Test define method.

    palikka.define(
      'c',
      ['a', 'b'],
      function (a, b) {
        assert.strictEqual(a.text, 'a', 'define callback params work');
        assert.strictEqual(b.text, 'b', 'define callback params work');
        return {text: 'c'};
      },
      function (cb, a, b) {
        assert.strictEqual(typeof cb, 'function', 'async callback params work');
        assert.strictEqual(a.text, 'a', 'async callback params work');
        assert.strictEqual(b.text, 'b', 'async callback params work');
        window.setTimeout(function () {
          cb();
        }, 2000);
      }
    );

    palikka.define(
      'b',
      ['a'],
      function (a) {
        assert.strictEqual(a.text, 'a', 'define callback params work');
        return {text: 'b'};
      }
    );

    palikka.define(
      'a',
      function () {
        return {text: 'a'};
      },
      function (cb) {
        window.setTimeout(function () {
          cb();
        }, 2000);
      }
    );

    window.setTimeout(function () {
      assert.strictEqual(palikka.modules.hasOwnProperty('a') && palikka.modules.a.loaded === false, true, 'module is registered before it is initiated');
    }, 1000);

    // Test get method.

    palikka.get(['foo', 'bar']);
    palikka.get(['wuu', 'huu'], obj);
    palikka.require(['foo', 'bar', 'wuu', 'hoo'], function (foo, bar, wuu, huu) {
      assert.strictEqual(foo, 'foo', 'get works');
      assert.strictEqual(bar, 'bar', 'get works');
      assert.strictEqual(wuu, 'wuu', 'get works');
      assert.strictEqual(huu, 'huu', 'get works');
    });

    // Test defining require method's dependency module as a string instead of array.

    palikka.require('foo', function (f) {
      assert.strictEqual(f, 'foo', 'dependency argument accepts string');
    });

    // Test using plain object as define method's factory.

    palikka.define('plainobject', {test: 'test'});
    palikka.require('plainobject', function (plainobject) {
      assert.strictEqual(plainobject.test, 'test', 'define method\'s factory argument accepts plain object');
    });

    // Test using require without dependencies.

    palikka.require(function () {
      assert.strictEqual('test', 'test', 'require method works without dependencies defined');
    });

    // Test define return values.

    var defineSuccess = palikka.define('override', function () {
      return 'override';
    });
    assert.strictEqual(defineSuccess, true, 'define returns true on success');

    var defineFail = palikka.define('override', function () {
      return 'overrideSecond';
    });
    assert.strictEqual(defineFail, false, 'define returns false on fail');

    // Test overriding a module.

    palikka.require('override', function (override) {
      assert.strictEqual(override, 'override', 'module definition can not be overriden');
    });

    // Test undefine method.

    palikka.define('udef', function () {
      return 'udef';
    });
    var udefRetSuccess = palikka.undefine('udef');
    assert.strictEqual(udefRetSuccess, true, 'succesful undefine returns true');
    assert.strictEqual(palikka.modules['udef'], undefined, 'module can be undefined');

    palikka.require('udef', function (udef) {
      assert.strictEqual(udef, 'udef2', 'module cannot be undefined when it is depended on by a require instance');
    });
    palikka.define('udef', function () {
      return 'udef2';
    });
    var udefRetFail = palikka.undefine('udef');
    assert.strictEqual(udefRetFail, false, 'unsuccesful undefine returns false');

    var udefRetNonExistent = palikka.undefine('nonexistent');
    assert.strictEqual(udefRetNonExistent, true, 'undefining a non-existent module returns true');

    // Test require method arguments.

    palikka.require(['a', 'b', 'c'], function (a, b, c) {
      assert.strictEqual(a.text, 'a', 'require callback params work');
      assert.strictEqual(b.text, 'b', 'require callback params work');
      assert.strictEqual(c.text, 'c', 'require callback params work');
      done();
    });

  });

})(QUnit);