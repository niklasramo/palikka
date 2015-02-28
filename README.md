#Palikka v0.2.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.2.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.2.0)](https://coveralls.io/r/niklasramo/palikka?branch=v0.2.0)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A tiny JavaScript module system that allows you to define modules and manage dependencies between them. Palikka makes sure that modules are loaded synchronously, respecting the dependencies, even if your module definitions are included in a mixed order. The API is based on [Asynchronous Module Definition (AMD)](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) with the exception that Palikka is not actually a module *loader*, meaning that it does not load JavaScript files for you.

##Features

* Lightweight, around 2.4kb minified.
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
  this('foo');
});

// Define module "bar" using delayed initiation
palikka.define('bar', function () {
  var init = this;
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
* [.assign()](#assign)

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

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string / object*
  * Optional. Define multiple dependencies as an array of module ids and a single dependency as a string. Alternatively you can provide an object of key value pairs where the key represents the dependency's id and the value represents the dependency's property name in the dependencies argument of factory function. Leave the alias as an empty string if you want to use the module's id as the alias. If you just want to load the dependency but not use it within the factory function, provide any other than string value as the module's alias (null for example).
* **factory** &nbsp;&mdash;&nbsp; *function / object*
  * If the factory argument is a plain object it is directly assigned as the module's value. If the argument is a function it is executed once after all dependencies have loaded and it receives the defined dependency modules as it's function arguments. If dependencies are defined as an object their references are stored in a single data object which is accesible via the first function argument. In other cases the dependency modules are provided as direct references in the function arguments (in the same order they are defined in dependency argument). The "this" keyword within factory's context refers to the module's initiation function which must be executed in order to initiate the module. The first argument of the initiation function will be assigned as the module's value.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `true` if module registration was successful, otherwise returns `false`.

**Usage**

```javascript
// Define a module by using the init function
// which is always provided as factory's context.
palikka.define('foo', function () {
  this('foo');
});

// Define a module by returning the module's value.
palikka.define('foo', function () {
  return 'foo';
});

// Define a plain object as module.
palikka.define('foo', {foo: 'foo'});

// Define a module with dependencies.
palikka.define('foobar', ['foo'], function (foo) {
  this(foo + 'bar'); // "foobar"
});

// Define module a module using delayed initiation.
palikka.define(
  'slow',
  function () {
    var init = this;
    window.setTimeout(function () {
      init('slow');
    }, 2000);
  }
);

// Define a module with a dependencies as an object.
palikka.define(
  'x',
  {
    jQuery: '$',
    foo: '',
    bar: null
  },
  function (deps) {
    // deps has props '$' and 'foo'.
    this('dependant');
  }
);
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
  this('foo');
});
palikka.define('bar', ['foo'], function () {
  this('bar');
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
  this('foo');
});
palikka.define('bar', function () {
  this('bar');
});
palikka.require(['foo', 'bar'], function (foo, bar) {
  // Do your stuff here.
});
```

&nbsp;

###.assign()

Assign properties of an object to be defined as modules. In essence this is just a wrapper for define method that allows you to define multiple modules quickly. Very useful for importing third party libraries into Palikka's context as modules.

**Syntax**

`palikka.assign( properties [, of] )`

**Parameters**

* **properties** &nbsp;&mdash;&nbsp; *array / string*
  * Define property names to be imported.
* **of** &nbsp;&mdash;&nbsp; *object*
  * Optional. Defaults to `window` in browser and `global` in node. Define the object where to look for the defined properties.

**Usage**

```javascript
var obj = {
  a: 'a',
  b: 'b'
};
window.foo = 'foo';
window.bar = 'bar';

// By default assign looks the properties
// from window/global object.
palikka.assign(['foo', 'bar']);

// You can tell assign method the object
// where to look the properties from.
palikka.assign(['a', 'b'], obj);
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

  this(m);

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
