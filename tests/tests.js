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
      assert.strictEqual(palikka.modules.hasOwnProperty('a'), false, 'async works');
    }, 1000);

    // Test require method.

    palikka.require(['a', 'b', 'c'], function (a, b, c) {
      assert.strictEqual(a.text, 'a', 'require callback params work');
      assert.strictEqual(b.text, 'b', 'require callback params work');
      assert.strictEqual(c.text, 'c', 'require callback params work');
      done();
    });

    // Test get method.

    palikka.get(['foo', 'bar']);
    palikka.get(['wuu', 'huu'], obj);
    palikka.require(['foo', 'bar', 'wuu', 'hoo'], function (foo, bar, wuu, huu) {
      assert.strictEqual(foo, 'foo', 'get works');
      assert.strictEqual(bar, 'bar', 'get works');
      assert.strictEqual(wuu, 'wuu', 'get works');
      assert.strictEqual(huu, 'huu', 'get works');
    });

  });

})(QUnit);