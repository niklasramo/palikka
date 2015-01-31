#Palikka

A hassle-free asynchronous JavaScript module loader that allows you to define and require modules in the browser with a dead simple API.

##Features

* Lightweight (~1.5kb).
* Excellent browser support (IE7+).
* Well documented codebase (JSDoc syntax).
* Comprehensive unit tests (Qunit).
* No dependencies.

## Usage

```html
<script src="https://code.jquery.com/jquery.min.js"></script>

```

##API 0.1.0-1

* [.define()](#define)
* [.require()](#require)

###.define()

Define a module.

**Syntax**

`palikka.define( name [, deps] , cb [, async] )`

**Parameters**

* **name** &nbsp;&mdash;&nbsp; *string*
  * Name of the module.
* **deps** &nbsp;&mdash;&nbsp; *array*
  * Optional. Define module dependencies as an array of strings.
* **cb** &nbsp;&mdash;&nbsp; *function*
  * The module definition function which's return value will be stored as the module's value. Provides the dependency modules as arguments in the same order they were required.
* **async** &nbsp;&mdash;&nbsp; *function*
  * Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.

&nbsp;

###.require()

Require a module.

**Syntax**

`palikka.require( [deps] , cb)`

**Parameters**

* **deps** &nbsp;&mdash;&nbsp; *array*
  * Optional. Define module dependencies as an array of strings.
* **cb** &nbsp;&mdash;&nbsp; *function*
  * The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.

##Examples

Here are some examples and tips to get you started.

```javascript
// Modulize third party library to be used as a module.
// The library should be included it in the site first though.
palikka.define('jquery', function () {
  return jQuery;
});

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
