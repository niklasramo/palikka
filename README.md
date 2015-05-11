#Palikka v0.3.1

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.1)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.1)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.1)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A compact and well-tested JavaScript module/event/promise system that works in the browser (all the way down to IE7) and Node.js. So, why bundle three different libraries together? Both a module and a promise system require an event system to work so it makes sense to optimize their synergies internally in order to keep the code DRY and performant. The primary goal of this project is to provide a solid [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) based module system.

* Lightweight, around 5.8kb minified and 2.3kb minified and gzipped.
* Works both in the browser (IE7+) and in Node.js.
* Well documented codebase.
* Comprehensive unit tests.
* No dependencies.

##Basic usage

Include [palikka.js](https://github.com/niklasramo/palikka/blob/v0.3.1/palikka.js) somewhere on your site (before any code that requires Palikka).

```javascript
// Define module "foo" which requires module "bar".
palikka.define('foo', ['bar'], function (bar) {
  return 'foo';
});

// Define module "bar".
palikka.define('bar', function () {

  // Use promises (deferred) to delay the initiation.
  return new palikka.Deferred(function (resolve, reject) {
    window.setTimeout(function () {
      resolve('bar');
    }, 1000);
  });

});

// Require modules "foo" and "bar".
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
* [.Eventizer.prototype.one()](#eventizerprototypeone)
* [.Eventizer.prototype.off()](#eventizerprototypeoff)
* [.Eventizer.prototype.emit()](#eventizerprototypeemit)
* [.Eventizer.prototype.emitAsync()](#eventizerprototypeemitasync)
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
* [.defer()](#defer)
* [.when()](#when)

##Modules

The Module system API is derived from [AMD spec](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) and [RequireJS API](http://requirejs.org/docs/api.html). However, Palikka does not do any file loading so it is not AMD compatible. The purpose of the module system is to make it possible to split the codebase into separate self-functioning units which know their dependencies. Palikka then makes sure that the dependencies are loaded before the module is defined. In essence Palikka's modules are named [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). The module system is tightly bound to Palikka's own promise system, [Deferreds](#deferreds).

The [`.define()`](#define) and [`.require()`](#require) methods are asynchronous by default, meaning that their factory/callback functions are called in the beginning of the next [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop), or more familiarly "next tick". Under the hood a module instance is basically just a lightweight wrapper around `.Deferred()` instance, which is asynchronous by default as per [Promises/A+](https://promisesaplus.com/) specification. However, this behaviour can be switched off forcing [`.define()`](#define) and [`.require()`](#require) to execute their factory/callback functions synchronously: `palikka._config.asyncModules = false`.

###.define()

Define a module.

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
  * If the factory is a plain object it is directly assigned as the module's value. If the factory is a function it is executed once after all dependencies have loaded and it's return value will be assigned as the module's value. If the return value is a deferred instance the module will be initiated when the deferred is resolved with the deferred's value assigned as the module's value. If the deferred is rejected the module will not be defined.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns palikka object, which means that you can chain `.define()` and `.require()` methods.

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
    setTimeout(function () {
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

Require modules (dependencies) and execute a function when they are loaded.

**Syntax**

`palikka.require( dependencies, callback )`

**Parameters**

* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Optional. Define multiple dependencies as an array of module ids and a single dependency as a string.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * The callback function that will be executed after all dependencies have loaded. Receives the required dependency modules as function arguments in the same order they were required.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns palikka object, which means that you can chain `.define()` and `.require()` methods.

**Usage**

```javascript
palikka
.define('foo', function () {
  return 'foo';
})
.define('bar', function () {
  return 'bar';
})
.require(['foo', 'bar'], function (foo, bar) {
  alert(foo + bar); // "foobar"
});
```

##Events

A very straightforward event system implementation with the ability to optionally emit events asynchronously.

###.Eventizer()

A constructor function that builds a fully functional "event hub" instance. All the event listeners are stored in a protected "listeners" object accesible via `instance._listeners`. However, it is not recommended to manipulate the object directly.

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
    console.log(ev.id); // a unique id (number), which can be used to unbind this specific callback
    console.log(ev.type); // "test"
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

Bind a custom event listener to an Eventizer instance. The callback argument receives an event data object as it's first argument.

**Syntax**

`e.on( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
  * The type of the event.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that will be executed, when this type of event is emitted.

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.Eventizer.prototype.one()

Same as `.Eventizer.prototype.on()` with the exeception that the callback function will be only executed once after which the event is automatically unbound.

**Syntax**

`e.one( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
  * The type of the event.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that will be executed, when this type of event is emitted.

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.Eventizer.prototype.off()

Unbind event listener(s) from an Eventizer instance.

**Syntax**

`e.off( type [, target] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
  * The type of the event.
* **target** &nbsp;&mdash;&nbsp; *function / number*
  * Optional. If not provided all listeners for the specified type will be removed. If a function is provided, all listeners which match the function will be removed. If an id (number) is provided only that specific listener will be removed which matches the id.

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

###.Eventizer.prototype.emitAsync()

Same as [`.Eventizer.prototype.emit()`](#eventizerprototypeemit) with the exeception that the event will be emitted in the next turn of [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop).

**Syntax**

`e.emitAsync( type [, args] [, context] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **args** &nbsp;&mdash;&nbsp; *array*
* **context** &nbsp;&mdash;&nbsp; *anything*

**Returns** &nbsp;&mdash;&nbsp; *Eventizer*

Returns the instance that called the method.

###.eventize()

Creates and returns a new Eventizer instance.

**Syntax**

`palikka.eventize( [obj] [, listeners] )`

**Parameters**

* **obj** &nbsp;&mdash;&nbsp; *object*
  * Optional. If an object is provided a new eventizer instance is created and it's methods are transported to the object.
* **listeners** &nbsp;&mdash;&nbsp; *object*
  * Optional. If an object is provided the eventizer instance's listeners are stored to the object.

**Returns** &nbsp;&mdash;&nbsp; *Eventizer / object*

Returns a new Eventizer instance, or if the **obj** argument was provided returns the provided object.

##Deferreds

Palikka's promises are called "deferreds". Please, do note that the `.Deferred()` constructor is not a polyfill for native ES6 Promise, but it does follow the [Promises/A+ v1.1](https://promisesaplus.com/) specification.

By default the callback methods are called asynchronously in the beginning of the next [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop) (as per Promises/A+ v1.1 specification). However, deferreds can be configured to work synchronously also: `palikka._config.asyncDeferreds = false`. Please note that turning synchronous behaviour on is against the Promises/A+ v1.1 specification, so do that only if you know what you are doing.

###.Deferred()

A constructor function that creates a deferred instance, which is a spiced up version of the native ES6 Promise and [Promises/A+ v1.1](https://promisesaplus.com/) compliant.

**Syntax**

`palikka.Deferred( [executor] )`

**Parameters**

* **executor** &nbsp;&mdash;&nbsp; *function*
  * Optional. The executor function has two arguments, `resolve` and `reject` functions, which can be used to resolve or reject the deferred.

**Usage**

```javascript
var defer = new palikka.Deferred(function (resolve, reject) {

  setTimeout(function () {
    resolve('done');
  }, Math.floor(Math.random() * 1000));

  setTimeout(function () {
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

Retrieve the current state of the deferred.

**Syntax**

`deferred.state()`

**Returns** &nbsp;&mdash;&nbsp; *string*

Returns the state of the deferred instance: "pending", "resolved" or "rejected".

**Usage**

```javascript
var d1 = new palikka.Deferred();
var d2 = new palikka.Deferred();
console.log(d1.state()); // "pending"
console.log(d1.resolve().state()); // "resolved"
console.log(d2.reject().state()); // "rejected"
```

###.Deferred.prototype.result()

Retrieve the result, the value with which the deferred instance was resolved or rejected, of the deferred instance.

**Syntax**

`deferred.result()`

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

Resolve the deferred instance.

**Syntax**

`deferred.resolve( [result] )`

**Parameters**

* **result** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Defaults to `undefined`. A value that is passed on to the `onFulfilled` and `onSettled` callbacks. If result is another deferred the current deferred instance will wait for the provided deferred to settle and then adopt it's fate. Resolving a deferred with itself as the value is not allowed and will result in an error.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.reject()

Reject the deferred instance.

**Syntax**

`deferred.reject( [reason] )`

**Parameters**

* **reason** &nbsp;&mdash;&nbsp; *anything*
  * Optional. Defaults to `undefined`. A reason for rejection which is passed on to the `onRejected` and `onSettled` callbacks.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onFulfilled()

Add a callback that will be called when the deferred is resolved.

**Syntax**

`deferred.onFulfilled( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is resolved.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onRejected()

Add a callback that will be called when the deferred is rejected.

**Syntax**

`deferred.onRejected( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.onSettled()

Add a callback that will be called when the deferred is either resolved or rejected.

**Syntax**

`deferred.onSettled( callback )`

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
  * Called when the deferred is either resolved or rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns the instance that called the method.

###.Deferred.prototype.then()

Chain deferreds. Returns a new deferred. Thrown errors will be automatically silenced and will fall down the `.then()` method chain until they are "caught" with `.then(null, onRejected)`. Note that `.onRejected()` and `.onSettled()` callback methods will not catch thrown errors. They can access the error, but it will continue to fall down the `.then()` method chain.

**Syntax**

`deferred.then( [onFulfilled] [, onRejected] )`

**Parameters**

* **onFulfilled** &nbsp;&mdash;&nbsp; *function*
  * Optional. Called when the deferred is resolved.
* **onRejected** &nbsp;&mdash;&nbsp; *function*
  * Optional. Called when the deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new deferred.

###.Deferred.prototype.and()

This method is basically just a wrapper for [`.when()`](#when) with the addition that the deferred instance which called the method is automatically included in the deferreds argument.

`deferred.and( deferreds [, resolveImmediately] [, rejectImmediately] )`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array*
  * An `array` of deferreds, or any other values.
* **resolveImmediately** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `false`. If `true` the master deferred will be resolved immediately when the first deferred is resolved.
* **rejectImmediately** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `true`. If `true` the master deferred will be resolved immediately when the first deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

Returns a new deferred.

###.defer()

Create and return a new deferred instance. Shorthand for `new palikka.Deferred()`.

**Syntax**

`palikka.defer( [executor] )`

**Parameters**

* **executor** &nbsp;&mdash;&nbsp; *function*
  * Optional. The executor function has two arguments, `resolve` and `reject` functions, which can be used to resolve or reject the deferred.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

###.when()

Returns a new master deferred that will be resolved when all provided deferreds are resolved. By default the master deferred will be rejected instantly when one of the provided deferreds is rejected. Any non-deferred object will be turned into a deferred and resolved immediately with the object itself as the fulfillment value.

**Syntax**

`palikka.when( deferreds [, resolveImmediately] [, rejectImmediately] )`

**Parameters**

* **deferreds** &nbsp;&mdash;&nbsp; *array*
  * An `array` of deferreds, or any other objects.
* **resolveImmediately** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `false`. If `true` the master deferred will be resolved immediately when the first deferred is resolved.
* **rejectImmediately** &nbsp;&mdash;&nbsp; *boolean*
  * Optional. Defaults to `true`. If `true` the master deferred will be resolved immediately when the first deferred is rejected.

**Returns** &nbsp;&mdash;&nbsp; *Deferred*

##Advanced examples

**Importing third party libraries as Palikka modules**

Not all JavaScript libraries are palikka modules, so we have tried to make importing third party libraries as easy as possible. Assuming all third party libraries populate a namespace in window object we can import (define) multiple modules at once. In the example below we assume that jQuery and Modernizr are loaded before executing the script.

```
<script src="palikka.js"></script>
<script src="jquery.js"></script>
<script src="modernizr.js"></script>
<script>
palikka.define(['jQuery', 'Modernizr'], function () {
  // We assume that the id of the library matches it’s global namespace
  return window[this.id];
});
</script>
```

The problem with the above way of importing is that we have to just trust that the imported objects exist. Taking the import script a bit further we can add a little polling function that will import the object as soon as it exists. You might want to add some extra logic to the script, e.g. limiting the total amount of poll events, but this is a good starting point.

```
<script src="palikka.js"></script>
<script>
palikka.define(['jQuery', 'Modernizr'], function () {
  var id = this.id;
  return palikka.defer(function (resolve) {
    var poller = setInterval(function () {
      if (id in window) {
        clearInterval(poller);
        resolve(window[id]);
      }
    }, 20);
  });
});
</script>
<script src="jquery.js"></script>
<script src="modernizr.js"></script>
```

##Alternatives

**Modules**

* [RequireJS](http://requirejs.org/)
* [Browserify](http://browserify.org/)
* [webpack](http://webpack.github.io/)
* [SystemJS](https://github.com/systemjs/systemjs)
* [modulejs](http://larsjung.de/modulejs/)

**Promises**

* [Q](https://github.com/kriskowal/q)
* [RSVP.js](https://github.com/tildeio/rsvp.js/)
* [Bluebird](https://github.com/petkaantonov/bluebird)

**Events**

* [JS-Signals](https://github.com/millermedeiros/js-signals)
* [EventEmitter](https://github.com/Wolfy87/EventEmitter)
* [microevent](https://github.com/jeromeetienne/microevent.js)
* [minivents](https://github.com/allouis/minivents)
* [bullet](https://github.com/munkychop/bullet)

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
