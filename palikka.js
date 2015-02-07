/*!
 * Palikka v0.1.2
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

(function (glob, undefined) {

  'use strict';

  var
  ns = 'palikka',
  lib = {},
  modules = {},
  listeners = {},
  modulePrimaryKey = 0;

  /**
   * Define a module.
   *
   * @public
   * @param {string} id - ID of the module.
   * @param {array|string} [dependencies] - Optional. Define dependencies as an array of modules IDs. Optionally you can just specify a single module ID as a string.
   * @param {function|object} factory - If the factory argument is a function it is executed once and the return value is assigned as the value for the module. If the factory argument is a plain object it is directly assigned as the module's value.
   * @param {function} [deferred] - Optional. Define a function which will delay the registration of the module until the resolver callback function is executed (provided as the first function argument). Dependency modules are also provided as arguments following the callback function.
   * @returns {boolean} Returns true if definition was successful, otherwise returns false.
   */
  lib.define = function (id, dependencies, factory, deferred) {

    var
    idType = lib._typeof(id),
    dependenciesType = lib._typeof(dependencies),
    _dependencies = dependenciesType === 'array' ? dependencies : dependenciesType === 'string' ? [dependencies] : [],
    _factory = dependenciesType === 'function' ? dependencies : factory,
    _deferred = dependenciesType === 'function' ? factory : deferred,
    _factoryType = lib._typeof(_factory),
    isValidId = id && idType === 'string',
    isValidFactory = _factoryType === 'object' || _factoryType === 'function',
    primaryKey = isValidId && isValidFactory && lib._registerModule(id, _dependencies);

    /** Return false if definition failed. */
    if (!primaryKey) {
      return false;
    }

    /** Load dependencies. */
    lib._loadDependencies(_dependencies, function (depModules, initModule) {

      initModule = function () {
        lib._initModule(id, _factory, depModules, primaryKey);
      };

      if (lib._typeof(_deferred, 'function')) {
        var args = depModules.slice(0);
        args.unshift(initModule);
        _deferred.apply(null, args);
      }
      else {
        initModule();
      }

    });

    /** Return true to indicate a succesful definition. */
    return true;

  };

  /**
   * Undefine a module. If any other define or require instance depends on the module it cannot be undefined.
   *
   * @param {string} id
   * @returns {boolean} Returns true if undefinition was successful, otherwise returns false.
   */
  lib.undefine = function (id) {

    var
    module = modules[id],
    isLocked = module && module.locked;

    if (module && !isLocked) {
      delete modules[id];
    }

    return !isLocked;

  };

  /**
   * Require a module.
   *
   * @public
   * @param {array|string} [dependencies] - Optional. Define dependencies as an array of modules IDs. Optionally you can just specify a single module ID as a string.
   * @param {function} callback - The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.
   */
  lib.require = function (dependencies, callback) {

    var
    dependenciesType = lib._typeof(dependencies),
    _dependencies = dependenciesType === 'array' ? dependencies : dependenciesType === 'string' ? [dependencies] : [];

    /** Callback function is required. */
    if (!lib._typeof(callback, 'function')) {
      return;
    }

    lib._loadDependencies(_dependencies, function (depModules) {
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
    obj = of || glob;

    for (var i = 0; i < propsLength; i++) {
      if (props[i] in obj) {
        lib.define(props[i], function () {
          return obj[props[i]];
        });
      }
    }

  };

  /**
   * Register module.
   *
   * @private
   * @param {string} id
   * @returns {number} Returns the modules primary key (positive number) if succesful, otherwise returns zero.
   */
  lib._registerModule = function (id, dependencies) {

    if (!modules[id]) {
      var pk = ++modulePrimaryKey;
      modules[id] = {
        id: id,
        pk: pk,
        loaded: false,
        locked: false,
        factory: null,
        dependencies: dependencies
      };
      return pk;
    } else {
      return 0;
    }

  };

  /**
   * Initialize module.
   *
   * @private
   * @param {string} id
   * @param {function} factory
   * @param {array} dependencies
   * @param {number} primaryKey
   */
  lib._initModule = function (id, factory, dependencies, primaryKey) {

    if (modules[id] && modules[id].pk === primaryKey) {
      modules[id].factory = lib._typeof(factory, 'object') ? factory : factory.apply(null, dependencies);
      modules[id].loaded = true;
      lib._trigger(id);
    }

  };

  /**
   * Load dependencies by their IDs and return a deferred object that will be resolved when the all dependencies are loaded.
   *
   * @private
   * @param {array} dependencies
   * @param {function} cb
   */
  lib._loadDependencies = function (dependencies, cb) {

    var
    depModules = [],
    depsLength = dependencies.length,
    depsReadyCounter = 0,
    depsReadyCallback = function () {

      if (depsLength) {
        for (var i = 0; i < depsLength; i++) {
          depModules.push(modules[dependencies[i]].factory);
        }
      }

      cb(depModules);

    };

    if (depsLength) {

      for (var i = 0; i < depsLength; i++) {
        (function (i) {

          var
          depId = dependencies[i],
          evHandler = function (isDirectCall) {

            /** Let's increment loaded dependencies counter so we can later on in this function deduce if all dependencies are loaded.  */
            ++depsReadyCounter;

            /** If this is an event's callback, let's unbind the event listener. */
            if (!isDirectCall) {
              lib._off(depId, evHandler);
            }

            /** Lock dependency module (can't be undefined anymore). */
            modules[depId].locked = true;

            /** If this was the last dependency left to load it's time to move on. */
            if (depsReadyCounter === depsLength) {
              depsReadyCallback();
            }

          };

          /** If dependency module is already loaded let's move on, otherwise let's keep on waiting. */
          if (modules[depId] && modules[depId].loaded) {
            evHandler(1);
          }
          else {
            lib._on(depId, evHandler);
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

    listeners[type] = listeners[type] || [];
    listeners[type].push(cb);

  };

  /**
   * Unbind custom event. If callback is not provided all listeners for the type will be removed, otherwise only the privded callback instances will be removed.
   *
   * @private
   * @param {string} type
   * @param {function} [cb]
   */
  lib._off = function (type, cb) {

    var typeListeners = listeners[type];
    if (typeListeners) {
      var i = typeListeners.length;
      while (i--) {
        if (!cb || typeListeners[i] === cb) {
          typeListeners.splice(i, 1);
        }
      }
      if (!typeListeners.length) {
        delete listeners[type];
      }
    }

  };

  /**
   * Trigger custom event.
   *
   * @private
   * @param {string} type
   */
  lib._trigger = function (type) {

    var typeListeners = listeners[type];
    if (typeListeners) {
      typeListeners = typeListeners.slice(0);
      for (var i = 0, len = typeListeners.length; i < len; i++) {
        typeListeners[i]();
      }
    }

  };

  /**
   * Check the type of an object. Returns type of any object in lowercase letters. If comparison type is provided the function will compare the type directly and returns a boolean.
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

  /** Expose modules and listeners as private items of the public API. */
  lib._modules = modules;
  lib._listeners = listeners;

  /** Publish library. */
  if (typeof exports === 'object') {
    module.exports = lib;
  } else {
    glob[ns] = lib;
  }

})(this);
