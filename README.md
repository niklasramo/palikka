#Palikka v0.3.2

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.2)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.2)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.2)

[<img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right"/>](http://promises-aplus.github.com/promises-spec)
In a nutshell Palikka is a lightweight and performant module/event/promise system that works in the browser (all the way down to IE7) and Node.js. The primary goal of this project is to provide a solid Promise based module system, but that's just half of the story. Palikka uses it's own event system and promise system, both of which are exposed to pulic API, to manage the module system so you are getting a triple treat here. No code wasted.

* **[Website](http://niklasramo.github.io/palikka)**
* **[Docs](https://github.com/niklasramo/palikka/wiki/v0.3.2-Docs)**
* **[Download](https://raw.githubusercontent.com/niklasramo/palikka/v0.3.2/palikka.js)**

##Why Palikka?

* Lightweight: 6.26kb minified and 2.6kb minified and gzipped.
* Works both in the browser (IE7+) and in Node.js.
* Well documented codebase.
* Comprehensive unit tests.
* No dependencies.

##Getting started

Include [palikka.js](https://raw.githubusercontent.com/niklasramo/palikka/v0.3.2/palikka.js) somewhere on your site (before any code that requires Palikka).

```javascript
// Define module "foo" which requires module "bar"
palikka.define('foo', ['bar'], function (bar) {
  return 'foo';
});

// Define module "bar"
palikka.define('bar', function () {

  // Let's use a deferred to delay the initiation
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

##License

Copyright &copy; 2015 Niklas Rämö. Licensed under **[the MIT license](LICENSE.md)**.
