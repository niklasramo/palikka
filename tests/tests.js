(function (Q) {

  /**
   * Configuration.
   */

  Q.config.reorder = false;

  /**
   * Tests.
   */

  Q.test('Palikka should be a global function.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka, 'function');

  });

  Q.test('Palikka should have a static "define" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.define, 'function');

  });

  Q.test('Palikka should have a static "require" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.require, 'function');

  });

  Q.test('Palikka instance should have a "define" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.define, 'function');

  });

  Q.test('Palikka instance should have a "require" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.require, 'function');

  });

  Q.test('When define method is called without arguments an error should be thrown.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.throws(function () {
      palikka.define();
    });

  });

  Q.test('When define method is called with a single (string) argument a module should be defined with undefined as it\'s value.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka
    .define('a')
    .require('a', function (a) {
      assert.strictEqual(a, undefined);
    });

  });

  Q.test('When define method is called with two arguments the first should define a the module\'s id and the second should define the module\'s factory function or value.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka
    .define('a', 'test')
    .require('a', function (a) {
      assert.strictEqual(a, 'test');
    });

  });

  Q.test('When define method is called with three arguments the first should define a the module\'s id, the second should define the module\'s dependencies and the third should define the module\'s factory function or value.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka
    .define('a', [], 'test')
    .require('a', function (a) {
      assert.strictEqual(a, 'test');
    });

  });

  Q.test('Define a module with a single dependency.', function (assert) {

    var palikka = new Palikka();
    var result = 'foo';

    assert.expect(1);

    palikka.define('a', 'b', function (b) {
      assert.strictEqual(b, result);
    });

    palikka.define('b', function () {
      return result;
    });

  });

  Q.test('Define a module with multiple dependencies.', function (assert) {

    var palikka = new Palikka();
    var bResult = 'foo';
    var cResult = 'bar';

    assert.expect(2);

    palikka.define('a', ['b', 'c'], function (b, c) {
      assert.strictEqual(b, bResult);
      assert.strictEqual(c, cResult);
    });

    palikka.define('b', function () {
      return bResult;
    });

    palikka.define('c', function () {
      return cResult;
    });

  });

  Q.test('Define module asynchronously.', function (assert) {

    assert.expect(1);

    assert.strictEqual('todo', 'todo');

  });

  Q.test('Define two modules with same id.', function (assert) {

    assert.expect(1);

    assert.strictEqual('todo', 'todo');

  });

  Q.test('Factory can be any type.', function (assert) {

    var palikka = new Palikka();
    var resultObj = {};
    var resultArray = [];
    var results = [
      {type: 'function', 'factory': function () { return 'foo'; }, result: 'foo'},
      {type: 'object', 'factory': resultObj, result: resultObj},
      {type: 'array', 'factory': resultArray, result: resultArray},
      {type: 'string', 'factory': 'foo', result: 'foo'},
      {type: 'number', 'factory': 1, result: 1},
      {type: 'null', 'factory': null, result: null},
      {type: 'undefined', 'factory': undefined, result: undefined},
      {type: 'true', 'factory': true, result: true},
      {type: 'false', 'factory': false, result: false}
    ];

    assert.expect(results.length *  2);

    for (var i = 0; i < results.length; i++) {
      (function (i) {

        var assertData = results[i];

        palikka
        .require('a' + i, function (a) {
          assert.strictEqual(a, assertData.result, assertData.type);
        })
        .require('b' + i, function (b) {
          assert.strictEqual(b, assertData.result, assertData.type);
        })
        .define('a' + i, assertData.factory)
        .define('b' + i, [], assertData.factory);

      })(i)
    }

  });

  Q.test('Factory\'s context should have the following properties: id, dependencies and defer.', function (assert) {

    var palikka = new Palikka();
    var bResult = 'foo';
    var cResult = 'bar';

    assert.expect(4);

    palikka
    .define('a', ['b', 'c'], function () {
      assert.strictEqual(this.id, 'a');
      assert.strictEqual(this.dependencies.b, bResult);
      assert.strictEqual(this.dependencies.c, cResult);
      assert.strictEqual(typeof this.defer, 'function');
    })
    .define('b', bResult)
    .define('c', cResult);

  });

  Q.test('Throw an error if a defined/required module id is not a string or a populated array.', function (assert) {

    var palikka = new Palikka();
    var ids = [
      {type: 'number', value: 1},
      {type: 'boolean - false', value: false},
      {type: 'boolean - true', value: true},
      {type: 'null', value: null},
      {type: 'undefined', value: undefined},
      {type: 'object', value: {}},
      {type: 'array', value: []}
    ];

    assert.expect(ids.length * 2);

    for (var i = 0; i < ids.length; i++) {
      (function (i) {

        var assertData = ids[i];

        assert.throws(function() {
          palikka.define(assertData.value, function () {});
        }, undefined, 'define: ' + assertData.type);

        assert.throws(function() {
          palikka.require(assertData.value, function () {});
        }, undefined, 'require: ' + assertData.type);

      })(i);
    }

  });

  Q.test('Circular dependency should throw an error.', function (assert) {

    var palikka = new Palikka();
    var bResult = 'foo';
    var cResult = 'bar';

    assert.expect(1);

    assert.throws(
      function() {

        palikka.define('a', 'b', function (b) {
          return b;
        });

        palikka.define('b', 'a', function (a) {
          return a;
        });

      }
    );

  });

})(QUnit);