#Palikka v0.3.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.0)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.0)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A compact and well-tested JavaScript module/event/promise system that works in the browser (all the way down to IE7) and Node.js. So, why bundle three different libraries together? Both a module and a deferred system require an event system to work so it makes sense to optimize their synergies internally in order to keep the code DRY and performant. The goal of this project is to provide a solid module/event/promise system with the essential features.

##Features

* Lightweight, less than 5kb minified.
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
  return 'foo';
});

// Define module "bar"
palikka.define('bar', function () {

  // Let's use promises (deferred) to delay the initiation
  return new palikka.Deferred(function (resolve, reject) {
    window.setTimeout(function () {
      resolve('bar');
    }, 1000);
  });

});

// Require modules "foo" and "bar"
palikka.require(['foo', 'bar'], function (foo, bar) {
  console.log(foo + bar); // "foobar"
});
```

##Docs

**[Modules](#modules)**

* [.define()](#define)
* [.require()](#require)

**[Events](#events)**

* [.Eventizer()](#eventizer)
* [.Eventizer.prototype.on()](#eventizerprototypeon)
* [.Eventizer.prototype.off()](#eventizerprototypeoff)
* [.Eventizer.prototype.emit()](#eventizerprototypeemit)
* [.eventize()](#eventize)

**[Deferreds](#deferreds)**

* [.Deferred()](#deferred)
* [.Deferred.prototype.state()](#deferredprototypestate)
* [.Deferred.prototype.result()](#deferredprototyperesult)
* [.Deferred.prototype.resolve()](#deferredprototyperesolve)
* [.Deferred.prototype.reject()](#deferredprototypereject)
* [.Deferred.prototype.onFulfilled()](#deferredprototypeonfulfilled)
* [.Deferred.prototype.onRejected()](#deferredprototypeonrejected)
* [.Deferred.prototype.onSettled()](#deferredprototypeonsettled)
* [.Deferred.prototype.then()](#deferredprototypethen)
* [.Deferred.prototype.and()](#deferredprototypeand)
* [.when()](#when)

##Modules

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
  * If the factory is a plain object it is directly assigned as the module's value. If the factory is a function it is executed once after all dependencies have loaded and it's return value will be assigned as the module's value. If the return value is a deferred instance the module will be initiated when the deferred is resolved with the deferred's value assigned as the module's value.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array which contains ids of all modules that were successfully registered. If the array is empty it means that the module(s) was not registered, which is probably because a module with the same id already exists.

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

// Define a module using delayed initiation.
palikka.define('delayed', function () {
  return new palikka.Deferred(function (resolve) {
    window.setTimeout(function () {
      resolve('I am delayed...');
    }, 2000);
  });
});

// Define multiple modules at once.
// Handy for importing third party libraries.
var obj = {a: 'a', b: 'b'};
palikka.define(['a', 'b'], function () {
  return obj[this.id];
});
```

###.require()

Require a module. Loads modules at your disposal when they are loaded.

**Syntax**

`palikka.require( dependencies, callback )`

**Parameters**

* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Refer to `.define()` method's dependencies parameter description.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * The callback function that will be executed after all dependencies have loaded. Receives the required dependency modules as function arguments in the same order they were required.

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

##Events

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

###.Eventizer.prototype.on()

Bind a custom event listener to an Eventizer instance. The callback argument onSettled receives an event data object as it's first argument.

**Syntax**

`e.on( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.Eventizer.prototype.off()

Unbind a custom event listener from an Eventizer instance. If a callback function is not provided all listeners for the specified type will be removed, otherwise only the provided callback instances will be removed.

**Syntax**

`e.off( type [, cbRef] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **cbRef** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.Eventizer.prototype.emit()

Trigger a custom event within an Eventizer instance. Provided context and arguments will be applied to the callback functions.

**Syntax**

`e.emit( type [, args] [, context] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **args** &nbsp;&mdash;&nbsp; *array*
* **context** &nbsp;&mdash;&nbsp; *anything*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.eventize()

Creates a new Eventizer instance and returns it. If **obj** is provided the Eventizer instance's methods are ported to the provided object.

**Syntax**

`palikka.eventize( [obj] [, listeners] )`

**Parameters**

* **obj** &nbsp;&mdash;&nbsp; *object*
  * Optional. If an object is provided a new eventizer instance is created and it's methods are transported to the object.
* **listeners** &nbsp;&mdash;&nbsp; *object*
  * Optional. If an object is provided the eventizer instance's listeners are stored to the object.

**Returns** &nbsp;&mdash;&nbsp; *Eventizer / object*

Returns a new Eventizer instance or the object provided as **obj** argument.

##Deferreds

###.Deferred()

A constructor function that creates a deferred instance. The deferred is "thenable" and almost Promises/A+ compliant (slight deviations were made in favour of usability).

**Syntax**

`palikka.Deferred( [callback] )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Optional. The callback function has two arguments, *resolve* and *reject*, which can be used to resolve or reject the deferred.

**Usage**

```javascript
var defer = new palikka.Deferred(function (resolve, reject) {

  window.setTimeout(function () {
    resolve('done');
  }, Math.floor(Math.random() * 1000));

  window.setTimeout(function () {
    reject('fail');
  }, Math.floor(Math.random() * 1000));

});

defer
.onFulfilled(function (val) {
  console.log(val); // "done"
})
.onRejected(function (reason) {
  console.log(reason); // "fail"
})
.onSettled(function (val) {
  console.log(val); // "done" or "fail"
});
```

###.Deferred.prototype.state()

Retrieve the current state of the deferred: "pending", "resolved" or "rejected".

**Syntax**

`d.state()`

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

**Usage**

```javascript
var d1 = new palikka.Deferred();
var d2 = new palikka.Deferred();
console.log(d1.state()); // "pending"
console.log(d1.resolve().state()); // "resolved"
console.log(d2.reject().state()); // "rejected"
```

###.Deferred.prototype.result()

Retrieve the result value (the arguments with which the instance was resolved/rejected) of the instance.

**Syntax**

`d.result()`

**Returns** &nbsp;&mdash;&nbsp; *anything*

Returns `undefined` if deferred is pending otherwise returns the value the deferred was resolved/rejected with.

**Usage**

```javascript
var d1 = new palikka.Deferred();
var d2 = new palikka.Deferred();
d1.resolve(1).result(); // 1
d2.reject(2).result(); // 2
```

###.Deferred.prototype.resolve()

Resolve a deferred instance.

**Syntax**

`d.resolve( [result] )`

**Parameters**

* **result** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Defaults to `undefined`. A value that is passed on to the *onFulfilled* and *onSettled* callbacks. If this is another deferred the instance will wait for it to settle and then adopt it's fate.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.reject()

Reject a deferred instance.

**Syntax**

`d.reject( [reason] )`

**Parameters**

* **reason** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Defaults to undefined. A value (reason) that is passed on to the *onRejected* and *onSettled* callbacks.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onFulfilled()

Add a callback that will be called when the deferred is resolved.

**Syntax**

`d.onFulfilled( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is resolved.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onRejected()

Add a callback that will be called when the deferred is rejected.

**Syntax**

`d.onRejected( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onSettled()

Add a callback that will be called when the deferred is either resolved or rejected.

**Syntax**

`d.onSettled( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is either resolved or rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.then()

Chain deferreds. Returns a new deferred. Errors will "fall through" until they are "caught" with another `.then()` (with onRejected callback defined) in the same chain.

**Syntax**

`d.then( [onFulfilled] [, onRejected] )`

**Parameters**

* **onFulfilled** &nbsp;&mdash;&nbsp; *function*
  * Optional. Called when the deferred is resolved.
* **onRejected** &nbsp;&mdash;&nbsp; *function*
  * Optional. Called when the deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new deferred.

###.Deferred.prototype.and()

Returns a master deferred that resolves when all of the arguments and the instance have resolved.

`d.and( deferreds [, resolveOnFirst] [, rejectOnFirst] )`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array*
  * An `array` of deferreds, or any other values.
* **resolveOnFirst** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `false`. If `true` the master deferred will be resolved immediately when the first deferred is resolved.
* **rejectOnFirst** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `true`. If `true` the master deferred will be resolved immediately when the first deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new deferred.

###.when()

Returns a new deferred that will be resolved/rejected when all provided deferreds are resolved or rejected. Any non-deferred object within the deferreds array will be instantly resolved.

**Syntax**

`palikka.when( deferreds [, resolveOnFirst] [, rejectOnFirst] )`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array*
  * An `array` of deferreds, or any other values.
* **resolveOnFirst** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `false`. If `true` the master deferred will be resolved immediately when the first deferred is resolved.
* **rejectOnFirst** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `true`. If `true` the master deferred will be resolved immediately when the first deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

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
