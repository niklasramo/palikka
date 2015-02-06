#Palikka v0.1.1

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=master)](https://travis-ci.org/niklasramo/palikka)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A tiny JavaScript module system that allows you to define modules and manage dependencies between them. The API is based on [Asynchronous Module Definition (AMD)](https://github.com/amdjs/amdjs-api/blob/master/AMD.md) with the exception that Palikka is not actually a module *loader*, meaning that it does not load JavaScript files for you.

##Features

* Lightweight, around 2kb minified.
* Excellent browser support (IE7+).
* Well documented codebase (JSDoc syntax).
* Comprehensive unit tests (Qunit).
* No dependencies.

## Usage

Include [palikka.js](palikka.js) somewhere in your page and start defining and requiring modules.

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

Undefine a module. Please keep in mind that if any other `define` or `require` instance depends on the module it cannot be undefined. Palikka has an internal system which marks the module as *locked* (can't be undefined) when the module is set as a dependency.

**Syntax**

`palikka.undefine( id  )`

**Parameters**

* **id** &nbsp;&mdash;&nbsp; *string*
  * Id of the module.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

Returns `true` if undefinition was successful, otherwise returns `false`.

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
palikka.define('jquery', function () {
  return jQuery;
});

// If you have multiple libraries on the page already initiated
// and you want to import them as palikka modules all at once
// use the .get() method to do that.
palikka.get(['jQuery', 'Modernizr']);

// Define a custom module that requires "jquery" module.
palikka.define('foo', ['jquery'], function ($) {
  return 'foo';
});

// Require "jquery" and "foo" and make magic happen.
palikka.require(['jquery', 'foo'], function ($, foo) {
  // Write magical code here...
});

// Define a custom module that will wait for
// two seconds before it gets registered.
palikka.define(
  'bar',
  ['jquery', 'foo'],
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
palikka.define('heavy-metal', {rjd: 'Ronnie James Dio'});

// Tip #2:
// Create a module that provides jQuery object when document is ready.
palikka.define(
  'docready',
  ['jquery'],
  function ($) { return $; },
  function (cb, $) { $(cb); }
);
// And require it like this.
palikka.require(['docready'], function ($) {
  alert('Document is definitely ready!');
});

```

##Roadmap to version 1.0.0

The library is already production ready and unit tested, but here are some things to consider and possibly implement before geting to 1.0.0 version.

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
