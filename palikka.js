/*!
 * Palikka v0.1.3
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
  events = new Eventizer(),
  modulePrimaryKey = 0;

  /** Expose modules, events and EventHub class as private members of the public API. */
  lib._modules = modules;
  lib._events = events;
  lib._Eventizer = Eventizer;

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
    idType = typeOf(id),
    dependenciesType = typeOf(dependencies),
    isDependenciesSet = dependenciesType === 'array' || dependenciesType === 'string',
    _dependencies = dependenciesType === 'array' ? dependencies : dependenciesType === 'string' ? [dependencies] : [],
    _factory = isDependenciesSet ? factory : dependencies,
    _deferred = isDependenciesSet ? deferred : factory,
    _factoryType = typeOf(_factory),
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

      if (typeOf(_deferred, 'function')) {
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
   * @param {array|string} dependencies - Define dependencies as an array of modules IDs. Optionally you can just specify a single module ID as a string.
   * @param {function} callback - The callback function that will be executed after all dependencies have loaded. Provides the dependency modules as arguments in the same order they were required.
   */
  lib.require = function (dependencies, callback) {

    var
    dependenciesType = typeOf(dependencies),
    _dependencies = dependenciesType === 'array' ? dependencies : dependenciesType === 'string' ? [dependencies] : [];

    /** Callback function is required. */
    if (!typeOf(callback, 'function')) {
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
    propsType = typeOf(properties),
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
      modules[id].factory = typeOf(factory, 'object') ? factory : factory.apply(null, dependencies);
      modules[id].loaded = true;
      events.emit(id, [modules[id]]);
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
          evHandler = function (ev) {

            /** If this is an event's callback, let's unbind the event listener. */
            if (ev) {
              events.off(depId, evHandler);
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
            events.on(depId, evHandler);
          }

        })(i);
      }

    }
    else {

      depsReadyCallback();

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
  function typeOf(obj, compareType) {

    var type = typeof obj;
    type = type === 'object' ? ({}).toString.call(obj).split(' ')[1].replace(']', '').toLowerCase() : type;
    return compareType ? type === compareType : type;

  }

  /**
   * Creates a new Eventizer that allows you to bind, unbind and trigger events.
   *
   * @example
   * // Create event controller object.
   * var events = new Eventizer();
   * // Create a callback function for event binder.
   * var cb = function (ev, foo, bar) {
   *   alert(this === events && ev.type === 'foo' && ev.fn === cb && foo === 'foo' && bar === 'bar'); // true
   * };
   * // Bind event 'foo'.
   * events.on('foo', cb);
   * // Trigger event 'foo' with arguments.
   * events.emit('foo', ['foo', 'bar']);
   * // Remove all 'foo' event's listeners that equal to cb.
   * events.off('foo', cb);
   * // Remove all event listeners of 'foo' event.
   * events.off('foo');
   *
   * @class
   * @param {object} [listeners={}]
   */
  function Eventizer (listeners) {

    this._listeners = listeners || {};

    /**
     * Bind custom event.
     *
     * @private
     * @param {string} type
     * @param {function} cb
     */
    this.on = function (type, cb) {

      var listeners = this._listeners;
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);

    };

    /**
     * Unbind event. If a callback function is not provided all listeners for the type will be removed, otherwise only the provided function instances will be removed.
     *
     * @private
     * @param {string} type
     * @param {function} [cb]
     */
    this.off = function (type, cb) {

      var
      listeners = this._listeners,
      typeStack = listeners[type],
      i;

      if (typeStack) {

        i = typeStack.length;

        while (i--) {
          if (!cb || (cb && typeStack[i] === cb)) {
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
      cb;

      if (typeStack) {

        typeStack = typeStack.slice(0);

        for (var i = 0, len = typeStack.length; i < len; i++) {
          cb = typeStack[i];
          if (typeof cb === 'function') {
            args = args || [];
            args.unshift({type: type, fn: cb});
            cb.apply(this, args);
          }
        }

      }

    };

  }

  /**
   * Publish library using adapted UMD pattern.
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
