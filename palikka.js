/*!
 * Palikka v0.2.0-1
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
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
   * Define a module. Returns true if module registration was successful, otherwise returns false. This method has two modes. If dependencies are provided as an array or a string the factory function will receive each dependecny module as an individual argument in the same order they are defined. However, if dependencies are provided as an object the factory function will receive a single argument: an object which contains references to the dependency modules. There are two ways to initiate a module within the factory callback. The simple way is just returning the module's value within the factory callback, but the value must be something else than undefined. If you need to set the module's value to undefined or use asynchronous initiation you need to call the init function mannually. The factory callback always receives the initiation function as it's context (this keyword), which sets the first function argument as the module's value when it is executed.
   *
   * @public
   * @param {string} id
   * @param {array|string|object} [dependencies]
   * @param {function|object} factory
   * @returns {boolean}
   */
  lib.define = function (id, dependencies, factory) {

    var
    hasDeps = factory,
    depIds = hasDeps ? lib._sanitizeDependencies(dependencies) : [],
    factory = hasDeps ? factory : dependencies,
    factoryType = typeOf(factory),
    isValidId = id && typeOf(id, 'string'),
    isValidFactory = factoryType === 'object' || factoryType === 'function',
    primaryKey = isValidId && isValidFactory && lib._registerModule(id, depIds),
    initModule,
    moduleData;

    /** Return false if module registration failed. */
    if (!primaryKey) {
      return false;
    }

    /** Load dependencies. */
    lib._loadDependencies(depIds, function (depModules) {

      initModule = function (moduleData) {
        lib._initModule(id, primaryKey, moduleData);
      };

      if (factoryType === 'function') {
        /** Init the module instantly if it returns a value (something else than undefined). */
        moduleData = factory.apply(initModule, lib._factoryArgs(depIds, depModules, hasDeps ? dependencies : undefined));
        if (moduleData !== undefined) {
          initModule(moduleData);
        }
      }
      else {
        initModule(factory);
      }

    });

    /** Return true to indicate a succesful module registration. */
    return true;

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
   * @param {array|string|object} dependencies
   * @param {function} callback
   */
  lib.require = function (dependencies, callback) {

    var depIds = lib._sanitizeDependencies(dependencies);

    if (!typeOf(callback, 'function')) {
      return;
    }

    lib._loadDependencies(depIds, function (depModules) {
      callback.apply(null, lib._factoryArgs(depIds, depModules, dependencies));
    });

  };

  /**
   * Assign properties of an object to be defined as modules. In essence this is just a wrapper for define method that allows you to define multiple modules quickly. Very useful for importing third party libraries into Palikka's context as modules.
   *
   * @public
   * @param {array|string} properties
   * @param {object} [of=window]
   */
  lib.assign = function (properties, of) {

    var
    propsType = typeOf(properties),
    props = propsType === 'array' ? properties : propsType === 'string' ? [properties] : [],
    propsLength = props.length,
    obj = of || glob;

    for (var i = 0; i < propsLength; i++) {
      if (props[i] in obj) {
        lib.define(props[i], function () {
          this(obj[props[i]]);
        });
      }
    }

  };

  /**
   * Register a module. Returns the modules primary key (a positive integer) if succesful, otherwise returns zero.
   *
   * @private
   * @param {string} id
   * @returns {number}
   */
  lib._registerModule = function (id, dependencies) {

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

  };

  /**
   * Initialize a module.
   *
   * @private
   * @param {string} id
   * @param {number} primaryKey
   * @param {*} data
   */
  lib._initModule = function (id, primaryKey, data) {

    if (modules[id] && modules[id].pk === primaryKey && !modules[id].loaded) {
      modules[id].data = data;
      modules[id].loaded = true;
      lib.emit(evInit + '-' + id, [modules[id]]);
      lib.emit(evInit, [modules[id]]);
    }

  };

  /**
   * Load dependencies by their ids and return a deferred object that will be resolved when the all dependencies are loaded.
   *
   * @private
   * @param {array} dependencies
   * @param {function} callback
   */
  lib._loadDependencies = function (dependencies, callback) {

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

  };


  /**
   * Sanitize dependencies argument of define and require methods.
   *
   * @private
   * @param {array|string|object} dependencies
   * @returns {array}
   */
  lib._sanitizeDependencies = function (dependencies) {

    var
    type = typeOf(dependencies),
    ret = [];

    if (type === 'object') {
      for (var prop in dependencies) {
        ret.push(prop);
      }
    }
    else {
      ret = type === 'array' ? dependencies : type === 'string' ? [dependencies] : ret;
    }

    return ret;

  };

  /**
   * Create arguments for define method's factory argument.
   *
   * @private
   * @param {array} depIds
   * @param {array} depModules
   * @param {object} [depObj]
   * @returns {array}
   */
  lib._factoryArgs = function (depIds, depModules, depObj) {

    var
    depId,
    depAlias,
    ret;

    if (typeOf(depObj, 'object')) {
      ret = {};
      for (var i = 0, len = depIds.length; i < len; i++) {
        depId = depIds[i];
        depAlias = depObj[depId];
        if (typeOf(depAlias, 'string')) {
          depAlias = depAlias ? depAlias : depId;
          ret[depAlias] = depModules[i];
        }
      }
      ret = [ret];
    }
    else {
      ret = depModules;
    }

    return ret;

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