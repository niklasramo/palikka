#Palikka v0.3.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.0)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.0)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A compact and well-tested JavaScript module/event/promise system that works in the browser (all the way down to IE7) and Node.js.

##Features

* Lightweight, around 4.6kb minified.
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
  var getSomeData = new palikka.Deferred(function (resolve, reject) {
    window.setTimeout(function () {
      resolve('b', 'a', 'r');
    }, 1000);
  });

  // When data is fetched initiate module
  getSomeData.done(function (b, a, r) {
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
    * [eventizer.on()](#_eventizer.on)
    * [eventizer.off()](#_eventizer.on)
    * [eventizer.emit()](#_eventizer.on)

&nbsp;

###.eventize()

Creates a new Eventizer instance and returns it. If target object is provided the Eventizer instance's methods are ported to the object.

**Syntax**

`palikka.eventize( [target] [, listeners] )`

**Parameters**

* **target** &nbsp;&mdash;&nbsp; *object*
* **listeners** &nbsp;&mdash;&nbsp; *object*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer / object*

Returns a new Eventizer instance or the target object if provided.

&nbsp;

###.Eventizer()

A constructor function that builds a fully functional event system instance. The instance has ***.on()***, ***.off()*** and ***.emit()*** methods and a private object ***._listeners***  where all event callbacks are stored.

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

###eventizer.on()

Bind a custom event listener to an Eventizer instance. The callback argument always receives an event data object as it's first argument.

**Syntax**

`eventizer.on( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

&nbsp;

###eventizer.off()

Unbind a custom event listener from an Eventizer instance. If a callback function is not provided all listeners for the specified type will be removed, otherwise only the provided callback instances will be removed.

**Syntax**

`eventizer.off( type [, cbRef] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **cbRef** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

&nbsp;

###eventizer.emit()

Trigger a custom event within an Eventizer instance. Provided context and arguments will be applied to the callback functions.

**Syntax**

`eventizer.emit( type [, args] [, context] )`

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
    * [deferred.state()](#_deferred.state)
    * [deferred.resolve()](#deferred.resolve)
    * [deferred.reject()](#deferred.reject)
    * [deferred.done()](#deferred.done)
    * [deferred.fail()](#deferred.fail)
    * [deferred.always()](#deferred.always)
    * [deferred.then()](#deferred.then)
    * [deferred.join()](#deferred.join)

&nbsp;

###.when()

Returns a new Deferred instance that will be resolved/rejected when all provided Deferred instances are resolved or rejected. Any non-Deferred object within the deferreds array will be instantly resolved and assigned with a value of undefined.

**Syntax**

`palikka.when( deferreds [, resolveOnFirst] [, rejectOnFirst])`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array*
* **resolveOnFirst** &nbsp;&mdash;&nbsp; *boolean*
* **rejectOnFirst** &nbsp;&mdash;&nbsp; *boolean*

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

&nbsp;

###.Deferred()

A constructor function that creates a Deferred instance. The instance is "thenable" and Promises/A+ compliant. The API is based on jQuery's Deferred implementation.

**Syntax**

`palikka.Deferred( [callback] )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Optional. The callback function has two arguments, *resolve* and *reject*, which can be used to resolve or reject the Deferred instance.

**Usage**

```javascript
var defer = new palikka.Deferred(function (resolve, reject) {

  window.setTimeout(function () {
    resolve('wuu', 'huu');
  }, Math.floor(Math.random() * 1000));

  window.setTimeout(function () {
    reject('bummer');
  }, Math.floor(Math.random() * 1000));

});

defer
.done(function (wuu, huu) {
  console.log(wuu + huu); // "wuuhuu"
})
.fail(function (reason) {
  console.log(reason); // "bummer"
})
.always(function () {
  if (this.state() === 'resolved') {
    console.log(arguments[0] + arguments[1]); // "wuuhuu"
  } else {
    console.log(arguments[0]); // "bummer"
  }
});
```

&nbsp;

###deferred.state()

Retrieve the current state of the Deferred instance: "pending", "resolved" or "rejected".

**Syntax**

`deferred.state()`

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.resolve()

Resolve a deferred instance.

**Syntax**

`deferred.resolve( [args] )`

**Parameters**

* **args** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Arguments that are passed to the *done* and *always* callbacks.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.reject()

Reject a deferred instance.

**Syntax**

`deferred.reject( [args] )`

**Parameters**

* **args** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Arguments that are passed to the *fail* and *always* callbacks.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.done()

Add a callback that will be called when the Deferred instance is resolved.

**Syntax**

`deferred.done( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * A function that is called when the Deferred is resolved.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.fail()

Add a callback that will be called when the Deferred instance is rejected.

**Syntax**

`deferred.fail( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * A function that is called when the Deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.always()

Add a callback that will be called when the Deferred instance is either resolved or rejected.

**Syntax**

`deferred.always( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * A function that is called when the Deferred is either resolved or rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

&nbsp;

###deferred.then()

Chain deferreds. This method will create and return a new Deferred instance that is contigent on the instantiating Deferred instance. The new Deferred instance has two optional callback functions as it's arguments: *done* and *fail*. The fate of the previous Deferred instance will determine which callback will be executed. When either of the callbacks is excecuted the new Deferred instance is resolved/rejected with the callback function's return value. If the return value is also a Deferred instance the new Deferred instance is resolved/rejected based on the fate of that Deferred. Rejection will bubble all the way down to the last link of the chain. Yep, it's like inception for deferreds.

**Syntax**

`deferred.then( [done] [, fail] )`

**Parameters**

* **done** &nbsp;&mdash;&nbsp; *function*
  * Optional. A function that is called when the Deferred is resolved.
* **fail** &nbsp;&mdash;&nbsp; *function*
  * Optional. A function that is called when the Deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new Deferred instance.

&nbsp;

###deferred.join()

This method is basically just a wrapper for *palikka.when()* with the exception that it can be easily chained with other Deferred instance's. The calling instance is added before the provided deferreds and *palikka.when()* is called with the same aguments as provided here. This method is also a combinatoin of ES6 Promise's very useful *.all()* and *.race()* methods.

`deferred.join( [deferreds] [, resolveOnFirst] [, rejectOnFirst])`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array / Deferred*
* **resolveOnFirst** &nbsp;&mdash;&nbsp; *boolean*
* **rejectOnFirst** &nbsp;&mdash;&nbsp; *boolean*

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new Deferred instance.

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
