/*!
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
  evRegister = 'register',
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
  isStrict = !this === true;

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
    instance = this,
    id = ++deferredId;

    /**
     * Instance's resolve event name.
     *
     * @protected
     * @type {string}
     */
    instance._eRes = evResolve + '-' + id;

    /**
     * Instance's reject event name.
     *
     * @protected
     * @type {string}
     */
    instance._eRej = evReject + '-' + id;

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
     * @type {undefined|array}
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
        function (val) {

          instance.reject(val);

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

    isDeferred(this);

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

    isDeferred(this);

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

    isDeferred(instance);

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

    isDeferred(instance);

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      rejectHandler(instance, reason);

    }

    return instance;

  };

  /**
   * Execute a callback function when the deferred is resolved.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onFulfilled = function (callback) {

    var
    instance = this;

    isDeferred(instance);

    if (typeOf(callback, 'function')) {

      if (instance._state === stateFulfilled) {

        callback(instance.result());

      }

      if (instance._state === statePending) {

        evHub.on(instance._eRes, function (e) {

          callback(instance.result());
          evHub.off(e.type, e.fn);

        });

      }

    }

    return instance;

  };

  /**
   * Execute a callback function when the deferred is rejected.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onRejected = function (callback) {

    var
    instance = this;

    isDeferred(instance);

    if (typeOf(callback, 'function')) {

      if (instance._state === stateRejected) {

        callback(instance.result());

      }

      if (instance._state === statePending) {

        evHub.on(instance._eRej, function (e) {

          callback(instance.result());
          evHub.off(e.type, e.fn);

        });

      }

    }

    return instance;

  };

  /**
   * Execute a callback function when the deferred is resolved or rejected.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onSettled = function (callback) {

    isDeferred(this);

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

    isDeferred(this);

    var
    instance = this,
    next = new Deferred(),
    isFulfilled,
    fateCallback;

    // TODO: this callback should be bound after next is returned.
    // https://promisesaplus.com/
    // Rule: 2.2.4
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
   * @param {*} deferreds
   * @param {boolean} [resolveOnFirst=false]
   * @param {boolean} [rejectOnFirst=true]
   * @returns {Deferred} A new deferred.
   */
  Deferred.prototype.and = function (deferreds, resolveOnFirst, rejectOnFirst) {

    isDeferred(this);
    deferreds = typeOf(deferreds, 'array') ? deferreds : [deferreds];
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
    evHub.emit(instance._eRes, [val]);

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
    evHub.emit(instance._eRej, [reason]);

  }

  /**
   * Check if a value is a deferred instance. By default throws a type error if test fails, but can be configured not to throw error.
   *
   * @private
   * @param {*} val
   * @param {boolean} [noError=false]
   * @returns {boolean}
   */
  function isDeferred(val, noError) {

    var
    ret = val instanceof Deferred;

    if (!noError && !ret) {

      throw TypeError(this + ' is not a promise');

    }

    return ret;

  }

  /**
   * Returns a "master" deferred that resolves when all of the deferred arguments have resolved. The master deferred is rejected instantly if any of the sub-deferreds is rejected.
   *
   * @private
   * @param {*} deferreds
   * @param {boolean} [resolveOnFirst=false]
   * @param {boolean} [rejectOnFirst=true]
   * @returns {Deferred} A new deferred.
   */
  function when(deferreds, resolveOnFirst, rejectOnFirst) {

    deferreds = typeOf(deferreds, 'array') ? deferreds : [deferreds];
    resolveOnFirst = resolveOnFirst === true;
    rejectOnFirst = rejectOnFirst === undefined || rejectOnFirst === true;

    var
    master = new Deferred(),
    masterArgs = [],
    counter = deferreds.length,
    firstRejection;

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
    instance = this;

    // Module data.
    instance.id = id;
    instance.value = undefined;
    instance.loaded = false;
    instance.locked = false;
    instance.dependencies = dependencies;
    instance.factory = factory;

    // Add module to modules object.
    modules[id] = instance;

    // Emit register events.
    evHub.emit(evRegister + '-' + id, [instance]);
    evHub.emit(evRegister, [instance]);

    // Initiate.
    loadDependencies(dependencies, function (depModules) {

      instance.process(depModules);

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
    instance = this,
    factoryCtx,
    factoryValue,
    factoryAsync,
    factoryInit = function (val) {

      instance.initiate(arguments.length ? val : factoryValue);

    };

    if (typeOf(instance.factory, 'function')) {

      factoryCtx = {
        id: instance.id,
        dependencies: {},
        async: function () {

          factoryAsync = true;

          return factoryInit;

        }
      };

      arrayEach(instance.dependencies, function (depId) {

        factoryCtx.dependencies[depId] = modules[depId].value;

      });

      factoryValue = instance.factory.apply(factoryCtx, depModules);

      if (!factoryAsync) {

        factoryInit(factoryValue);

      }

    }
    else {

      factoryInit(instance.factory);

    }

    return instance;

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

    var
    instance = this;

    if (instance === modules[instance.id] && !instance.loaded) {

      instance.value = value;
      instance.loaded = true;
      evHub.emit(evInitiate + '-' + instance.id, [instance]);
      evHub.emit(evInitiate, [instance]);

    }

    return instance;

  };

  /*
   * Module - Helpers
   * ****************
   */

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
   * Load module dependencies.
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

        var
        module = modules[depId];

        if (module && module.loaded) {

          tryResolve(module, i);

        }
        else {

          evHub.on(evInitiate + '-' + depId, function (ev, module) {

            evHub.off(ev.type, ev.fn);
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
   * Public API
   * **********
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
   * @public
   * @see when
   */
  lib.when = when;

  /**
   * @public
   * @see typeOf
   */
  lib.typeOf = typeOf;

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

    var
    ret = [];

    ids = typeOf(ids, 'array') ? ids : [ids];

    arrayEach(ids, function (id) {

      var
      module = defineSingle(id, dependencies, factory);

      if (module) {

        ret.push(module);

      }

    });

    return ret;

  };

  /**
   * Undefine a module. Returns an array tha contains id's of all modules that were undefined successfully, otherwise returns false.
   *
   * @public
   * @param {string|array} ids
   * @returns {array}
   */
  lib.undefine = function (ids) {

    var
    ret = [];

    ids = typeOf(ids, 'array') ? ids : [ids];

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

    var
    eventizer = new Eventizer(listeners);

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
   * Initiate
   * ********
   */

  /** Initialize private event hub. */
  evHub = new Eventizer();

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
