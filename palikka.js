/*!
 * Palikka v0.3.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
  TODO
  ----
  - Add a minified version to the project repo and improve the build system in general (more automation).
  - Better test coverage (improved tests for return values).
  - Easier importing of third party libs.
  - Deferred vs Promise... what's the real difference?
  - Aim for 5k max minified file size + a killer performance.
*/

(function (glob) {
  'use strict';

  var

  /** Define name of the library. */
  ns = 'palikka',

  /** Public API interface. */
  lib = {},

  /** Modules container. */
  modules = {},

  /** Module events. */
  evInitiate = 'initiate',
  evRegister = 'register',

  /** Deferred events. */
  evResolve = 'resolve',
  evReject = 'reject',

  /** Deferred states. */
  statePending = 'pending',
  stateResolved = 'resolved',
  stateRejected = 'rejected';

  /**
   * Creates a new Eventizer instance that allows you to bind, unbind and emit events.
   *
   * @class
   * @private
   * @param {object} [listeners]
   */
  function Eventizer(listeners) {

    /**
     * An object where all the instance's callbacks (listeners) are stored in.
     *
     * @protected
     * @type {object}
     */
    this._listeners = listeners || {};

  }

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Eventizer
   * @param {string} type
   * @param {function} callback
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.on = function (type, callback) {

    var listeners = this._listeners;
    listeners[type] = listeners[type] || [];
    listeners[type].push(callback);

    return this;

  };

  /**
   * Unbind an event listener. If a callback function is not provided all listeners for the type will be removed, otherwise only the provided function instances will be removed.
   *
   * @public
   * @memberof Eventizer
   * @param {string} type
   * @param {function} [callback]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.off = function (type, callback) {

    var
    listeners = this._listeners,
    typeCallbacks = listeners[type],
    i;

    if (typeCallbacks) {

      i = typeCallbacks.length;

      while (i--) {
        if (!callback || (callback && typeCallbacks[i] === callback)) {
          typeCallbacks.splice(i, 1);
        }
      }

      if (!typeCallbacks.length) {
        delete listeners[type];
      }

    }

    return this;

  };

  /**
   * Emit event. Optionally one can provide context and additional arguments for the callback functions.
   *
   * @public
   * @memberof Eventizer
   * @param {string} type
   * @param {array|arguments} [args]
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.emit = function (type, args, ctx) {

    var
    that = this,
    typeCallbacks = that._listeners[type];

    if (typeCallbacks) {
      arrayEach(typeCallbacks.slice(0), function (callback) {
        if (typeOf(callback, 'function')) {

          var
          cbArgs = copyArray(args),
          cbCtx = typeOf(ctx, 'undefined') ? that : ctx;

          cbArgs.unshift({type: type, fn: callback});
          callback.apply(cbCtx, cbArgs);

        }
      });
    }

    return that;

  };

  /**
   * Create a deferred object.
   *
   * @class
   * @private
   * @param {function} callback
   */
  function Deferred(callback) {

    /**
     * Instance's event emitter.
     *
     * @protected
     * @type {Eventizer}
     */
    this._events = new Eventizer();

    /**
     * When Deferreds are chained with 'then' method this property will contain all the Deferreds in the then' chain before the current instance.
     *
     * @protected
     * @type {array}
     */
    this._chain = [];

    /**
     * When the Deferred instance is resolved or rejected the provided arguments are stored here.
     *
     * @protected
     * @type {array}
     */
    this._args = [];

    /**
     * Holds information about the state of the Deferred instance. A Deferred can have three different states: 'pending', 'resolved' or 'rejected'.
     *
     * @protected
     * @type {string}
     */
    this._state = statePending;

    /** Call callback function if provided. */
    var instance = this;
    if (typeOf(callback, 'function')) {
      callback.call(instance, function () {
        instance.resolve.apply(instance, arguments);
      }, function () {
        instance.reject.apply(instance, arguments);
      });
    }

  }

  /**
   * Get current state of the instance.
   *
   * @public
   * @memberof Deferred
   * @returns {string} 'pending', 'resolved' or 'rejected'.
   */
  Deferred.prototype.state = function () {

    return this._state;

  };

  /**
   * Resolve Deferred. All provided arguments will be passed directly to 'done' and 'always' callback functions.
   *
   * @public
   * @memberof Deferred
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.resolve = function () {

    if (this._state === statePending) {
      copyArray(arguments, this._args);
      this._state = stateResolved;
      this._events.emit(evResolve, this._args);
    }

    return this;

  };

  /**
   * Reject deferred. All provided arguments will be passed directly to 'fail' and 'always' callback functions.
   *
   * @public
   * @memberof Deferred
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.reject = function () {

    if (this._state === statePending) {
      copyArray(arguments, this._args);
      this._state = stateRejected;
      this._events.emit(evReject, this._args);
    }

    return this;

  };

  /**
   * Execute a callback function when the Deferred instance is resolved.
   *
   * @public
   * @memberof Deferred
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onResolved = function (callback) {

    var that = this;

    if (typeOf(callback, 'function')) {

      if (that._state === stateResolved) {
        callback.apply(that, that._args);
      }

      if (that._state === statePending) {
        that._events.on(evResolve, function (e) {
          callback.apply(that, that._args);
          that._events.off(evResolve, e.fn);
        });
      }

    }

    return that;

  };

  /**
   * Execute a callback function when the Deferred instance is rejected.
   *
   * @public
   * @memberof Deferred
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onRejected = function (callback) {

    var that = this;

    if (typeOf(callback, 'function')) {

      if (that._state === stateRejected) {
        callback.apply(that, that._args);
      }

      if (that._state === statePending) {
        that._events.on(evReject, function (e) {
          callback.apply(that, that._args);
          that._events.off(evReject, e.fn);
        });
      }

    }

    return that;

  };

  /**
   * Execute a callback function when the Deferred instance is resolved or rejected.
   *
   * @public
   * @memberof Deferred
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onSettled = function (callback) {

    return this.onResolved(callback).onRejected(callback);

  };

  /**
   * Chain Deferreds.
   *
   * @public
   * @memberof Deferred
   * @param {function} [whenResolved]
   * @param {function} [whenRejected]
   * @returns {Deferred} Creates a new Deferred instance.
   */
  Deferred.prototype.then = function (whenResolved, whenRejected) {

    var
    that = this,
    next = new Deferred(),
    ret;

    copyArray(that._chain, next._chain);
    next._chain.push(that);

    that.onResolved(function () {

      try {

        if (typeOf(whenResolved, 'function')) {

          ret = whenResolved.apply(that, arguments);

          if (ret instanceof Deferred) {
            ret
            .onResolved(function () {
              next.resolve.apply(next, arguments);
            })
            .onRejected(function () {
              next.reject.apply(next, arguments);
            });
          }
          else {
            next.resolve.call(next, ret);
          }

        }
        else {

          next.resolve.apply(next, arguments);

        }

      } catch (e) {

        next.reject.call(next, e);

      }

    });

    that.onRejected(function () {

      if (typeOf(whenRejected, 'function')) {
        whenRejected.apply(that, arguments);
      }

      next.reject.apply(next, arguments);

    });

    return next;

  };

  /**
   * Combine Deferreds.
   *
   * @public
   * @memberof Deferred
   * @param {Deferred|array} deferreds
   * @param {boolean} [resolveOnFirst=false]
   * @param {boolean} [rejectOnFirst=true]
   * @returns {Deferred} A new Deferred instance.
   */
  Deferred.prototype.join = function (deferreds, resolveOnFirst, rejectOnFirst) {

    deferreds = typeOf(deferreds, 'array') ? deferreds : [deferreds];

    if (this instanceof Deferred) {
      deferreds.unshift(this);
    }

    var
    master = new Deferred(),
    masterArgs = [],
    counter = deferreds.length,
    inc = 0,
    resolvedHandler = function () {
      --counter;
      masterArgs[inc] = this instanceof Deferred ? copyArray(arguments) : undefined;
      if (resolveOnFirst === true || counter === 0) {
        master.resolve.apply(master, masterArgs);
      }
    },
    rejectedHandler = function () {
      --counter;
      masterArgs[inc] = this instanceof Deferred ? copyArray(arguments) : undefined;
      if (rejectOnFirst === undefined || rejectOnFirst === true || counter === 0) {
        master.reject.apply(master, arguments);
      }
    };

    if (counter) {
      arrayEach(deferreds, function (deferred, i) {
        inc = i;
        if (deferred instanceof Deferred) {
          deferred
          .onResolved(resolvedHandler)
          .onRejected(rejectedHandler);
        }
        else {
          resolvedHandler.call(0);
        }
      });
    }
    else {
      master.resolve();
    }

    return master;

  };

  /**
   * Create a module object.
   *
   * @class
   * @private
   * @param {string} id
   * @param {array} dependencies
   * @param {function|object} factory
   */
  function Module(id, dependencies, factory) {

    var
    that = this;

    // Module data.
    this.id = id;
    this.value = undefined;
    this.loaded = false;
    this.locked = false;
    this.dependencies = dependencies;
    this.factory = factory;

    // Add module to modules object.
    modules[id] = this;

    // Emit register events.
    lib.emit(evRegister + '-' + id, [this]);
    lib.emit(evRegister, [this]);

    // Initiate.
    loadDependencies(dependencies, function (depModules) {
      that.process(depModules);
    });

  }

  /**
   * Process module factory.
   *
   * @public
   * @memberof Module
   * @param {array} depModules
   * @returns {Module} The instance on which this method was called.
   */
  Module.prototype.process = function (depModules) {

    var
    that = this,
    factoryCtx,
    factoryValue,
    factoryAsync,
    factoryInit = function (val) {
      that.initiate(arguments.length ? val : factoryValue);
    };

    if (typeOf(that.factory, 'function')) {

      factoryCtx = {
        id: that.id,
        dependencies: {},
        async: function () {
          factoryAsync = true;
          return factoryInit;
        }
      };

      arrayEach(that.dependencies, function (depId) {
        factoryCtx.dependencies[depId] = modules[depId].value;
      });

      factoryValue = that.factory.apply(factoryCtx, depModules);

      if (!factoryAsync) {
        factoryInit(factoryValue);
      }

    }
    else {

      factoryInit(that.factory);

    }

    return that;

  };

  /**
   * Initiate module.
   *
   * @public
   * @memberof Module
   * @param {*} value
   * @returns {Module} The instance on which this method was called.
   */
  Module.prototype.initiate = function (value) {

    if (this === modules[this.id] && !this.loaded) {
      this.value = value;
      this.loaded = true;
      lib.emit(evInitiate + '-' + this.id, [this]);
      lib.emit(evInitiate, [this]);
    }

    return this;

  };

  /**
   * Private helper functions.
   */

  /**
   * Check the type of an object. Returns type of any object in lowercase letters. If comparison type is provided the function will compare the type directly and returns a boolean.
   *
   * @private
   * @param {object} obj
   * @param {string} [isType]
   * @returns {string|boolean}
   */
  function typeOf(obj, isType) {

    var type = obj === null ? 'null' : // IE 7/8 fix -> null check
               obj === undefined ? 'undefined' : // IE 7/8 fix -> undefined check
               typeof obj;

    type = type !== 'object' ? type : Object.prototype.toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    // IE 7/8 fix -> arguments check (the try block is needed because in strict mode arguments.callee can not be accessed)
    if (type === 'object') {
      try {
        type = typeof obj.callee === 'function' && obj === obj.callee.arguments ? 'arguments' : type;
      } catch (e) {}
    }

    return isType ? type === isType : type;

  }

  /**
   * Clone array or arguments object or alternatively copy values from an array to another array. If a non-array value is provided as the 'from' param a new empty array will be returned. If 'to' param is provided it will be emptied and populated with 'from' array's values.
   *
   * @private
   * @param {array} from
   * @param {array} [to]
   * @returns {array}
   */
  function copyArray(from, to) {

    var
    fromType = typeOf(from),
    ret = fromType === 'array' ? from.slice(0) : fromType === 'arguments' ? Array.prototype.slice.call(from) : [];

    if (typeOf(to, 'array')) {
      to.length = 0;
      arrayEach(ret, function (fromVal) {
        to.push(fromVal);
      });
      ret = to;
    }

    return ret;

  }

  /**
   * Loop array items.
   *
   * @private
   * @param {array} array
   * @param {function} callback
   * @returns {array}
   */
  function arrayEach(array, callback) {

    if (typeOf(callback, 'function')) {
      for (var i = 0, len = array.length; i < len; i++) {
        callback(array[i], i);
      }
    }

    return array;

  }

  /**
   * Define a module. Returns module instance if module registration was successful, otherwise returns false. Validates arguments and makes sure that no bad data is passed on to Module constructor.
   *
   * @private
   * @param {string} id
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {boolean|Module}
   */
  function defineSingle(id, dependencies, factory) {

    var
    hasDeps = factory,
    depIds = hasDeps ? sanitizeDependencies(dependencies) : [],
    factory = hasDeps ? factory : dependencies,
    factoryType = typeOf(factory),
    isValid = id && typeOf(id, 'string') && modules[id] === undefined && (factoryType === 'object' || factoryType === 'function');

    return isValid ? new Module(id, depIds, factory) : false;

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
   * Load dependencies by their ids and return a deferred object that will be resolved when the all dependencies are loaded.
   *
   * @private
   * @param {array} dependencies
   * @param {function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    ret = [],
    counter = 0,
    tryResolve = function (module, i) {
      ++counter;
      module.locked = true;
      ret[i] = module.value;
      if (counter === dependencies.length) {
        callback(ret);
      }
    };

    if (dependencies.length) {
      arrayEach(dependencies, function (depId, i) {
        var module = modules[depId];
        if (module && module.loaded) {
          tryResolve(module, i);
        }
        else {
          lib.on(evInitiate + '-' + depId, function (ev, module) {
            lib.off(ev.type, ev.fn);
            tryResolve(module, i);
          });
        }
      });
    }
    else {
      callback(ret);
    }

  }

  /**
   * Public API.
   */

  /**
   * Module storage object.
   *
   * @protected
   * @type {object}
   */
  lib._modules = modules;

  /**
   * @public
   * @see typeOf
   */
  lib.typeOf = typeOf;

  /**
   * @public
   * @see Eventizer
   */
  lib.Eventizer = Eventizer;

  /**
   * @public
   * @see Deferred
   */
  lib.Deferred = Deferred;

  /**
   * @public
   * @see Module
   */
  lib.Module = Module;

  /**
   * Define a single module or multiple modules. Returns an array that contains instances of all modules that were succesfully registered.
   *
   * @public
   * @param {string|array} ids
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {array}
   */
  lib.define = function (ids, dependencies, factory) {

    ids = typeOf(ids, 'array') ? ids : [ids];

    var ret = [];

    arrayEach(ids, function (id) {

      var module = defineSingle(id, dependencies, factory);

      if (module) {
        ret.push(module);
      }

    });

    return ret;

  };

  /**
   * Undefine a module. If any other define or require instance depends on the module it cannot be undefined. Returns an array tha contains id's of all modules that were undefined successfully, otherwise returns false.
   *
   * @public
   * @param {string|array} ids
   * @returns {array}
   */
  lib.undefine = function (ids) {

    ids = typeOf(ids, 'array') ? ids : [ids];

    var ret = [];

    arrayEach(ids, function (id) {

      var
      module = modules[id],
      isLocked = module && module.locked;

      if (module && !isLocked) {
        delete modules[id];
        ret.push(id);
      }

    });

    return ret;

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
   * Eventize an object (if provided) or return a new Eventizer instance.
   *
   * @public
   * @param {object} [obj]
   * @param {object} [listeners]
   * @returns {object|Eventizer}
   */
  lib.eventize = function (obj, listeners) {

    var eventizer = new Eventizer(listeners);
    if (typeOf(obj, 'object')) {
      obj._listeners = eventizer._listeners;
      obj.on = eventizer.on;
      obj.off = eventizer.off;
      obj.emit = eventizer.emit;
      return obj;
    }
    else {
      return eventizer;
    }

  };

  /**
   * Return a new Deferred instance.
   *
   * @public
   * @param {function} [callback]
   * @returns {Deferred}
   */
  lib.deferred = function (callback) {

    return new Deferred(callback);

  };

  /**
   * Return a new Deferred instance which will be resolved/rejected when the provided deferreds are resolved/rejected.
   *
   * @public
   * @param {Deferred|array} [deferreds]
   * @param {boolean} [resolveOnFirst=false]
   * @param {boolean} [rejectOnFirst=true]
   * @returns {Deferred}
   */
  lib.when = function () {

    return Deferred.prototype.join.apply(0, arguments);

  };

  /** Eventize the library -> on/off/emit methods. */
  lib.eventize(lib);

  /**
   * Publish library using an adapted UMD pattern.
   * https://github.com/umdjs/umd
   */
  if (typeOf(glob.define, 'function') && define.amd) {
    define([], lib);
  }
  else if (typeOf(glob.exports, 'object')) {
    module.exports = lib;
  }
  else {
    glob[ns] = lib;
  }

})(this);
