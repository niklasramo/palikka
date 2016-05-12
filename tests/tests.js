(function (Q) {

  // TODO
  // ****
  // - Require tests
  // - Logger tests

  /**
   * Configuration.
   */

  Q.config.reorder = false;

  /**
   * Palikka smoke tests.
   */

  Q.module('Palikka');

  Q.test('Should be a global function.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka, 'function');

  });

  Q.test('Should have a static "define" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.define, 'function');

  });

  Q.test('Should have a static "require" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.require, 'function');

  });

  Q.test('Should have a static "status" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.status, 'function');

  });

  Q.test('Should have a static "data" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.data, 'function');

  });

  /**
   * Palikka instance smoke tests.
   */

  Q.module('Palikka instance');

  Q.test('Should have a "define" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.define, 'function');

  });

  Q.test('Should have a "require" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.require, 'function');

  });

  Q.test('Should have a "status" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.status, 'function');

  });

  Q.test('Should have a "data" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.data, 'function');

  });

  /**
   * palikka.define() tests.
   */

  Q.module('palikka.define()');

  Q.test('Should throw an error when called without arguments.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.throws(function () {
      palikka.define();
    });

  });

  Q.test('Should define a single module when called with a non-empty string as the first argument.', function (assert) {

    var palikka = new Palikka();

    assert.expect(2);

    palikka
    .define('a')
    .require('a', function (req) {
      assert.strictEqual(req('a'), undefined, 'Correct module value.');
    });

    assert.strictEqual(Object.keys(palikka._modules).length, 1, 'Correct amount of modules defined.');

  });


  Q.test('Should define as many modules as there are valid module ids in the array when called with a non-empty array as the first argument.', function (assert) {

    var palikka = new Palikka();

    assert.expect(5);

    palikka
    .define(['a'])
    .define(['b', 'c', 'd'])
    .require(['a', 'b', 'c', 'd'], function (req) {
      assert.strictEqual(req('a'), undefined, 'Correct module value.');
      assert.strictEqual(req('b'), undefined, 'Correct module value.');
      assert.strictEqual(req('c'), undefined, 'Correct module value.');
      assert.strictEqual(req('d'), undefined, 'Correct module value.');
    });

    assert.strictEqual(Object.keys(palikka._modules).length, 4, 'Correct amount of modules defined.');

  });

  Q.test('Should throw an error and not define a module when called with an invalid module id as the first argument.', function (assert) {

    var palikka = new Palikka();
    var cases = [
      {type: 'empty string', value: ''},
      {type: 'empty array', value: []},
      {type: 'number', value: 1},
      {type: 'boolean - false', value: false},
      {type: 'boolean - true', value: true},
      {type: 'null', value: null},
      {type: 'undefined', value: undefined},
      {type: 'object', value: {}}
    ];

    assert.expect(cases.length + 1);

    for (var i = 0; i < cases.length; i++) {
      (function (i) {
        var data = cases[i];
        assert.throws(function() {
          palikka.define(data.value, function () {});
        }, undefined, data.type + ' throws error.');
      })(i);
    }

    assert.strictEqual(Object.keys(palikka._modules).length, 0, 'No modules defined.');

  });

  Q.test('Should ignore the definition of a module silently if another module with the same id exists already.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka
    .define('a', 'real')
    .define('a', 'fake')
    .require('a', function (req) {
      assert.strictEqual(req('a'), 'real');
    });

  });

  Q.test('Should define a module with the provided value when the factory is anything else than a function.', function (assert) {

    var palikka = new Palikka();
    var results = [
      {type: 'object', 'value': {}},
      {type: 'array', 'value': []},
      {type: 'string', 'value': 'foo'},
      {type: 'number', 'value': 1},
      {type: 'null', 'value': null},
      {type: 'undefined', 'value': undefined},
      {type: 'true', 'value': true},
      {type: 'false', 'value': false}
    ];

    assert.expect(results.length + 1);

    for (var i = 0; i < results.length; i++) {
      (function (i) {
        var data = results[i];
        var moduleId = 'a' + i;
        palikka
        .define(moduleId, data.value)
        .require(moduleId, function (req) {
          assert.strictEqual(req(moduleId), data.value, data.type + ' value set correctly.');
        });
      })(i);
    }

    assert.strictEqual(Object.keys(palikka._modules).length, results.length, 'All modules defined.');

  });

  Q.test('Should define a module with the return value of the factory function when factory is a function', function (assert) {

    var palikka = new Palikka();
    var obj = {};
    var arr = [];
    var results = [
      {type: 'object', 'value': {}},
      {type: 'array', 'value': []},
      {type: 'string', 'value': 'foo'},
      {type: 'number', 'value': 1},
      {type: 'null', 'value': null},
      {type: 'undefined', 'value': undefined},
      {type: 'true', 'value': true},
      {type: 'false', 'value': false}
    ];

    assert.expect(results.length + 1);

    for (var i = 0; i < results.length; i++) {
      (function (i) {
        var data = results[i];
        var moduleId = 'a' + i;
        palikka
        .define(moduleId, function () {
          return data.value;
        })
        .require(moduleId, function (req) {
          assert.strictEqual(req(moduleId), data.value, data.type);
        });
      })(i);
    }

    assert.strictEqual(Object.keys(palikka._modules).length, results.length, 'All modules defined.');

  });

  Q.test('Factory function\'s context should be the module\'s id', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka.define('a', function () {
      assert.strictEqual(this[0], 'a');
    });

  });

  Q.test('Factory function should have two arguments both of which are functions.', function (assert) {

    var palikka = new Palikka();

    assert.expect(3);

    palikka.define('a', function () {
      assert.strictEqual(arguments.length, 2, 'Has two arguments.');
      assert.strictEqual(typeof arguments[0], 'function', 'First argument is a function.');
      assert.strictEqual(typeof arguments[1], 'function', 'Second argument is a function.');
    });

  });

  Q.test('Factory function\'s require argument should return a module\'s value when provided with a valid module id, assuming the module is ready.', function (assert) {

    var palikka = new Palikka();

    assert.expect(6);

    assert.throws(function () {
      palikka.define('fail', function (req, defer) {
        defer();
      });
    }, undefined, 'Error is thrown when defer is called without an argument');

    palikka
    .define('a', 'aValue')
    .define('b', 'bValue')
    .define('c', function (req, defer) {
      defer(function () {});
    })
    .define('d', 'a', function (req) {
      assert.strictEqual(req('a'), 'aValue', 'Returns a dependency module value correctly.');
      assert.strictEqual(req('b'), 'bValue', 'Returns a ready non-dependency value correctly.');
      assert.throws(function () {
        req('c');
      }, undefined, 'Throws an error if the required module is defined, but not ready.');
      assert.throws(function () {
        req('x');
      }, undefined, 'Throws an error if the required module is undefined.');
      assert.throws(function () {
        req();
      }, undefined, 'Throws an error if called without arguments.');
    });

  });

  Q.test('Factory\'s defer argument should delay the initiation of the module.', function (assert) {

    var palikka = new Palikka();
    var done = assert.async();
    var isAsync = false;

    assert.expect(2);

    palikka
    .define('a', function (req, defer) {
      return defer(function (resolve) {
        setTimeout(function () {
          resolve('foo');
        }, 10);
      });
    })
    .define('b', 'a', function (req) {
      return req('a');
    })
    .require(['a', 'b'], function (req) {
      assert.strictEqual(isAsync, true);
      assert.strictEqual(req('a'), req('b'));
      done();
    });

    isAsync = true;

  });

  Q.test('Factory\'s defer argument should be synchronous and override the returned value from the callback.', function (assert) {

    var palikka = new Palikka();

    assert.expect(3);

    palikka
    .define('a', function (req, defer) {
      return defer(function (resolve) {
        resolve('aValue');
      });
    })
    .define('b', function (req, defer) {
      defer(function (resolve) {
        resolve('bValue');
      });
    })
    .define('c', function (req, defer) {
      defer(function (resolve) {
        resolve('cValue');
      });
      return 'bar';
    })
    .require(['a', 'b', 'c'], function (req) {
      assert.strictEqual(req('a'), 'aValue', 'The defer execution can be returned.');
      assert.strictEqual(req('b'), 'bValue', 'No return value is needed when using defer method.');
      assert.strictEqual(req('c'), 'cValue', 'Defer method overrides returned value.');
    });

  });

  Q.test('Should define a module with dependencies.', function (assert) {

    var palikka = new Palikka();

    assert.expect(3);

    palikka
    .define('d', ['a', 'b', 'c'], function (req) {
      assert.strictEqual(req('a'), 'aValue');
      assert.strictEqual(req('b'), 'bValue');
      assert.strictEqual(req('c'), 'cValue');
    })
    .define('c', ['a'], 'cValue')
    .define('b', 'a', 'bValue')
    .define('a', [], 'aValue');

  });

  Q.test('Should throw an error if provided with an invalid dependency argument.', function (assert) {

    var palikka = new Palikka();
    var results = [
      {type: 'object', 'value': {}},
      {type: 'empty string', 'value': ''},
      {type: 'number', 'value': 1},
      {type: 'null', 'value': null},
      {type: 'undefined', 'value': undefined},
      {type: 'true', 'value': true},
      {type: 'false', 'value': false}
    ];

    assert.expect(results.length * 2);

    for (var i = 0; i < results.length; i++) {
      (function (i) {

        var data = results[i];
        var moduleId = 'a' + i;

        assert.throws(function () {
          palikka.define(moduleId, data.value, {});
        }, undefined, data.type);

        assert.throws(function () {
          palikka.define(moduleId, [data.value], {});
        }, undefined, '[' + data.type + ']');

      })(i);
    }

  });

  Q.test('Should detect circular dependencies and throw an error if found.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.throws(
      function() {
        palikka
        .define('a', 'b', {})
        .define('b', 'a', {});
      }
    );

  });

  /**
   * .require() tests.
   */

  Q.module('palikka.require()');

  Q.test('Should throw an error if called without arguments', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.throws(function () {
      palikka.require();
    });

  });

  Q.test('Should throw an error if the first argument is not a non-empty array or string', function (assert) {

    var palikka = new Palikka();
    var results = [
      {type: 'object', 'value': {}},
      {type: 'function', 'value': function(){}},
      {type: 'empty string', 'value': ''},
      {type: 'empty array', 'value': []},
      {type: 'number', 'value': 1},
      {type: 'null', 'value': null},
      {type: 'undefined', 'value': undefined},
      {type: 'true', 'value': true},
      {type: 'false', 'value': false}
    ];

    assert.expect(results.length);

    for (var i = 0; i < results.length; i++) {
      (function (i) {
        var data = results[i];
        assert.throws(function () {
          palikka.require(data.value, function () {});
        }, undefined, data.type);
      })(i);
    }

  });


  Q.test('Require method should throw an error if the second argument is not a function', function (assert) {

    var palikka = new Palikka();
    var results = [
      {type: 'object', 'value': {}},
      {type: 'string', 'value': 'foo'},
      {type: 'array', 'value': []},
      {type: 'number', 'value': 1},
      {type: 'null', 'value': null},
      {type: 'undefined', 'value': undefined},
      {type: 'true', 'value': true},
      {type: 'false', 'value': false}
    ];

    assert.expect(results.length);

    for (var i = 0; i < results.length; i++) {
      (function (i) {
        var data = results[i];
        assert.throws(function () {
          palikka.require('a', data.value);
        }, undefined, data.type);
      })(i);
    }

  });

  /**
   * .status() tests.
   */

  Q.module('.status()');

  /**
   * .data() tests.
   */

  Q.module('.data()');

})(QUnit);