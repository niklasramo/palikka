#Palikka v0.3.2

[![Build Status](https://travis-ci.org/niklasramo/palikka.svg?branch=v0.3.2)](https://travis-ci.org/niklasramo/palikka)
[![Coverage Status](https://coveralls.io/repos/niklasramo/palikka/badge.svg?branch=v0.3.2)](https://coveralls.io/r/niklasramo/palikka?branch=v0.3.2)

A compact module system that works in the browser (all the way down to IE7) and Node.js. Palikka uses it's own event system and promise system, both of which are exposed to pulic API, to manage the module system so you are getting a triple threat here. No code wasted. The idea is to optimize the synergies of all three components internally to keep the code DRY and performant.

* **[Project website](http://niklasramo.github.io/palikka)**
* **[API documentation](http://niklasramo.github.io/palikka/0.3.2)**
* **[Download v0.3.2](https://raw.githubusercontent.com/niklasramo/palikka/v0.3.2/palikka.js)**

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
