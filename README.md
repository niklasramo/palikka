#Palikka v0.3.0-beta

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.0-beta)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.0-beta)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.0-beta)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A tiny JavaScript module system that allows you to define modules and manage dependencies between them. Palikka makes sure that modules are loaded synchronously, respecting the dependencies, even if your module definitions are included in a mixed order. The API is based on [Asynchronous Module Definition (AMD)](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) with the exception that Palikka is not actually a module *loader* (it does not load JavaScript files for you).

##Features

* Lightweight, around 2kb minified.
* Excellent browser support (IE7+).
* Well documented codebase (JSDoc syntax).
* Comprehensive unit tests (Qunit).
* No dependencies.
* Works in browser and Node.js.

## Usage

Include [palikka.js](https://github.com/niklasramo/palikka/blob/v0.2.0/palikka.js) somewhere in your page and start defining and requiring modules.

```javascript
// Define module "foo" which requires module "bar"
palikka.define('foo', ['bar'], function (bar) {
  return 'foo';
});

// Define module "bar" using async initiation
palikka.define('bar', function () {
  var init = this.async();
  window.setTimeout(function () {
    init('bar');
  }, 1000);
});

// Require modules "foo" and "bar"
palikka.require(['foo', 'bar'], function (foo, bar) {
  alert(foo + bar); // "foobar"
});
```

##API

* [.define()](#define)
* [.undefine()](#undefine)
* [.require()](#require)

**Event system**

* [.on()](#on)
* [.off()](#off)
* [.emit()](#emit)
* [._Eventizer()](#_eventizer)

&nbsp;

###.define()

Define a module. All modules are stored in `palikka._modules` object, which holds all the data about the modules. Please avoid defining circular modules (when two modules depend on each other) since there is currently no way of handling such situations and the modules just never get defined.

**Syntax**

`palikka.define( id [, dependencies] , factory )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *array / string*
  * Module id(s). Each module must have a unique id.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Optional. Define multiple dependencies as an array of module ids and a single dependency as a string.
* **factory** &nbsp;&mdash;&nbsp; *function / object*
  * If the factory is a plain object it is directly assigned as the module's value. If the argument is a function it is executed once after all dependencies have loaded and it's return value will be assigned as the module's value. The factory callback receives the defined dependency modules as it's function arguments. The factory callback's context object (this keyword) contains the following properties: id (string, module's id), dependencies (object, list of the dependencies), async (function, defers module initiation).

**Returns** &nbsp;&mdash;&nbsp; *number*

Returns an integer which represents the number of succesful module registrations.

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

`palikka.undefine( id )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `false` if the module exists and is used as a dependency, otherwise returns `true`. Note that undefining a non-existent module returns `true` also.

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
palikka.undefine('foo'); // Returns false

// "bar" module can be undefined since it is
// not required by other modules yet.
palikka.undefine('bar'); // Return true
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

###Event system API

Palikka has an internal event system that is used to check when a module's dependencies are loaded. The event system is created using a simple constructor class `palikka._Eventizer` which can create `.on()`, `.off()` and `.emit()` methods for any object. This constructor class is useful when you want to create a private event system within your custom module and therefore it is a part of the public API as a "semi-private" class.

Palikka's own `.on()`, `.off()` and `.emit()` methods are intended only for dealing with Palikka specific events ("register" and "initiate"), but they can be used also as a central event hub between all modules if needed. When a module is registered "register-moduleId" and "register" events are emitted. When a module is initiated "initiate-moduleId" and "initiate" events are emitted. All four events provide event data as the first callback function argument and module data as the second argument.

&nbsp;

###.on()

Bind a custom even listener. The callback argument always receives an event data object as it's first argument.

**Syntax**

`palikka.on( type, callback )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

&nbsp;

###.off()

Unbind a custom even listener. If a callback function is not provided all listeners for the specified type will be removed, otherwise only the provided callback instances will be removed.

**Syntax**

`palikka.off( type [, callback] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **callback** &nbsp;&mdash;&nbsp; *function*

&nbsp;

###.emit()

Trigger a custom event. Provided arguments will be applied to the callback functions.

**Syntax**

`palikka.emit( type [, args] )`

**Parameters**

* **type** &nbsp;&mdash;&nbsp; *string*
* **args** &nbsp;&mdash;&nbsp; *array*

&nbsp;

###._Eventizer()

Creates an event system by adding on, off and emit methods to an object. All event listeners are stored to semi-private "_listeners" property which is also added to the object.

**Syntax**

`palikka._Eventizer( [listeners] )`

**Parameters**

* **listeners** &nbsp;&mdash;&nbsp; *object*
  * Optional. Defaults to `{}`. Provide an object where all the event listeners will be stored.

**Usage**

```javascript
// Initiate using new keyword.
var eventSystem1 = new palikka._Eventizer();

// Initiate using an existing object.
var eventSystem2 = {};
palikka._Eventizer.call(eventSystem2);

// Create a private event system for a module.
palikka.define('foo', function () {

  var m = {
    foo: 'foo'
  };

  // Initiate event system for m object.
  palikka._Eventizer.call(m);

  // Emit "tick" event with "a" and "b" arguments every second.
  window.setInterval(function () {
    m.emit('tick', ['a', 'b']);
  }, 1000);

  return m;

});
palikka.require(['foo'], function (foo) {

  // Bind a listener to foo's "tick" event.
  foo.on('tick', function (ev, a, b) {

    // Event data
    console.log(this); // foo module
    console.log(ev.type); // Event type
    console.log(ev.fn); // Event listener callback function
    console.log(a); // "a"
    console.log(b); // "b"

    // Let's unbind the event listener after first execution.
    foo.off('tick', ev.fn);

  });

});

```

&nbsp;

##Alternatives

You should definitely check out these module systems too.

* [RequireJS](http://requirejs.org/)
* [Browserify](http://browserify.org/)
* [modulejs](http://larsjung.de/modulejs/)

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
