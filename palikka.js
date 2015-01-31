/*!
 * Palikka v0.1.0-1
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * Date: 2015-01-31T19:58:15.743Z
 */

/**
 * @todo A simple method to define multiple modules simultaneously and intelligently -> palikka.define(['jQuery', 'Selectize'])
 * @todo Create tests for detecting memory leaks.
 * @todo Some perf tests maybe?
 * @todo define(name, [deps], cb, [async]) VS define(name, [deps], [async], cb)
 */

(function (global, undefined) {

  var
  ns = 'palikka',
  lib = {},
  modules = {},
  doc = document,
  root = doc.documentElement,
  eventListenersSupported = root.addEventListener;

  /** Expose library to global object */
  lib.modules = modules;
  global[ns] = lib;

  /**
   * Define a module.
   *
   * @public
   * @param {string} name - Name of the module.
   * @param {array} [deps] - Optional. Define module dependencies as an array of strings.
   * @param {function} cb - The module definition function which's return value will be stored as the module's value. Provides the dependency modules as arguments in the same order they were required.
   * @param {function} [async] - Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.
   */

  lib.define = function (name, deps, cb, async) {

    var
    _deps = lib._typeof(deps, 'array') ? deps : [],
    _cb = lib._typeof(deps, 'function') ? deps : cb,
    _async = lib._typeof(deps, 'function') ? cb : async;

    if (!lib._typeof(_cb, 'function')) {
      return;
    }

    lib._loadDeps(_deps, function (depModules) {

      if (lib._typeof(_async, 'function')) {

        var
        asyncArgs = depModules.slice(0),
        asyncCb = function () {
          lib._register(name, _cb, depModules);
        };

        asyncArgs.unshift(asyncCb);

        _async.apply(null, asyncArgs);

      }
      else {

        lib._register(name, _cb, depModules);

      }

    });

  };

  /**
   * Require a module.
   *
   * @public
   * @param {array} [deps] - Define module dependencies as an array of strings.
   * @param {function} cb - The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.
   */
  lib.require = function (deps, cb) {

    deps = lib._typeof(deps, 'array') ? deps : [];

    if (!lib._typeof(cb, 'function')) {
      return;
    }

    lib._loadDeps(deps, function (depModules) {
      cb.apply(null, depModules);
    });

  };

  /**
   * Register module
   *
   * @private
   * @param {string} name
   * @param {function} cb
   * @param {array} cbArgs
   */
  lib._register = function (name, cb, cbArgs) {

    if (!modules.hasOwnProperty(name)) {
      modules[name] = cb.apply(null, cbArgs);
      lib._trigger(ns + name);
    }

  };

  /**
   * Load dependencies by their names and return a deferred object that will be resolved when the all dependencies are loaded.
   *
   * @private
   * @param {array} deps
   * @param {function} cb
   */
  lib._loadDeps = function (deps, cb) {

    var
    depModules = [],
    depsLength = deps.length,
    depsReadyCounter = 0,
    depsReadyCallback = function () {

      if (depsLength) {
        for (var i = 0; i < depsLength; i++) {
          var depName = deps[i];
          depModules.push(modules[depName]);
        }
      }

      if (lib._typeof(cb, 'function')) {
        cb(depModules);
      }

    };

    if (depsLength) {

      for (var i = 0; i < depsLength; i++) {
        (function (i) {

          var
          depName = deps[i],
          evName = ns + depName,
          evHandler = function (e) {

            /** IE 8/7 Hack  */
            if (!eventListenersSupported && e && e.propertyName && e.propertyName !== evName) {
              return;
            }

            ++depsReadyCounter;

            if (e !== 0) {
              lib._off(evName, evHandler);
            }

            if (depsReadyCounter === depsLength) {
              depsReadyCallback();
            }

          };

          if (modules.hasOwnProperty(depName)) {
            evHandler(0);
          }
          else {
            lib._on(evName, evHandler);
          }

        })(i);
      }

    }
    else {

      depsReadyCallback();

    }

  };

  /**
   * Bind custom event.
   *
   * @private
   * @param {string} type
   * @param {function} cb
   */
  lib._on = function (type, cb) {

    if (eventListenersSupported) {
      root.addEventListener(type, cb, false);
    }
    /** IE 8/7 Hack */
    else {
      root.attachEvent('onpropertychange', cb);
    }

  };

  /**
   * Unbind custom event.
   *
   * @private
   * @param {string} type
   * @param {function} cb
   */
  lib._off = function (type, cb) {

    if (eventListenersSupported) {
      root.removeEventListener(type, cb, false);
    }
    /** IE 8/7 Hack  */
    else {
      root.detachEvent('onpropertychange', cb);
    }

  };

  /**
   * Trigger custom event.
   *
   * @private
   * @param {string} type
   */
  lib._trigger = function (type) {

    var ev;
    if (eventListenersSupported) {
      if (doc.createEvent) {
        ev = doc.createEvent('HTMLEvents');
        ev.initEvent(type, false, true);
        root.dispatchEvent(ev);
      }
      /** Future proofing, createEvent is deprecated.  */
      else {
        ev = new Event(type);
        root.dispatchEvent(ev);
      }
    /** IE 8/7 Hack  */
    } else {
      root[type] = (root[type] || 0) + 1;
    }

  };

  /**
   * Check the type of an object. Returns type of any object in lowercase letters. If comparison
   * type is provided the function will compare the type directly and returns a boolean.
   *
   * @private
   * @param {object} obj
   * @param {string} [compareType]
   * @returns {string|boolean} Returns boolean if type is defined.
   */
  lib._typeof = function (obj, compareType) {

    var type = typeof obj;
    type = type === 'object' ? ({}).toString.call(obj).split(' ')[1].replace(']', '').toLowerCase() : type;
    return compareType ? type === compareType : type;

  };

})(this);
