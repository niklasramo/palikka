/*!
 * Palikka v0.3.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
  TODO
  ----
  - Easier importing of third party libs.
  - Add a minified version to the project repo and improve the build system in general (more automation).
  - Better test coverage (improved tests for return values).
  - Aim for 5k as maximum minified file size + a killer performance.
  - Sort out & freeze API for Deferreds.
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
  stateRejected = 'rejected',

  /* Cache native toString and slice methods. */
  toString = ({}).toString,
  slice = ([]).slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true;

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
    instance = this,
    typeCallbacks = instance._listeners[type];

    if (typeCallbacks) {
      arrayEach(typeCallbacks.slice(0), function (callback) {
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
   * Create a deferred object.
   *
   * @class
   * @private
   * @param {function} callback
   */
  function Deferred(callback) {

    var instance = this;

    /**
     * Instance's event emitter.
     *
     * @protected
     * @type {Eventizer}
     */
    instance._events = new Eventizer();

    /**
     * When the deferred is resolved or rejected the provided arguments are stored here wrapped in an array.
     *
     * @protected
     * @type {undefined|array}
     */
    instance._value = undefined;

    /**
     * Holds information about the state of the deferred. A deferred can have three different states: 'pending', 'resolved' or 'rejected'.
     *
     * @protected
     * @type {string}
     */
    instance._state = statePending;

    /** Call callback function if provided. */
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
   * @memberof Deferred.prototype
   * @returns {string} 'pending', 'resolved' or 'rejected'.
   */
  Deferred.prototype.state = function () {

    return this._state;

  };

  /**
   * Get current value (the arguments with which the instance was resolved/rejected) of the instance.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {undefined|array}
   */
  Deferred.prototype.value = function () {

    return this._value ? copyArray(this._value) : this._value;

  };

  /**
   * Resolve deferred. All provided arguments will be passed directly to 'done' and 'always' callback functions.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.resolve = function () {

    var instance = this;

    if (instance._state === statePending) {
      instance._value = copyArray(arguments);
      instance._state = stateResolved;
      instance._events.emit(evResolve, instance._value);
    }

    return instance;

  };

  /**
   * Reject deferred. All provided arguments will be passed directly to 'fail' and 'always' callback functions.
   *
   * @public
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.reject = function () {

    var instance = this;

    if (instance._state === statePending) {
      instance._value = copyArray(arguments);
      instance._state = stateRejected;
      this._events.emit(evReject, instance._value);
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
  Deferred.prototype.done = function (callback) {

    var instance = this;

    if (typeOf(callback, 'function')) {

      if (instance._state === stateResolved) {
        callback.apply(instance, instance.value());
      }

      if (instance._state === statePending) {
        instance._events.on(evResolve, function (e) {
          callback.apply(instance, instance.value());
          instance._events.off(evResolve, e.fn);
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
  Deferred.prototype.fail = function (callback) {

    var instance = this;

    if (typeOf(callback, 'function')) {

      if (instance._state === stateRejected) {
        callback.apply(instance, instance.value());
      }

      if (instance._state === statePending) {
        instance._events.on(evReject, function (e) {
          callback.apply(instance, instance.value());
          instance._events.off(evReject, e.fn);
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
  Deferred.prototype.always = function (callback) {

    return this.done(callback).fail(callback);

  };

  /**
   * Chain deferreds.
   *
   * @public
   * @memberof Deferred.prototype
   * @param {function} [done]
   * @param {function} [fail]
   * @returns {Deferred} Creates a new deferred.
   */
  Deferred.prototype.then = function (done, fail) {

    var
    instance = this,
    next = new Deferred(),
    ret;

    instance.done(function () {

      try {

        if (typeOf(done, 'function')) {

          ret = done.apply(instance, arguments);

          if (ret instanceof Deferred) {
            ret
            .done(function () {
              next.resolve.apply(next, arguments);
            })
            .fail(function () {
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

    instance.fail(function () {

      if (typeOf(fail, 'function')) {
        fail.apply(instance, arguments);
      }

      next.reject.apply(next, arguments);

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

    deferreds = typeOf(deferreds, 'array') ? deferreds : [deferreds];
    deferreds.unshift(this);
    return when(deferreds, resolveOnFirst, rejectOnFirst);

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
    lib.emit(evRegister + '-' + id, [instance]);
    lib.emit(evRegister, [instance]);

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

    var instance = this;

    if (instance === modules[instance.id] && !instance.loaded) {
      instance.value = value;
      instance.loaded = true;
      lib.emit(evInitiate + '-' + instance.id, [instance]);
      lib.emit(evInitiate, [instance]);
    }

    return instance;

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

    type = type !== 'object' ? type : toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    // IE 7/8 fix -> arguments check (the try block is needed because in strict mode arguments.callee can not be accessed)
    if (!isStrict && type === 'object') {
      type = typeof obj.callee === 'function' && obj === obj.callee.arguments ? 'arguments' : type;
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
    ret = fromType === 'array' ? from.slice(0) : fromType === 'arguments' ? slice.call(from) : [];

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
   * Returns a "master" deferred that resolves when all of the deferred arguments have resolved. The master deferred is rejected instantly if one of the sub-deferreds is rejected.
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

    if (counter) {
      arrayEach(deferreds, function (deferred, i) {
        deferred = deferred instanceof Deferred ? deferred : (new Deferred()).resolve(deferred);
        deferred.always(function () {
          if (master.state() === 'pending') {
            --counter;
            var val = deferred.value();
            firstRejection = firstRejection || (deferred.state() === 'rejected' && deferred);
            masterArgs[i] = val.length < 2 ? val[0] : val;
            if (firstRejection && (rejectOnFirst || !counter)) {
              master.reject.apply(master, firstRejection.value());
            }
            if (!firstRejection && (resolveOnFirst || !counter)) {
              master.resolve.apply(master, resolveOnFirst ? [masterArgs[i]] : masterArgs);
            }
          }
        });
      });
    }
    else {
      master.resolve();
    }

    return master;

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
