# Palikka

A simple [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) insipired module system for keeping your codebase organized. Supports modern browsers (IE9+) and Node.js. Palikka is heavily influenced by [RequireJS](http://requirejs.org/) and [modulejs](https://larsjung.de/modulejs/) libraries and you should definitely check them out too.

## Getting started

First of all, include [Palikka](https://raw.githubusercontent.com/niklasramo/palikka/v1.0.0/palikka.js) somewhere on your site (before any code that requires Palikka).

You can define new modules using the `.define()` method.

```javascript
Palikka
.define('c', ['a', 'b'], function (req) {
  var a = req('a');
  var b = req('b');
  console.log(a + ' ' + b + '!'); // "Hello world!"
  return a + b;
})
.define('a', 'Hello')
.define('b', 'world');
```

Also you can just `.require()` modules if there is no need to define a new module.

```javascript
Palikka.require(['a', 'b'], function (req) {
  var a = req('a');
  var b = req('b');
  console.log(a + ' ' + b + '!'); // "Hello world!"
  return a + b;
});
```

Sometimes a module's initiation needs to be delayed.

```javascript
Palikka.define('d', ['a', 'b'], function (req, defer) {
  var a = req('a');
  var b = req('b');
  var done = defer();
  window.setTimeout(function () {
    done(a + ' another ' + b + '!');
  }, 1000);
});
```

When you start having tens or hundreds of modules it's handy to check the status of the modules with `.getLog()` method. Especially helpful for quick debugging.

```javascript
console.log(Palikka.getLog());
```

You can also fetch the current data of all modules with `.getData()` method.

```javascript
var modules = Palikka.getData();
```

`Palikka` is also constructor function that creates a new independent module system instance when initiated with `new` keyword.

```javascript
var moduleSystem = new Palikka();
var anotherModuleSystem = new Palikka();

moduleSystem
.define('a', 'Hello')
.define('b', 'world')
.require(['a', 'b'], function (r) {
  console.log(r('a') + ' ' + r('b') + !); // Hello world!
});

anotherModuleSystem
.define('a', 'Hello')
.define('b', 'human')
.require(['a', 'b'], function (r) {
  console.log(r('a') + ' ' + r('b') + !); // Hello human!
});
```

## API v1.0.0

* [.define()](#define)
* [.require()](#require)
* [.getLog()](#getlog)
* [.getData()](#getdata)

### .define()

Define one or more modules. After a module is defined another module cannot be defined with the same id. Undefining a module is not possible either. If you try to define a module with an existing module id Palikka will silently ignore the define command. Palikka does not support defining circular dependencies, but it does detect them and throws an error when it *sniffs* one.

**`.define( ids, [ dependencies ], [ value ] )`**

* **ids** &nbsp;&mdash;&nbsp; *Array / String*
  * Module id(s). Each module must have a unique id.
* **dependencies** &nbsp;&mdash;&nbsp; *Array / String*
  * Define dependencies as an array of module ids (strings) or a single dependency as a string. Optional.
  * Default: `[]`.
* **value** &nbsp;&mdash;&nbsp; *Anything*
  * Define the value of the module. Optional.
  * Default: `undefined`.
  * If the value is anything else than a function it is directly assigned as the module's value after the dependencies have loaded. A function, however, will not be directly assigned. Instead, it is called and it's return value will be assigned as the module's value. The function will receive the following arguments:
    * **require** &nbsp;&mdash;&nbsp; *Function*
      * The first argument is a function that can be used to *require* the values of the dependency modules. Provide any module's id as it's first argument and it will return the module's value. Note that you can actually require any module that's defined with the respective Palikka instance, not just the dependency modules, as long as the required module is ready. If the required module is not ready yet (or not defined) an error will be thrown.
    * **defer** &nbsp;&mdash;&nbsp; *Function*
      * The second argument is a function that *defers* the module's initiation until the returned *done* callback is called. Provide the module's value as the *done* callback's first argument.
    * **id** &nbsp;&mdash;&nbsp; *String*
      * The third argument is the module's id.

**Returns** &nbsp;&mdash;&nbsp; *Palikka*

If `.define()` is called on a Palikka instance the instance is returned. Otherwise if the method is called on the `Palikka` constructor function then `Palikka` constructor is returned.

**Examples**

```javascript
// Define a module with a factory function.
Palikka.define('foo', function () {
  return 'foo';
});

// Define a module with a direct value.
Palikka.define('bar', 'bar');

// Define a module with dependencies.
Palikka.define('foobar', ['foo', 'bar'], function (req) {
  var foo = req('foo');
  var bar = req('bar');
  return foo + bar;
});

// Define a module using deferred initiation.
Palikka.define('delayed', function (req, defer) {
  var done = defer();
  setTimeout(function () {
    done('I am delayed...');
  }, 2000);
});

// Define multiple modules at once.
// Handy for importing third party libraries.
var obj = {a: 'I am A', b: 'I am B'};
Palikka.define(['a', 'b'], function (req, defer, id) {
  return obj[id];
});
```

### .require()

Require one or more modules and do stuff after they have loaded.

**`.require( ids, callback )`**

* **ids** &nbsp;&mdash;&nbsp; *Array / String*
  * Module id(s).
* **callback** &nbsp;&mdash;&nbsp; *Function*
  * A callback function that will be called after all the modules have loaded. The callback function receives a single argument:
    * **require** &nbsp;&mdash;&nbsp; *Function*
      * A function that can be used to *require* the values of the dependency modules. Provide any module's id as it's first argument and it will return the module's value. Note that you can actually require any module that's defined with the respective Palikka instance, not just the dependency modules, as long as the required module is ready. If the required module is not ready yet (or not defined) an error will be thrown.

**Returns** &nbsp;&mdash;&nbsp; *Palikka*

If `.require()` is called on a Palikka instance the instance is returned. Otherwise if the method is called on the `Palikka` constructor function then `Palikka` constructor is returned.

**Examples**

```javascript
Palikka
.define('a', 'foo')
.define('b', 'bar')
.require(['a', 'b'], function (req) {
  var a = req('a');
  var b = req('b');
  alert(a + b); // "foobar"
});
```

### .getLog()

Returns a tidy list of all the currently defined modules and their dependencies in the exact order they were defined. The list also indicates each module's current state &mdash; ***undefined*** `( )`, ***defined*** `(-)` or ***ready*** `(v)`.

**`.getLog( [ ids ] )`**

* **ids** &nbsp;&mdash;&nbsp; *Array / String*
  * Module id(s). Optional.

**Returns** &nbsp;&mdash;&nbsp; *String*

**Examples**

```javascript
Palikka
.define('a')
.define('b')
.define('c', ['a', 'b'], {})
.define('d', ['c', 'x'], {});

// Log a single module.
console.log(Palikka.getLog('a'));
// (v) a

// Log multiple modules.
console.log(Palikka.getLog(['a', 'c']));
// (v) a
// (v) c
//     (v) a
//     (v) b

// Log all modules.
console.log(Palikka.getLog());
// (v) a
// (v) b
// (v) c
//     (v) a
//     (v) b
// (-) d
//     (v) c
//     ( ) x
```

### .getData()

Returns an object containing some helpful information about all the currently defined modules.

**Returns** &nbsp;&mdash;&nbsp; *Object*

**Examples**

```javascript
Palikka
.define('a', 'foo')
.define('b', 'a', 'bar');

var data = Palikka.getData();
// {
//   a: {
//     id: "a",
//     order: 1,
//     dependencies: [],
//     ready: true,
//     value: 'foo'
//    },
//   b: {
//     id: "b",
//     order: 2,
//     dependencies: ['a'],
//     ready: true,
//     value: 'bar'
//    }
// }
```


## License

Copyright &copy; 2016 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
