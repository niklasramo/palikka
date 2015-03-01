/*!
 * Palikka v0.3.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
  IDEAS/TODOS:
  ------------
  - Is require method needed and is it functionality in sync with the name? Could it be integrated to define method?
  - Should define method return an array of fail/success ids?
  - A method that shows per module that which dependencies have loaded and which are pending.
  - Forced undefine.
  - Undefine multiple modules at once.
  - A method that returns a module's value, e.g. ".get()".
  - Add a minified version to the project repo and improve the build system in general (more automation).
  - Create a separate 0.3.0 branch for this release and adopt a better way to manage the repo.
  - Better test coverage (improved tests for return values).
  - Allow specifying the context for eventizer emit method?
*/

(function (glob) {
  'use strict';

  var
  ns = 'palikka',
  lib = {},
  modules = {},
  modulePrimaryKey = 0,
  evInit = 'initiate',
  evReg = 'register';

  /** Create event system. */
  Eventizer.call(lib);

  /** Add module container object to palikka as a private object. */
  lib._modules = modules;

  /** Add Eventizer to palikka as a private method. */
  lib._Eventizer = Eventizer;

  /**
   * Define a single module or multiple modules. Returns an integer which represents the number of succesful module registrations.
   *
   * @public
   * @param {string|array} ids
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {number}
   */
  lib.define = function (ids, dependencies, factory) {

    ids = typeOf(ids, 'array') ? ids : [ids];

    var
    ret = 0,
    len = ids.length,
    i;

    for (i = 0; i < len; i++) {
      if (defineSingle(ids[i], dependencies, factory)) {
        ++ret;
      }
    }

    return ret;

  };

  /**
   * Undefine a module. If any other define or require instance depends on the module it cannot be undefined. Returns true if undefinition was successful, otherwise returns false.
   *
   * @param {string} id
   * @returns {boolean}
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
   * @param {array|string} dependencies
   * @param {function} callback
   */
  lib.require = function (dependencies, callback) {

    if (typeOf(callback, 'function')) {
      loadDependencies(sanitizeDependencies(dependencies), function (depModules) {
        callback.apply(null, depModules);
      });
    }

  };

  /**
   * Check the type of an object. Returns type of any object in lowercase letters. If comparison type is provided the function will compare the type directly and returns a boolean.
   *
   * @private
   * @param {object} obj
   * @param {string} [compareType]
   * @returns {string|boolean}
   */
  function typeOf(obj, compareType) {

    var type = typeof obj;
    type = type === 'object' ? ({}).toString.call(obj).split(' ')[1].replace(']', '').toLowerCase() : type;
    return compareType ? type === compareType : type;

  }

  /**
   * Define a module. Returns true if module registration was successful, otherwise returns false.
   *
   * @public
   * @param {string} id
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {boolean}
   */
  function defineSingle(id, dependencies, factory) {

    var
    hasDeps = factory,
    depIds = hasDeps ? sanitizeDependencies(dependencies) : [],
    factory = hasDeps ? factory : dependencies,
    factoryType = typeOf(factory),
    isValidId = id && typeOf(id, 'string'),
    isValidFactory = factoryType === 'object' || factoryType === 'function',
    primaryKey = isValidId && isValidFactory && registerModule(id, depIds),
    init,
    async,
    factoryCtx,
    moduleData;

    /** Return false if module registration failed. */
    if (!primaryKey) {
      return false;
    }

    loadDependencies(depIds, function (depModules) {

      init = function (data) {
        initModule(id, primaryKey, arguments.length ? data : moduleData);
      };

      if (factoryType === 'function') {

        factoryCtx = {
          id: id,
          dependencies: {},
          async: function () {
            async = 1;
            return init;
          }
        };

        for (var i = 0, len = depIds.length; i < len; i++) {
          factoryCtx.dependencies[depIds[i]] = depModules[i];
        }

        moduleData = factory.apply(factoryCtx, depModules);

        if (!async) {
          init(moduleData);
        }

      }
      else {

        init(factory);

      }

    });

    /** Return true to indicate a succesful module registration. */
    return true;

  }

  /**
   * Sanitize dependencies argument of define and require methods.
   *
   * @private
   * @param {array|string} dependencies
   * @returns {array}
   */
  function sanitizeDependencies(dependencies) {

    var type = typeOf(dependencies);
    return type === 'array' ? dependencies : type === 'string' ? [dependencies] : [];

  }

  /**
   * Register a module. Returns the modules primary key (a positive integer) if succesful, otherwise returns zero.
   *
   * @private
   * @param {string} id
   * @returns {number}
   */
  function registerModule(id, dependencies) {

    if (!modules[id]) {
      var pk = ++modulePrimaryKey;
      modules[id] = {
        id: id,
        pk: pk,
        loaded: false,
        locked: false,
        data: undefined,
        dependencies: dependencies
      };
      lib.emit(evReg + '-' + id, [modules[id]]);
      lib.emit(evReg, [modules[id]]);
      return pk;
    } else {
      return 0;
    }

  }

  /**
   * Initialize a module.
   *
   * @private
   * @param {string} id
   * @param {number} primaryKey
   * @param {*} data
   */
  function initModule(id, primaryKey, data) {

    if (modules[id] && modules[id].pk === primaryKey && !modules[id].loaded) {
      modules[id].data = data;
      modules[id].loaded = true;
      lib.emit(evInit + '-' + id, [modules[id]]);
      lib.emit(evInit, [modules[id]]);
    }

  }

  /**
   * Load dependencies by their ids and return a deferred object that will be resolved when the all dependencies are loaded.
   *
   * @private
   * @param {array} dependencies
   * @param {function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    depModules = [],
    depsLength = dependencies.length,
    depsReadyCounter = 0,
    depsReadyCallback = function () {

      if (depsLength) {
        for (var i = 0; i < depsLength; i++) {
          depModules.push(modules[dependencies[i]].data);
        }
      }

      callback(depModules);

    };

    if (depsLength) {

      for (var i = 0; i < depsLength; i++) {
        (function (i) {

          var
          depId = dependencies[i],
          evName = evInit + '-' + depId,
          evHandler = function (ev) {

            /** If this is an event's callback, let's unbind the event listener. */
            if (ev) {
              lib.off(evName, evHandler);
            }

            /** Let's increment loaded dependencies counter so we can later on in this function deduce if all dependencies are loaded. */
            ++depsReadyCounter;

            /** Lock dependency module (can't be undefined anymore). */
            modules[depId].locked = true;

            /** If this was the last dependency left to load it's time to move on. */
            if (depsReadyCounter === depsLength) {
              depsReadyCallback();
            }

          };

          /** If dependency module is already loaded let's move on, otherwise let's keep on waiting. */
          if (modules[depId] && modules[depId].loaded) {
            evHandler();
          }
          else {
            lib.on(evName, evHandler);
          }

        })(i);
      }

    }
    else {

      depsReadyCallback();

    }

  }

  /**
   * Creates a new Eventizer that allows you to bind, unbind and trigger events.
   *
   * @class
   * @param {object} [listeners]
   */
  function Eventizer(listeners) {

    this._listeners = listeners || {};

    /**
     * Bind custom event listener.
     *
     * @private
     * @param {string} type
     * @param {function} callback
     */
    this.on = function (type, callback) {

      var listeners = this._listeners;
      listeners[type] = listeners[type] || [];
      listeners[type].push(callback);

    };

    /**
     * Unbind an event listener. If a callback function is not provided all listeners for the type will be removed, otherwise only the provided function instances will be removed.
     *
     * @private
     * @param {string} type
     * @param {function} [callback]
     */
    this.off = function (type, callback) {

      var
      listeners = this._listeners,
      typeStack = listeners[type],
      i;

      if (typeStack) {

        i = typeStack.length;

        while (i--) {
          if (!callback || (callback && typeStack[i] === callback)) {
            typeStack.splice(i, 1);
          }
        }

        if (!typeStack.length) {
          delete listeners[type];
        }

      }

    };

    /**
     * Emit event.
     *
     * @private
     * @param {string} type
     * @param {array} [args]
     */
    this.emit = function (type, args) {

      var
      listeners = this._listeners,
      typeStack = listeners[type],
      callback;

      if (typeStack) {

        typeStack = typeStack.slice(0);

        for (var i = 0, len = typeStack.length; i < len; i++) {
          callback = typeStack[i];
          if (typeof callback === 'function') {
            args = args || [];
            args.unshift({type: type, fn: callback});
            callback.apply(this, args);
          }
        }

      }

    };

  }

  /**
   * Publish library using an adapted UMD pattern.
   * https://github.com/umdjs/umd
   */
  if (typeof define === 'function' && define.amd) {
    define([], lib);
  }
  else if (typeof exports === 'object') {
    module.exports = lib;
  }
  else {
    glob[ns] = lib;
  }

})(this);
