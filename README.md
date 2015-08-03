#Palikka v0.4.1

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.4.1)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.4.1)](https://coveralls.io/r/niklasramo/palikka?branch=v0.4.1)

[<img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right"/>](http://promises-aplus.github.com/promises-spec)
The aim of this project is to provide a robust set of tools for creating reusable modules. Palikka consists of three core components: module system, event system and promise system (Promises/A+ 1.1 compliant). All components are highly optimized leveraging each other internally. All this goodness is dependency free, well tested/documented, works in the browser (IE7+) as well as Node.js and is delivered in a compact package (6.06kB minified, 2.63kB gzipped).

* **[Website](http://niklasramo.github.io/palikka)**
* **[Docs](https://github.com/niklasramo/palikka/wiki/v0.4.1-Docs)**
* **[Download](https://raw.githubusercontent.com/niklasramo/palikka/v0.4.1/palikka.js)**

##Getting started

Include [palikka.js](https://raw.githubusercontent.com/niklasramo/palikka/v0.4.1/palikka.js) somewhere on your site (before any code that requires Palikka).

```javascript
// Define module "foo" which requires module "bar"
palikka.define('foo', ['bar'], function (bar) {
  return 'foo';
});

// Define module "bar"
palikka.define('bar', function () {

  // Let's use a deferred to delay the initiation
  return palikka.defer(function (resolve, reject) {
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
