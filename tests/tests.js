(function (Q) {

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

  Q.test('Should have a static "log" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.getLog, 'function');

  });

  Q.test('Should have a static "data" method.', function (assert) {

    assert.expect(1);

    assert.strictEqual(typeof Palikka.getData, 'function');

  });

  Q.test('"define" and "require" methods should return the Palikka constructor.', function (assert) {

    assert.expect(2);

    assert.strictEqual(Palikka.define('a'), Palikka);
    assert.strictEqual(Palikka.require('a', function () {}), Palikka);

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

  Q.test('Should have a "log" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.getLog, 'function');

  });

  Q.test('Should have a "data" method.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(typeof palikka.getData, 'function');

  });

  Q.test('"define" and "require" methods should return Palikka instance.', function (assert) {

    var palikka = new Palikka();

    assert.expect(2);

    assert.strictEqual(palikka.define('a'), palikka);
    assert.strictEqual(palikka.require('a', function () {}), palikka);

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
    var func = function () {};
    var results = [
      {type: 'function', 'value': func},
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

  Q.test('Factory\'s context should be the global object', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka.define('a', function () {
      assert.strictEqual(this, window);
    });

  });

  Q.test('Factory should have three arguments.', function (assert) {

    var palikka = new Palikka();

    assert.expect(4);

    palikka.define('a', function () {
      assert.strictEqual(arguments.length, 3, 'Has three arguments.');
      assert.strictEqual(typeof arguments[0], 'function', 'First argument is a function.');
      assert.strictEqual(typeof arguments[1], 'function', 'Second argument is a function.');
      assert.strictEqual(arguments[2], 'a', 'Third argument is the moule\'s id.');
    });

  });

  Q.test('Factory\'s require argument should return a module\'s value when provided with a valid module id, assuming the module is ready.', function (assert) {

    var palikka = new Palikka();

    assert.expect(5);

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

    // TODO: Add test for checking that defer's resolver can not be called twice effectively.

    var palikka = new Palikka();
    var done = assert.async();
    var isAsync = false;
    var isAsync2 = false;

    assert.expect(4);

    // Default syntax

    palikka
    .define('a', function (req, defer) {
      var done = defer();
      setTimeout(function () {
        done('foo');
      }, 10);
    })
    .define('b', 'a', function (req) {
      return req('a');
    })
    .require(['a', 'b'], function (req) {
      assert.strictEqual(isAsync, true);
      assert.strictEqual(req('a'), req('b'));
    });

    isAsync = true;

    // Promise like syntax

    palikka
    .define('a2', function (req, defer) {
      return defer(function (resolve) {
        setTimeout(function () {
          resolve('foo2');
        }, 10);
      });
    })
    .define('b2', 'a2', function (req) {
      return req('a2');
    })
    .require(['a2', 'b2'], function (req) {
      assert.strictEqual(isAsync2, true);
      assert.strictEqual(req('a2'), req('b2'));
      done();
    });

    isAsync2 = true;

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

  if (typeof Promise === 'function') {
    Q.test('Factory should accept a "thenable" (promise) as a return value in which case the final value of the promise will be set as the module\'s value.', function (assert) {

      var palikka = new Palikka();
      var done = assert.async();

      assert.expect(2);

      palikka
      .require('a', function (req) {
        assert.strictEqual(req('a'), 'aValue', 'Fulfilled promise works as supposed to.');
      })
      .require('b', function (req) {
        assert.strictEqual(req('b'), 'bValue', 'Rejected promise works as supposed to.');
        done();
      })
      .define('a', function () {
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            resolve('aValue');
          }, 100);
        });
      })
      .define('b', function () {
        return new Promise(function (resolve, reject) {
          window.setTimeout(function () {
            reject('bValue');
          }, 100);
        });
      });

    });
  }

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
      {type: 'function', 'value': function () {}},
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

  Q.test('Should call the callback after the required modules are ready.', function (assert) {

    var palikka = new Palikka();
    var done = assert.async();

    assert.expect(4);

    palikka
    .require('a', function (req) {
      assert.strictEqual(req('a'), 'aValue', 'Callback\'s require argument fetches dependency module\'s value correctly.');
      assert.throws(function () {
        req('b');
      }, undefined, 'Callback\'s require argument throws when an undefined module is required.');
    })
    .require(['a', 'b'], function (req) {
      assert.strictEqual(req('b'), 'bValue', 'Callback waits for the dependencies to load correctly.');
      assert.strictEqual(req('c'), 'cValue', 'Callback\'s require argument has access to all ready module\'s in the instance even if they are not explicitly required.');
      done();
    })
    .define('a', 'aValue')
    .define('c', 'cValue')
    .define('b', function (req, defer) {
      return defer(function (resolve) {
        window.setTimeout(function () {
          resolve('bValue');
        }, 100);
      });
    });

  });

  Q.test('Should throw an error if called without arguments', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.throws(function () {
      palikka.require();
    });

  });

  Q.test('Should throw an error if called with only one argument', function (assert) {

    var palikka = new Palikka();

    assert.expect(2);

    assert.throws(function () {
      palikka.require('a');
    });

    assert.throws(function () {
      palikka.require(['a', 'b']);
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


  Q.test('Should throw an error if the second argument is not a function', function (assert) {

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

  Q.test('Callback should have one argument that is a function.', function (assert) {

    var palikka = new Palikka();

    assert.expect(2);

    palikka
    .require('a', function () {
      assert.strictEqual(arguments.length, 1, 'Has one argument.');
      assert.strictEqual(typeof arguments[0], 'function', 'The argument is a function.');
    })
    .define('a');

  });

  Q.test('Callback\'s context should be the global object.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    palikka
    .require('a', function () {
      assert.strictEqual(this, window);
    })
    .define('a');

  });

  /**
   * .getLog() tests.
   */

  Q.module('palikka.getLog()');

  Q.test('Should return an empty string when there are no modules defined.', function (assert) {

    var palikka = new Palikka();

    assert.expect(1);

    assert.strictEqual(palikka.getLog(), '');

  });

  Q.test('Should return a string containing data about all the defined modules.', function (assert) {

    var palikka = new Palikka();

    assert.expect(5);

    palikka
    .define('a', 'aValue')
    .define('b', ['a'], 'bValue')
    .define('c', ['a', 'b', 'x'], {});

    assert.deepEqual(palikka.getLog().split('\n'), [
      '(v) a',
      '(v) b',
      '    (v) a',
      '(-) c',
      '    (v) a',
      '    (v) b',
      '    ( ) x',
      ''
    ], 'Logs all modules correctly when called without arguments.');

    assert.deepEqual(palikka.getLog('c').split('\n'), [
      '(-) c',
      '    (v) a',
      '    (v) b',
      '    ( ) x',
      ''
    ], 'Logs a single module correctly when called with one argument that is a defined module\'s id.');

    assert.deepEqual(palikka.getLog(['a', 'c']).split('\n'), [
      '(v) a',
      '(-) c',
      '    (v) a',
      '    (v) b',
      '    ( ) x',
      ''
    ], 'Logs multiple modules correctly when called with one argument that is an array of defined module ids.');

    assert.deepEqual(palikka.getLog(['a', 'c']), palikka.getLog(['c', 'a']), 'Logs modules always in the order they were defined.');

    assert.deepEqual(palikka.getLog(['a', 'c', 'z']), palikka.getLog(['c', 'a']), 'Filters out ids of modules that are undefined.');

  });

  /**
   * .getData() tests.
   */

  Q.module('palikka.getData()');

  Q.test('Should return an empty object when there are no modules defined.', function (assert) {

    var palikka = new Palikka();

    assert.expect(2);

    var data = palikka.getData();

    assert.strictEqual(typeof data, 'object', 'Return value is an object.');
    assert.strictEqual(Object.keys(data).length, 0, 'Returned object is empty.');

  });

  Q.test('Should return an object containing data about all the defined modules.', function (assert) {

    var palikka = new Palikka();

    assert.expect(19);

    palikka
    .define('a', 'aValue')
    .define('b', ['a'], 'bValue')
    .define('c', ['a', 'b', 'x'], {});

    var data = palikka.getData();

    assert.strictEqual(Object.keys(data).length, 3, 'Return data has correct keys.');
    assert.strictEqual(Object.keys(data['a']).length, 5, 'Module data has correct keys.');

    assert.strictEqual(data.a.id, 'a', 'Module data has correct id.');
    assert.strictEqual(data.b.id, 'b', 'Module data has correct id.');
    assert.strictEqual(data.c.id, 'c', 'Module data has correct id.');

    assert.strictEqual(data.a.order, 1, 'Module data has correct order.');
    assert.strictEqual(data.b.order, 2, 'Module data has correct order.');
    assert.strictEqual(data.c.order, 3, 'Module data has correct order.');

    assert.strictEqual(data.a.dependencies.length, 0, 'Module data has correct amount of dependencies.');
    assert.strictEqual(data.b.dependencies.length, 1, 'Module data has correct amount of dependencies.');
    assert.strictEqual(data.c.dependencies.length, 3, 'Module data has correct amount of dependencies.');

    assert.strictEqual(data.b.dependencies[0], 'a', 'Module data has correct dependencies.');
    assert.strictEqual(data.c.dependencies.join(''), 'abx', 'Module data has correct dependencies.');

    assert.strictEqual(data.a.ready, true, 'Module data has correct state.');
    assert.strictEqual(data.b.ready, true, 'Module data has correct state.');
    assert.strictEqual(data.c.ready, false, 'Module data has correct state.');

    assert.strictEqual(data.a.value, 'aValue', 'Module data has correct value.');
    assert.strictEqual(data.b.value, 'bValue', 'Module data has correct value.');
    assert.strictEqual(data.c.value, undefined, 'Module data has correct value.');

  });

})(QUnit);