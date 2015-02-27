#Palikka v0.2.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.2.0-1)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.2.0-1)](https://coveralls.io/r/niklasramo/palikka?branch=v0.2.0-1)
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

**Public methods**

* [.define()](#define)
* [.undefine()](#undefine)
* [.require()](#require)
* [.assign()](#assign)

**Event system**

* [.on()](#on)
* [.off()](#off)
* [.emit()](#emit)
* [._Eventizer()](#_eventizer)

###.define()

Define a module. When a module is defined Palikka will instantly register the module, reserving the defined id for the module. If the id is already taken the module will not be registered. After all the dependencies, if any, have loaded the factory function is executed with the dependency modules as function arguments and init function set as context (this keyword). Palikka then waits for the init function to be executed with the module's value provided as the first argument. All modules are stored in `palikka._modules` object, which holds all the data about the modules. Please avoid defining circular modules (when two modules depend on each other) since there is currently no way of handling such situations and the modules just never get defined.

**Syntax**

`palikka.define( id [, dependencies] , factory )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string / object*
  * Optional. Define multiple dependencies as an array of module ids and a single dependency as a string. Alternatively you can provide an object of key value pairs where the key represents the dependency's id and the value represents the dependency's alias in the context data of factory function. Leave the alias as an empty string if you want to use the module's id as the alias. If you just want to load the dependency but not use it within the factory function, provide any other than string value as the module's alias (null for example).
* **factory** &nbsp;&mdash;&nbsp; *function / object*
  * If the factory argument is a plain object it is directly assigned as the module's value. If the argument is a function it is executed once after all dependencies have loaded and it receives the defined dependency modules as it's function arguments. If dependencies are defined as an object their references are stored in a single data object which is accesible via the first function argument. In other cases the dependency modules are provided as direct references in the function arguments (in the same order they are defined in dependency argument). The "this" keyword within factory's context refers to the module's initiation function which must be executed in order to initiate the module. The first argument of the initiation function will be assigned as the module's value.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `true` if module registration was successful, otherwise returns `false`.

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
```

&nbsp;

##Examples

Here are some examples and tips to get you started.

```javascript
// Modulize third party library to be used as a module.
// The library should be included in the page first though.
palikka.define('jQuery', function () {
  this(jQuery);
});

// If you have multiple libraries on the page already initiated
// and you want to import them as palikka modules all at once
// use the .assign() method to do that.
palikka.assign(['jQuery', 'Modernizr']);

// Define a custom module that requires "jQuery" module.
palikka.define('foo', ['jQuery'], function ($) {
  this('foo');
});

// Require "jQuery" and "foo" and make magic happen.
palikka.require(['jQuery', 'foo'], function ($, foo) {
  $('body').html(foo);
});

// Define a custom module that will wait for
// two seconds before it gets registered.
palikka.define(
  'bar',
  ['jQuery', 'foo'],
  function ($, foo) {
    var init = this;
    window.setTimeout(function () {
      init(foo + 'bar'); // foobar
    }, 2000);
  }
);

// Tip #1:
// Plain objects can be imported directly as modules.
// No need to use extra wrapper function here.
palikka.define('heavyMetal', {legend: 'Ronnie James Dio'});
palikka.require('heavyMetal', function (heavyMetal) {
  alert(heavyMetal.legend); // Ronnie James Dio
});

// Tip #2:
// Create a module that provides jQuery object when document is ready.
palikka.define(
  'docReady',
  ['jQuery'],
  function ($) {
    var init = this;
    $(function () { init($); });
  }
);
palikka.require('docReady', function ($) {
  alert('Document is definitely ready!');
});

// Tip #3:
// Use Palikka's built-in event system creator "Eventizer" to
// create a private event system for your module.
palikka.define('moduleA', function () {

  var m = {};

  // Initiate event system.
  palikka._Eventizer.call(m);

  // Emit "tick" event with "foo" and "bar" arguments every second.
  window.setInterval(function () {
    m.emit('tick', ['foo', 'bar']);
  }, 1000);

  this(m);

});
palikka.define('moduleB', ['moduleA'], function (moduleA) {

  var m = {};

  // Bind a listener to moduleA's "tick" event.
  moduleA.on('tick', function (ev, foo, bar) {

    // Event data
    console.log(this); // moduleA object
    console.log(ev.type); // Event type
    console.log(ev.fn); // The callback function
    console.log(foo); // "foo"
    console.log(bar); // "bar"

    // Unbind specific listener from moduleA's "tick" event.
    moduleA.off('tick', ev.fn);

  });

  this(m);

});

// Tip #4:
// Define a large list of dependencies as an object instead
// of an array for more control.
palikka.define(
  'bigModule',
  {
    jQuery: '$',
    foo: '',
    bar: null
  },
  function (deps) {
    // deps has props '$' and 'foo'.
    // Module 'bar' is required, but not accessbile within factory function.
    this('bigModuleValue');
  }
);

```

##Alternatives

You should definitely check out these module systems too.

* [RequireJS](http://requirejs.org/)
* [Browserify](http://browserify.org/)
* [modulejs](http://larsjung.de/modulejs/)

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
