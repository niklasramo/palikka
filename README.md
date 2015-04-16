#Palikka v0.3.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.0)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.0)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A compact and well-tested JavaScript module/event/promise system that works in the browser (all the way down to IE7) and Node.js.

##Features

* Lightweight, around 4.8kb minified.
* Excellent browser support (IE7+).
* Well documented codebase.
* Comprehensive unit tests.
* No dependencies.
* Works in both the browser and Node.js.

##Basic usage

Include [palikka.js](https://github.com/niklasramo/palikka/blob/dev/v0.3.0/palikka.js) somewhere on your site (before any code that requires Palikka).

```javascript
// Define module "foo" which requires module "bar"
palikka.define('foo', ['bar'], function (bar) {
  console.log(bar); // "bar"
  return 'foo';
});

// Define module "bar"
palikka.define('bar', function () {

  // Let's use asynchronous initiation
  var init = this.async();

  // Let's use promises (deferred)
  var getSomeData = new palikka.Deferred(function (fulfill, reject) {
    window.setTimeout(function () {
      fulfill('b', 'a', 'r');
    }, 1000);
  });

  // When data is fetched initiate module
  getSomeData.onFulfilled(function (b, a, r) {
    init(b + a + r);
  });

});

// Require modules "foo" and "bar"
palikka.require(['foo', 'bar'], function (foo, bar) {
  alert(foo + bar); // "foobar"
});
```

##Module API

All modules are stored in private `palikka._modules` object, which holds all the data about the modules.

* [.define()](#define)
* [.undefine()](#undefine)
* [.require()](#require)

&nbsp;

###.define()

Define a module. Please avoid defining circular modules (when two modules depend on each other) since there is currently no way of handling such situations and the modules just never get defined.

**Syntax**

`palikka.define( ids [, dependencies] , factory )`

**Parameters**

* **ids** &nbsp;&mdash;&nbsp; *array / string*
  * Module id(s). Each module must have a unique id.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Optional. Define multiple dependencies as an array of module ids and a single dependency as a string.
* **factory** &nbsp;&mdash;&nbsp; *function / object*
  * this.id &nbsp;&mdash;&nbsp; *string*
  * this.dependencies &nbsp;&mdash;&nbsp; *object*
  * this.async &nbsp;&mdash;&nbsp; *function*
  * If the factory is a plain object it is directly assigned as the module's value. If the factory is a function it is executed once after all dependencies have loaded and it's return value will be assigned as the module's value. The factory callback receives the defined dependency modules as it's function arguments. The context's (this) async property defers the module's initiation when executed and returns a new function that must be exectued in order to finish the module defintion.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array which contains instances of all modules that were successfully registered.

**Usage**

```javascript
// Define a single module.
palikka.define('foo', function () {
  return 'foo';
});

// Define a plain object as module.
palikka.define('bar', {bar: 'bar'});

// Define a module with dependencies.
palikka.define('foobar', ['foo', 'bar'], function (foo, bar) {
  return foo + bar.bar;
});

// Define a module using async initiation.
palikka.define('async', function () {
  var init = this.async();
  window.setTimeout(function () {
    init('I am an asynchronous module!');
  }, 2000);
});

// Define multiple modules at once.
// Handy for importing third party libraries.
var obj = {a: 'a', b: 'b'};
palikka.define(['a', 'b'], function () {
  return obj[this.id];
});
```

&nbsp;

###.undefine()

Undefine a module. Please keep in mind that if any other `define` or `require` instance depends on the module it cannot be undefined.

**Syntax**

`palikka.undefine( ids )`

**Parameters**

* **ids** &nbsp;&mdash;&nbsp; *array / string*
  * Ids of the modules.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns ids of all modules that were successfully undefined.

**Usage**

```javascript
palikka.define('foo', function () {
  return 'foo';
});
palikka.define('bar', ['foo'], function () {
  return 'bar';
});

// "foo" module can not be undefined since
// it is required by module "bar" already.
palikka.undefine('foo'); // []

// "bar" module can be undefined since it is
// not required by other modules yet.
palikka.undefine('bar'); // ['bar']
```

&nbsp;

###.require()

Require a module.

**Syntax**

`palikka.require( dependencies, callback )`

**Parameters**

* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Refer to `.define()` method's dependencies parameter description.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * The callback function that will be executed after all dependencies have loaded. Receives the required dependency modules as it's function arguments. If dependencies are defined as an object the module references are stored in a single data object which is accesible via the first function argument. In other cases the dependency modules are provided as function arguments in the same order they are defined in dependency argument.

**Usage**

```javascript
palikka.define('foo', function () {
  return 'foo';
});
palikka.define('bar', function () {
  return 'bar';
});
palikka.require(['foo', 'bar'], function (foo, bar) {
  // Do your stuff here.
});
```

&nbsp;

##Eventizer API

* [.eventize()](#_eventize)
* [.Eventizer()](#_eventizer)
    * [Eventizer.on()](#_eventizer.on)
    * [Eventizer.off()](#_eventizer.on)
    * [Eventizer.emit()](#_eventizer.on)

&nbsp;

###.eventize()

Creates a new Eventizer instance and returns it. If **obj** is provided the Eventizer instance's methods are ported to the provided object.

**Syntax**

`palikka.eventize( [obj] [, listeners] )`

**Parameters**

* **obj** &nbsp;&mdash;&nbsp; *object*
* **listeners** &nbsp;&mdash;&nbsp; *object*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer / object*

Returns a new Eventizer instance or the object provided as **obj** argument.

&nbsp;

###.Eventizer()

A constructor class that builds a fully functional event system instance. The instance has ***.on()***, ***.off()*** and ***.emit()*** methods and a private object ***._listeners***  where all event callbacks are stored.

**Syntax**

`palikka.Eventizer( [listeners] )`

**Parameters**

* **listeners** &nbsp;&mdash;&nbsp; *object*
  * Optional. Defaults to `{}`. Provide an object where all the event listeners will be stored.

**Usage**

```javascript
var eventizer = new palikka.Eventizer();

eventizer
// Bind a "test" event listener.
.on('test', function (ev, a, b) {

    console.log(this); // eventizer
    console.log(ev.type); // 'test'
    console.log(ev.fn); // callback function
    console.log(a); // "a"
    console.log(b); // "b"

    // You can unbind the event listener after first execution.
    foo.off(ev.type, ev.fn);

})
// Emit "test" event with some arguments,
// note that on/off/emit methods are chainable.
.emit('test', ['a', 'b']);
```

&nbsp;

###Eventizer.on()

Bind a custom event listener. The callback argument always receives an event data object as it's first argument.

**Syntax**

`Eventizer.on( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

&nbsp;

###Eventizer.off()

Unbind a custom even listener. If a callback function is not provided all listeners for the specified type will be removed, otherwise only the provided callback instances will be removed.

**Syntax**

`Eventizer.off( type [, callback] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

&nbsp;

###Eventizer.emit()

Trigger a custom event. Provided context and arguments will be applied to the callback functions.

**Syntax**

`Eventizer.emit( type [, args] [, context] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **args** &nbsp;&mdash;&nbsp; *array*
* **context** &nbsp;&mdash;&nbsp; ***

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

&nbsp;

##Deferred API

* [.when()](#_when)
* [.Deferred()](#_deferred)
    * [Deferred.state()](#_deferred.state)
    * [Deferred.fulfill()](#deferred.fulfill)
    * [Deferred.reject()](#deferred.reject)
    * [Deferred.onFulfilled()](#deferred.onFulfilled)
    * [Deferred.onRejected()](#deferred.onRejected)
    * [Deferred.onResolved()](#deferred.onResolved)
    * [Deferred.then()](#deferred.then)
    * [Deferred.join()](#deferred.join)

&nbsp;

##Alternatives

**Modules**

* [RequireJS](http://requirejs.org/)
* [Browserify](http://browserify.org/)
* [modulejs](http://larsjung.de/modulejs/)

**Promises**

* [Q](https://github.com/kriskowal/q)
* [RSVP.js](https://github.com/tildeio/rsvp.js/)
* [Bluebird](https://github.com/petkaantonov/bluebird)

**Events**

* [minivents](https://github.com/allouis/minivents)

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
