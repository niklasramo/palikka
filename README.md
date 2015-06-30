#Palikka v0.4.0

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.4.0)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.4.0)](https://coveralls.io/r/niklasramo/palikka?branch=v0.4.0)

Palikka is a lightweight and performant module/event/promise system that works in the browser (all the way down to IE7) and Node.js.

* **[Website](http://niklasramo.github.io/palikka)**
* **[Docs](https://github.com/niklasramo/palikka/wiki/v0.4.0-Docs)**
* **[Download](https://raw.githubusercontent.com/niklasramo/palikka/v0.4.0/palikka.js)**

##Why Palikka?

[<img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right"/>](http://promises-aplus.github.com/promises-spec)
Originally this project was intended just to provide a simple synchronous module system, but it has now expanded to also provide a solid event system and promises too. A case of feature creep? Perhaps. However, the original goal still remains. The module system has always used the event system internally so I thought why not expose it to the public API, right? After thinking about the architecture of the module system I realized that modules are actually pretty much like promises, but with names (or ids). So *then* came promises. In the end it makes a lot of sense to bundle these three different components together: the event system powers promises which in turn power the module system.

* Lightweight: 6.25kb minified and 2.6kb minified and gzipped.
* Works both in the browser (IE7+) and in Node.js.
* Promises/A+ 1.1 compliant.
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
