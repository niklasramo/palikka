#Palikka v0.1.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=master)](https://travis-ci.org/niklasramo/palikka)
[![Bower version](https://badge.fury.io/bo/palikka.svg)](http://badge.fury.io/bo/palikka)

A hassle-free asynchronous JavaScript module loader that allows you to define and require modules in the browser with a simple AMD style API.

##Download

**[Palikka v0.1.0](palikka.js)**

##Features

* Lightweight, around 1.5kb minified.
* Excellent browser support (IE7+).
* Well documented codebase (JSDoc syntax).
* Comprehensive unit tests (Qunit).
* No dependencies.

## Usage

Download palikka.js, include it somewhere in your page and start defining and requiring modules.

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

##API 0.1.0

* [.define()](#define)
* [.require()](#require)
* [.get()](#get)

###.define()

Define a module. All modules get stored in `palikka.modules` object. Please avoid defining circular modules (when two modules depend on each other) since there is currently no way of handling such situations and the modules just never get defined.

**Syntax**

`palikka.define( name [, dependencies] , defCallback [, asyncCallback] )`

**Parameters**

* **name** &nbsp;&mdash;&nbsp; *string*
  * Name of the module.
* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Optional. Define dependencies as an array of modules names. Optionally you can just specify a single module name as a string.
* **defCallback** &nbsp;&mdash;&nbsp; *function*
  * The module definition function which's return value will be stored as the module's value. Provides the dependency modules as arguments in the same order they were required.
* **asyncCallback** &nbsp;&mdash;&nbsp; *function*
  * Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.

&nbsp;

###.require()

Require a module.

**Syntax**

`palikka.require( dependencies, callback)`

**Parameters**

* **dependencies** &nbsp;&mdash;&nbsp; *array / string*
  * Define dependencies as an array of modules names. Optionally you can just specify a single module name as a string.
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

// Tip! Create a module that provides jQuery object when document is ready.
palikka.define(
  'docready',
  ['jquery'],
  function ($) { return $; },
  function (cb, $) { $(cb); }
);

// And require it like this.
palikka.require(['docready'], function ($) {
  alert('Document is ready!');
});

```

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
