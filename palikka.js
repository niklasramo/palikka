/*!
 * @license
 * Palikka v0.3.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

(function (glob) {

  'use strict';

  var

  /** Name of the library. */
  ns = 'palikka',

  /** Public API interface. */
  lib = {},

  /** Modules container. */
  modules = {},

  /** Private event hub + event names. */
  evHub,
  evInitiate = 'initiate',
  evResolve = 'resolve',
  evReject = 'reject',

  /** Deferred states. */
  statePending = 'pending',
  stateFulfilled = 'fulfilled',
  stateRejected = 'rejected',

  /** Deferred id counter. */
  deferredId = 0,

  /* Cache native toString and slice methods. */
  toString = ({}).toString,
  slice = ([]).slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true,

  /** Get reference to native Promise. */
  nativePromise = isNative(glob.Promise),

  /** Get reference to native setImmediate. */
  nativeSetImmediate = isNative(glob.setImmediate);

  /*
   * Eventizer - Constructor
   * ***********************
   */

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

    var
    listeners = this._listeners;

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
   * @param {array} [args]
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.emit = function (type, args, ctx) {

    var
    instance = this,
    typeCallbacks = instance._listeners[type];

    if (typeCallbacks) {

      arrayEach(copyArray(typeCallbacks), function (callback) {

        if (typeOf(callback, 'function')) {

          var
          cbArgs = copyArray(args),
          cbCtx = typeOf(ctx, 'undefined') ? instance : ctx;

          cbArgs.unshift({type: type, fn: callback});
          callback.apply(cbCtx, cbArgs);

        }

      });

    }

    return instance;

  };

  /**
   * Emit event asynchronously. Optionally one can provide context and additional arguments for the callback functions.
   *
   * @public
   * @memberof Eventizer
   * @param {string} type
   * @param {array} [args]
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.emitAsync = function (type, args, ctx) {

    var
    instance = this;

    execAsync(function () {

      instance.emit(type, args, ctx);

    });

    return instance;

  };

  /*
   * Eventizer - Helpers
   * *******************
   */

  /**
   * Eventize an object (if provided) or return a new Eventizer instance.
   *
   * @public
   * @param {object} [obj]
   * @param {object} [listeners]
   * @returns {object|Eventizer}
   */
  function eventize(obj, listeners) {

    var
    eventizer = new Eventizer(listeners);

    if (typeOf(obj, 'object')) {

      obj._listeners = eventizer._listeners;
      obj.on = eventizer.on;
      obj.off = eventizer.off;
      obj.emit = eventizer.emit;
      obj.emitAsync = eventizer.emitAsync;

      return obj;

    }
    else {

      return eventizer;

    }

  }

  /*
   * Deferred - Constructor
   * **********************
   */

  /**
   * Create a deferred object.
   *
   * @class
   * @private
   * @param {function} callback
   */
  function Deferred(callback) {

    var
    instance = this;

    /**
     * Instance's resolve event name.
     *
     * @protected
     * @type {string}
     */
    instance._id = ++deferredId;

    /**
     * Indicates if the instance can be resolved/rejected while in pending state. This property will be set to true on the first resolve/reject call.
     *
     * @protected
     * @type {boolean}
     */
    instance._locked = false;

    /**
     * The instance's result value is stored here.
     *
     * @protected
     * @type {*}
     */
    instance._result = undefined;

    /**
     * Holds information about the state of the deferred. A deferred can have three different states: 'pending', 'fulfilled' or 'rejected'.
     *
     * @protected
     * @type {string}
     */
    instance._state = statePending;

    /** Call callback function if provided. */
    if (typeOf(callback, 'function')) {

      callback(
        function (val) {

          instance.resolve(val);

        },
        function (reason) {

          instance.reject(reason);

        }
      );

    }

  }

  /**
   * Get current state of the instance.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {string} 'pending', 'fulfilled' or 'rejected'.
   */
  Deferred.prototype.state = function () {

    return this._state;

  };

  /**
   * Get instance's result value.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {*}
   */
  Deferred.prototype.result = function () {

    return this._result;

  };

  /**
   * Resolve deferred. All provided arguments will be passed directly to 'onFulfilled' and 'onSettled' callback functions.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {*} [val=undefined]
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.resolve = function (val) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;

      if (val instanceof Deferred) {

        val
        .onFulfilled(function (val) {

          resolveHandler(instance, val);

        })
        .onRejected(function (reason) {

          rejectHandler(instance, reason);

        });

      }
      else {

        resolveHandler(instance, val);

      }

    }

    return instance;

  };

  /**
   * Reject deferred. All provided arguments will be passed directly to 'onRejected' and 'onSettled' callback functions.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.reject = function (reason) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      rejectHandler(instance, reason);

    }

    return instance;

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onFulfilled = function (callback) {

    var
    instance = this;

    execAsync(function () {

      if (typeOf(callback, 'function')) {

        if (instance._state === stateFulfilled) {

          callback(instance.result());

        }

        if (instance._state === statePending) {

          evHub.on(evResolve + instance._id, function (e) {

            callback(instance.result());
            evHub.off(e.type, e.fn);

          });

        }

      }

    });

    return instance;

  };

  /**
   * Execute a callback function asynchronously when the deferred is rejected.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onRejected = function (callback) {

    var
    instance = this;

    execAsync(function () {

      if (typeOf(callback, 'function')) {

        if (instance._state === stateRejected) {

          callback(instance.result());

        }

        if (instance._state === statePending) {

          evHub.on(evReject + instance._id, function (e) {

            callback(instance.result());
            evHub.off(e.type, e.fn);

          });

        }

      }

    });

    return instance;

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved or rejected.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onSettled = function (callback) {

    return this.onFulfilled(callback).onRejected(callback);

  };

  /**
   * Chain deferreds.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} [onFulfilled]
   * @param {function} [onRejected]
   * @returns {Deferred} Creates a new deferred.
   */
  Deferred.prototype.then = function (onFulfilled, onRejected) {

    var
    instance = this,
    next = new Deferred(),
    isFulfilled,
    fateCallback;

    instance.onSettled(function (instanceVal) {

      isFulfilled = instance.state() === stateFulfilled;
      onFulfilled = isFulfilled && typeOf(onFulfilled, 'function') ? onFulfilled : 0;
      onRejected = !isFulfilled && typeOf(onRejected, 'function') ? onRejected : 0;
      fateCallback = onFulfilled || onRejected || 0;

      /**
       * If we have a callback that matches the instance's fate (fulfilled -> onFulfilled, rejected -> onRejected)
       * or if the instance was fulfilled, let's do the default try catch procedure.
       */
      if (fateCallback || isFulfilled) {

        try {

          next.resolve(fateCallback ? fateCallback(instanceVal) : instanceVal);

        } catch (e) {

          next.reject(e);

        }

      }
      /** In other cases, let's sink the error down the then chain until it's caught. */
      else {

        next.reject(instanceVal);

      }

    });

    return next;

  };

  /**
   * Returns a "master" deferred that resolves when all of the arguments and the instance itself have resolved. The master deferred is rejected instantly if one of the sub-deferreds is rejected.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {array} deferreds
   * @param {boolean} [resolveOnFirst=false]
   * @param {boolean} [rejectOnFirst=true]
   * @returns {Deferred} A new deferred.
   */
  Deferred.prototype.and = function (deferreds, resolveOnFirst, rejectOnFirst) {

    deferreds.unshift(this);

    return when(deferreds, resolveOnFirst, rejectOnFirst);

  };

  /*
   * Deferred - Helpers
   * ******************
   */

  /**
   * Resolve handler.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} val
   */
  function resolveHandler(instance, val) {

    instance._result = val;
    instance._state = stateFulfilled;
    evHub.emit(evResolve + instance._id, [val]);

  }

  /**
   * Reject handler.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} reason
   */
  function rejectHandler(instance, reason) {

    instance._result = reason;
    instance._state = stateRejected;
    evHub.emit(evReject + instance._id, [reason]);

  }

  /**
   * Returns a "master" deferred that resolves when all of the deferred arguments have resolved. The master deferred is rejected instantly if any of the sub-deferreds is rejected.
   *
   * @private
   * @param {array|arguments} deferreds
   * @param {boolean|undefined} [resolveOnFirst=false]
   * @param {boolean|undefined} [rejectOnFirst=true]
   * @returns {Deferred} A new deferred.
   */
  function when(deferreds, resolveOnFirst, rejectOnFirst) {

    resolveOnFirst = resolveOnFirst === true;
    rejectOnFirst = rejectOnFirst === undefined || rejectOnFirst === true;

    var
    master = new Deferred(),
    masterArgs = [],
    counter = deferreds.length,
    firstRejection;

    if (counter) {

      arrayEach(deferreds, function (deferred, i) {

        deferred = deferred instanceof Deferred ? deferred : (new Deferred()).resolve(deferred);

        deferred.onSettled(function () {

          if (master.state() === 'pending' && !master._locked) {

            --counter;
            firstRejection = firstRejection || (deferred.state() === 'rejected' && deferred);
            masterArgs[i] = deferred.result();

            if (firstRejection && (rejectOnFirst || !counter)) {

              master.reject(firstRejection.result());

            }

            if (!firstRejection && (resolveOnFirst || !counter)) {

              master.resolve(resolveOnFirst ? masterArgs[i] : masterArgs);

            }

          }

        });

      });

    }
    else {

      master.resolve(masterArgs);

    }

    return master;

  }

  /*
   * Module - Constructor
   * ********************
   */

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
    instance = this,
    deferred = new Deferred(),
    factoryCtx,
    factoryValue;

    // Module data.
    instance._id = id;
    instance._dependencies = dependencies;
    instance._deferred = deferred;

    // Add module to modules object.
    modules[id] = instance;

    // Emit initiation event when module is loaded.
    deferred.onFulfilled(function () {

      evHub.emit(evInitiate + '-' + id, [instance]);

    });

    // Load dependencies and resolve factory value.
    loadDependencies(dependencies, function (depModules) {

      if (typeOf(factory, 'function')) {

        factoryCtx = {
          id: id,
          dependencies: {}
        };

        arrayEach(dependencies, function (depId, i) {

          factoryCtx.dependencies[depId] = depModules[i];

        });

        factoryValue = factory.apply(factoryCtx, depModules);

      }
      else {

        factoryValue = factory;

      }

      deferred.resolve(factoryValue);

    });

  }

  /**
   * Get module instance info.
   *
   * @public
   * @memberof Module.prototype
   * @returns {object}
   */
  Module.prototype.info = function () {

    var
    instance = this;

    return {
      id: instance._id,
      ready: instance._deferred.state() === stateFulfilled,
      dependencies: copyArray(instance._dependencies),
      value: instance._deferred.result()
    };

  };

  /*
   * Module - Helpers
   * ****************
   */

  /**
   * Define a single module or multiple modules. Returns an array that contains ids of all modules that were succesfully registered.
   *
   * @public
   * @param {array|string} ids
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {array}
   */
  function defineMultiple(ids, dependencies, factory) {

    var
    ret = [];

    ids = typeOf(ids, 'array') ? ids : [ids];

    arrayEach(ids, function (id) {

      var
      module = defineSingle(id, dependencies, factory);

      if (module) {

        ret.push(id);

      }

    });

    return ret;

  }

  /**
   * Define a module. Returns module instance if module registration was successful, otherwise returns false.
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
   * Require a module.
   *
   * @public
   * @param {array|string} dependencies
   * @param {function} callback
   */
  function require(dependencies, callback) {

    if (typeOf(callback, 'function')) {

      loadDependencies(sanitizeDependencies(dependencies), function (depModules) {

        callback.apply(null, depModules);

      });

    }

  }

  /**
   * Sanitize dependencies argument of define and require methods.
   *
   * @private
   * @param {array|string} dependencies
   * @returns {array}
   */
  function sanitizeDependencies(dependencies) {

    var
    type = typeOf(dependencies);

    return type === 'array' ? dependencies : type === 'string' ? [dependencies] : [];

  }

  /**
   * Load module dependencies asynchronously.
   *
   * @private
   * @param {array} dependencies
   * @param {function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    defers = [];

    arrayEach(dependencies, function (depId) {

      var
      module = modules[depId];

      defers.push(module ? module._deferred : new Deferred(function (resolve) {

        evHub.on(evInitiate + '-' + depId, function (ev, module) {

          evHub.off(ev.type, ev.fn);
          resolve(module._deferred.result());

        });

      }));

    });

    when(defers).then(callback);

  }

  /**
   * Returns info about all modules or a single module. Returns null if no modules are found.
   *
   * @private
   * @param {number} id
   * @returns {null|object}
   */
  function moduleData(id) {

    var
    ret = null;

    if (id) {

      if (id in modules) {

        ret = modules[id].info();

      }

    }
    else {

      ret = {};

      for (var prop in modules) {

        ret[prop] = modules[prop].info();

      }

    }

    return ret;

  }

  /**
   * Generic helpers
   * ***************
   */

  /**
   * Returns type of any object in lowercase letters. If "isType" is provided the function will compare the type directly and returns a boolean.
   *
   * @private
   * @param {object} obj
   * @param {string} [isType]
   * @returns {string|boolean}
   */
  function typeOf(obj, isType) {

    var
    type = (
      obj === null ? 'null' : // IE 7/8 fix -> null check
      obj === undefined ? 'undefined' : // IE 7/8 fix -> undefined check
      typeof obj
    );

    type = type !== 'object' ? type : toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    // IE 7/8 fix -> arguments check (the try block is needed because in strict mode arguments.callee can not be accessed)
    if (!isStrict && type === 'object') {

      type = typeof obj.callee === 'function' && obj === obj.callee.arguments ? 'arguments' : type;

    }

    return isType ? type === isType : type;

  }

  /**
   * Throw an error if a value is not of the expected type. Check against nultiple types using '|' as the delimiter.
   * @todo All public API methods should be type checked.
   *
   * @private
   * @param {*} val
   * @param {string} type
   */
  function typeCheck(val, type) {

    var
    ok = false,
    typeArray = type.split('|');

    arrayEach(typeArray, function (typeVariation) {

      if (!ok) {

        ok = typeVariation === 'deferred' ? val instanceof Deferred : typeOf(val, typeVariation);

      }

    });

    if (!ok) {

      throw TypeError(this + ' is not ' + type);

    }

  }

  /**
   * Clone array or arguments object.
   *
   * @private
   * @param {array} array
   * @returns {array}
   */
  function copyArray(array) {

    var
    arrayType = typeOf(array);

    return (
      arrayType === 'array' ? array.slice(0) :
      arrayType === 'arguments' ? slice.call(array) :
      []
    );

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
   * Execute function asynchronously in the next event loop.
   *
   * @private
   * @param {function} fn
   */
  function execAsync(fn) {

    if (nativePromise) {

      nativePromise.resolve().then(fn);

    }
    else if (nativeSetImmediate) {

      nativeSetImmediate(fn);

    }
    else {

      glob.setTimeout(fn, 0);

    }

  }

  /**
   * Check if a function is native code. Returns the passed function if it is native code and otherwise returns false.
   *
   * @private
   * @param {function} fn
   * @returns {function|false}
   */
  function isNative(fn) {

    return typeOf(fn, 'function') && fn.toString().indexOf('[native') > -1 && fn;

  }

  /**
   * Public API - Eventizer
   * **********************
   */

  /**
   * @public
   * @see Eventizer
   */
  lib.Eventizer = Eventizer;

  /**
   * @public
   * @see eventize
   */
  lib.eventize = eventize;

  /**
   * Public API - Modules
   * ********************
   */

  /**
   * @public
   * @see defineMultiple
   */
  lib.define = defineMultiple;

  /**
   * @public
   * @see require
   */
  lib.require = require;

  /**
   * @public
   * @see moduleData
   */
  lib._modules = moduleData;

  /**
   * Public API - Deferred
   * *********************
   */

  /**
   * @public
   * @see Deferred
   */
  lib.Deferred = Deferred;

  /**
   * @public
   * @see when
   */
  lib.when = when;

  /**
   * Public API - Utils
   * ******************
   */

  /**
   * @public
   * @see typeOf
   */
  lib._typeOf = typeOf;

  /**
   * @public
   * @see execAsync
   */
  lib._execAsync = execAsync;

  /**
   * Initiate
   * ********
   */

  /** Initialize private event hub. */
  evHub = new Eventizer();

  /**
   * Publish library using an adapted UMD pattern.
   * https://github.com/umdjs/umd
   */
  if (typeOf(glob.define, 'function') && glob.define.amd) {

    glob.define([], lib);

  }
  else if (typeOf(glob.exports, 'object')) {

    glob.module.exports = lib;

  }
  else {

    glob[ns] = lib;

  }

})(this);
