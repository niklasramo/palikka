/*!
 * Palikka v0.1.0
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
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
   * @param {array|string} [dependencies] - Optional. Define dependencies as an array of modules names. Optionally you can just specify a single module name as a string.
   * @param {function} defCallback - The module definition function which's return value will be stored as the module's value. Provides the dependency modules as arguments in the same order they were required.
   * @param {function} [asyncCallback] - Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.
   */
  lib.define = function (name, dependencies, defCallback, asyncCallback) {

    var
    depsType = lib._typeof(dependencies),
    deps = depsType === 'array' ? dependencies : depsType === 'string' ? [dependencies] : [],
    defCb = depsType === 'function' ? dependencies : defCallback,
    asyncCb = depsType === 'function' ? defCallback : asyncCallback;

    /** Name and definition callback function are required. */
    if (!name || !lib._typeof(defCb, 'function')) {
      return;
    }

    lib._loadDeps(deps, function (depModules) {

      if (lib._typeof(asyncCb, 'function')) {

        var
        args = depModules.slice(0),
        cb = function () {
          lib._register(name, defCb, depModules);
        };

        args.unshift(cb);
        asyncCb.apply(null, args);

      }
      else {

        lib._register(name, defCb, depModules);

      }

    });

  };

  /**
   * Require a module.
   *
   * @public
   * @param {array|string} dependencies - Define dependencies as an array of modules names. Optionally you can just specify a single module name as a string.
   * @param {function} callback - The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.
   */
  lib.require = function (dependencies, callback) {

    var
    depsType = lib._typeof(dependencies),
    deps = depsType === 'array' ? dependencies : depsType === 'string' ? [dependencies] : [];

    /** Callback function is required. */
    if (!lib._typeof(callback, 'function')) {
      return;
    }

    lib._loadDeps(deps, function (depModules) {
      callback.apply(null, depModules);
    });

  };

  /**
   * Import object properties as modules.
   *
   * @public
   * @param {array|string} properties - Define property names to be imported.
   * @param {object} [of=window] - Define the object where to look for the defined properties.
   */
  lib.get = function (properties, of) {

    var
    propsType = lib._typeof(properties),
    props = propsType === 'array' ? properties : propsType === 'string' ? [properties] : [],
    propsLength = props.length,
    obj = of || global;

    for (var i = 0; i < propsLength; i++) {
      if (props[i] in obj) {
        lib.define(props[i], function () {
          return obj[props[i]];
        });
      }
    }

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
      /** Future proofing, createEvent is deprecated. */
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
