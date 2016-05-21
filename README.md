# Palikka

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v1.0.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v1.0.0)](https://coveralls.io/r/niklasramo/palikka?branch=v1.0.0)

A tiny and very simple module system implementation with [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) insipired API. Basically it just keeps track of your modules and their dependencies making sure that a module is initiated only after the module's dependencies have loaded. That's pretty much it. Palikka is heavily influenced by [RequireJS](http://requirejs.org/) and the original goal was actually to build an over-simplistic version of it by leaving out the script loading functionality and taking some shortcuts. Palikka supports modern browsers (IE9+) and Node.js.

You should also check out [modulejs](https://larsjung.de/modulejs/) library, which is very similar to Palikka.

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
  return defer(function (resolve) {
    window.setTimeout(function () {
      resolve(a + ' another ' + b + '!');
    }, 1000);
  });
});
```

When you start having tens or hundreds of modules it's handy to check the status of the modules with `.log()` method. Especially helpful for quick debugging.

```javascript
console.log(Palikka.log());
```

You can also fetch the data of all modules with `.data()` method.

```javascript
var modules = Palikka.data();
```

`Palikka` is also constructor function that creates a new module system instance when initiated with `new` keyword.

```javascript
var modSystem = new Palikka();

modSystem
.define('a', 'Hello')
.define('b', 'world')
.require(['a', 'b'], function (req) {
  var a = req('a');
  var b = req('b');
  console.log(a + ' ' + b + !); // Hello world!
});
```

## API

* [Palikka.define( ids, [ dependencies ], [ factory ] )](#define)
* [Palikka.require( ids, callback )](#require)
* [Palikka.log( [ ids ], [ logger ] )](#log)
* [Palikka.data()](#data)

#### `Palikka.define( ids, [ dependencies ], [ factory ] )`

Define a module or multiple modules. After a module is defined another module cannot be defined with the same id, naturally. Undefining a module is not possible either. If you try to define a module with an existing module id Palikka will silently ignore the define command. Palikka does not support circular dependencies, but it does detect them for you automatically and throws an error instantly when you try to define a module with a circular dependency.

**Explicit syntax variations**

`Palikka.define( ids );`

`Palikka.define( ids, factory );`

`Palikka.define( ids, dependencies, factory );`

**Parameters**

* **ids** &nbsp;&mdash;&nbsp; *Array / String*
  * Module id(s). Each module must have a unique id.
* **dependencies** &nbsp;&mdash;&nbsp; *Srray / String*
  * Optional.
  * Default: `[]`.
  * Define multiple dependencies as an array of module ids and a single dependency as a string.
* **factory** &nbsp;&mdash;&nbsp; *Function / Object*
  * Optional.
  * Default: `undefined`.
  * If the factory is a function it is called once after all dependencies have loaded and it's return value will be assigned as the module's value.
  * The factory function receives three arguments:
    * The first argument is a function that returns a module's value when provided with the module's id. The required module's don't have to be the dependency module's, but if the provided module is not ready yet an error will be thrown.
    * The second argument is a promise-like function that defers the initiation of the module when called.
    * The third argument is the defined module's id (string).
  * If the factory is anything else than a function it is directly assigned as the module's value after the dependencies have loaded.

**Returns** &nbsp;&mdash;&nbsp; *Function / Object*

If `.define()` is called on a Palikka instance the instance is returned. Otherwise if the method is called on the `Palikka` constructor function then `Palikka` constructor is returned.

**Usage**

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
  return defer(function (resolve) {
    setTimeout(function () {
      resolve('I am delayed...');
    }, 2000);
  });
});

// Define multiple modules at once.
// Handy for importing third party libraries.
var obj = {a: 'I am A', b: 'I am B'};
Palikka.define(['a', 'b'], function (req, defer, id) {
  return obj[id];
});
```

#### `Palikka.require( ids, callback )`

Require modules and call the callback function after they have loaded.

**Parameters**

* **ids** &nbsp;&mdash;&nbsp; *array / string*
  * Module id(s).
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that will be called after all the modules have loaded.
  * The callback function receives one argument which is a function that returns a dependency module's value when provided with the module's id as the first argument.

**Returns** &nbsp;&mdash;&nbsp; *function*

If `.require()` is called on a Palikka instance the instance is returned. Otherwise if the method is called on the `Palikka` constructor function then `Palikka` constructor is returned.

**Usage**

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

#### `Palikka.log( [ ids ], [ logger ] )`

Returns a nicely formatted list (string) of all the defined modules and their dependencies in the same order they were defined. The list also indicates a module's current state. A module has three possible states:
  * **undefined** `[x]` -  The module is not yet defined with `define` method.
  * **instantiated** `[-]` - The module is defined with `define` method, but it's final value is not yet ready (due to dependencies not being loaded yet or deferred initiation).
  * **defined** `[v]` - The module is defined with `define` method and it's final value is ready to be *required*.

**Explicit syntax variations**

`palikka.log();`

`palikka.log( ids );`

`palikka.log( logger );`

`palikka.log( ids, logger );`

**Parameters**

* **ids** &nbsp;&mdash;&nbsp; *array / string*
  * Optional.
  * Module id(s).
* **logger** &nbsp;&mdash;&nbsp; *function*
  * Optional.
  * A callback function that should return a string. Used for generating the status log. Called for each module and dependency module.

**Returns** &nbsp;&mdash;&nbsp; *string*

**Usage**

```javascript
Palikka
.define('a')
.define('b')
.define('c', ['a', 'b'], {})
.define('d', ['c', 'x'], {});

console.log(Palikka.log());

// [v] a
// [v] b
// [v] c
//     -> [v] a
//     -> [v] b
// [-] d
//     -> [v] c
//     -> [x] x
```

#### `Palikka.data()`

Returns an object containing some helpful information about all the currently defined modules.

**Returns** &nbsp;&mdash;&nbsp; *object*

**Usage**

```javascript
Palikka
.define('a', 'foo')
.define('b', 'a', 'bar');

var data = Palikka.data();
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
//    },
// }
```


## License

Copyright &copy; 2016 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
