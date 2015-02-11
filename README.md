#Palikka v0.1.3

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.1.3)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.1.3)](https://coveralls.io/r/niklasramo/palikka?branch=master)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A tiny JavaScript module system that allows you to define modules and manage dependencies between them. The API is based on [Asynchronous Module Definition (AMD)](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) with the exception that Palikka is not actually a module *loader*, meaning that it does not load JavaScript files for you.

##Features

* Lightweight, around 2kb minified.
* Excellent browser support (IE7+).
* Well documented codebase (JSDoc syntax).
* Comprehensive unit tests (Qunit).
* No dependencies.

## Usage

Include [palikka.js](https://github.com/niklasramo/palikka/blob/v0.1.3/palikka.js) somewhere in your page and start defining and requiring modules.

```javascript
// Define module "foo" which requires module "bar"
palikka.define('foo', ['bar'], function (bar) {
  return 'foo';
});
// Define module "bar"
palikka.define('bar', function () {
  return 'bar';
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
* [.get()](#get)

###.define()

Define a module. All modules get stored in `palikka.modules` object. Please avoid defining circular modules (when two modules depend on each other) since there is currently no way of handling such situations and the modules just never get defined.

**Syntax**

`palikka.define( id [, dependencies] , factory [, deferred] )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Optional. Define dependencies as an array of modules ids. Optionally you can just specify a single module id as a string.
* **factory** &nbsp;&mdash;&nbsp; *function / object*
  * If the factory argument is a function it is executed once and the return value is assigned as the value for the module. If the factory argument is a plain object it is directly assigned as the module's value.
* **deferred** &nbsp;&mdash;&nbsp; *function*
  * Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `true` if definition was successful, otherwise returns `false`.

&nbsp;

###.undefine()

Undefine a module. Please keep in mind that if any other `define` or `require` instance depends on the module it cannot be undefined.

**Syntax**

`palikka.undefine( id  )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `false` if the module exists and is used as a dependency, otherwise returns `true`. Note that undefining a non-existent module returns `true` also.

&nbsp;

###.require()

Require a module.

**Syntax**

`palikka.require( dependencies, callback)`

**Parameters**

* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Define dependencies as an array of modules ids. Optionally you can just specify a single module id as a string.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.

&nbsp;

###.get()

Import object properties as modules. Basically this is just a wrapper for define method that allows you to define multiple modules quickly.

**Syntax**

`palikka.get( properties [, of] )`

**Parameters**

* **properties** &nbsp;&mdash;&nbsp; *array / string*
  * Define property names to be imported.
* **of** &nbsp;&mdash;&nbsp; *object*
  * Optional. Defaults to window. Define the object where to look for the defined properties.

##Examples

Here are some examples and tips to get you started.

```javascript
// Modulize third party library to be used as a module.
// The library should be included in the page first though.
palikka.define('jQuery', function () {
  return jQuery;
});

// If you have multiple libraries on the page already initiated
// and you want to import them as palikka modules all at once
// use the .get() method to do that.
palikka.get(['jQuery', 'Modernizr']);

// Define a custom module that requires "jQuery" module.
palikka.define('foo', ['jQuery'], function ($) {
  return 'foo';
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
    return foo + 'bar'; // foobar
  },
  function (cb, $, foo) {
    window.setTimeout(cb, 2000);
  }
);

// Tip #1:
// Plain objects can be imported directly as modules.
// No need to use extra wrapper function here.
palikka.define('heavyMetal', {rjd: 'Ronnie James Dio'});
palikka.require('heavyMetal', function (heavyMetal) {
  alert(heavyMetal.rjd); // Ronnie James Dio
});

// Tip #2:
// Create a module that provides jQuery object when document is ready.
palikka.define(
  'docReady',
  ['jQuery'],
  function ($) { return $; },
  function (cb, $) { $(cb); }
);
palikka.require('docReady', function ($) {
  alert('Document is definitely ready!');
});

// Tip #3:
// Using Palikka's built-in event system to emit and listen events.
// Note that the event system is still work in progress and may be subject to changes.
// Please refer to the palikka.js source code for more detailed API documentation. 
palikka.define('moduleA', function () {

  var m = {};

  // Initiate event system.
  palikka._Eventizer.call(m);

  // Emit "tick" event with "foo" and "bar" arguments every second.
  window.setInterval(function () {
    m.emit('tick', ['foo', 'bar']);
  }, 1000);

  return m;

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

  return m;

});

```

##Roadmap to version 1.0.0

Palikka is already production ready and unit tested, but here are some things to consider and possibly implement before getting to v1.0.0.

* **Event system**
  * The built-in event system, which is used to emit and listen module initiation events, is initiated with a reusable event controller class which could be useful for allowing modules to create their own private event systems easily. So it might make sense to bring this functionality as a part of the public API instead of hiding it as a private member. However, Palikka is not intended as an event emitter library so maybe this is a bad idea.
* **Module versioning**
  * Should we add some way to add version number to the module and make it possible to require spedific version(s) of a module? This would be especially helpful with third party libraries that are imported as modules. Naturally this would be a n optional feature.
* **Circular modules handling**
  * Should we handle circular modules at all or not?
* **Error reporting**
  * Should the library's methods fail silently or output error messages?

##Alternatives

You should definitely check out these module systems too.

* [RequireJS](http://requirejs.org/)
* [Browserify](http://browserify.org/)
* [modulejs](http://larsjung.de/modulejs/)

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
