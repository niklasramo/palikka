/*!
 * @license
 * Palikka v0.3.2
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

(function (undefined) {

  'use strict';

  var

  /** Name of the library. */
  ns = 'palikka',

  /** Public API interface. */
  lib = {},

  /** Main configuration object. */
  config = {
    asyncDeferreds: true,
    asyncModules: true
  },

  /** Modules container. */
  modules = {},

  /** Private event hub and event names. */
  evHub,
  evInitiate = 'initiate',
  evResolve = 'resolve',
  evReject = 'reject',

  /** Deferred states. */
  statePending = 'pending',
  stateFulfilled = 'fulfilled',
  stateRejected = 'rejected',

  /** Deferred id counter. */
  uuid = 0,

  /** Cache native toString and slice methods. */
  toString = {}.toString,
  slice = [].slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true,

  /** Environment check. */
  isNode = typeof process === 'object' && typeOf(process, 'process'),

  /** Global object. */
  glob = isNode ? global : window,

  /** Get next tick method. */
  nextTick = getNextTick();

  /**
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
   * @memberof Eventizer
   * @param {string} type
   * @param {function} callback
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.on = function (type, callback) {

    var
    listeners = this._listeners;

    if (typeOf(callback, 'function')) {

      listeners[type] = listeners[type] || [];
      listeners[type].push({
        id: ++uuid,
        type: type,
        fn: callback
      });

    }

    return this;

  };

  /**
   * Bind an event listener.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {function} callback
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.one = function (type, callback) {

    var
    instance = this;

    instance.on(type, function (e) {

      instance.off(e.type, e.id);
      callback.apply(this, arguments);

    });

    return instance;

  };

  /**
   * Unbind event listeners based on event's type. Optionally one can provide a target that can be a callback function or an id that will be matched used to target specific events. If no target is provided all listeners for the specified type will be removed.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {function|number} [target]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.off = function (type, target) {

    var
    listeners = this._listeners,
    targetType = typeOf(target),
    targetId = targetType === 'number',
    targetFn = targetType === 'function',
    eventObjects = listeners[type],
    eventObject,
    i;

    if (eventObjects) {

      i = eventObjects.length;

      while (i--) {

        eventObject = eventObjects[i];

        if (!target || (targetFn && target === eventObject.fn) || (targetId && target === eventObject.id)) {

          eventObjects.splice(i, 1);

        }

      }

      if (!eventObjects.length) {

        delete listeners[type];

      }

    }

    return this;

  };

  /**
   * Emit event. Optionally one can provide context and additional arguments for the callback functions.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {array} [args]
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.emit = function (type, args, ctx) {

    var
    instance = this,
    eventObjects = instance._listeners[type];

    if (eventObjects) {

      arrayEach(copyArray(eventObjects), function (eventObject) {

        if (typeOf(eventObject.fn, 'function')) {

          var
          cbArgs = copyArray(args),
          cbCtx = ctx === undefined ? instance : ctx;

          cbArgs.unshift({
            id: eventObject.id,
            type: eventObject.type,
            fn: eventObject.fn
          });

          eventObject.fn.apply(cbCtx, cbArgs);

        }

      });

    }

    return instance;

  };

  /**
   * Emit event asynchronously. Optionally one can provide context and additional arguments for the callback functions.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {array} [args]
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  Eventizer.prototype.emitAsync = function (type, args, ctx) {

    var
    instance = this;

    execFn(function () {

      instance.emit(type, args, ctx);

    }, 1);

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
      obj.one = eventizer.one;
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
   * Create a deferred object. Promises A/+ compatible.
   *
   * @class
   * @private
   * @param {function} executor
   */
  function Deferred(executor) {

    var
    instance = this;

    /**
     * Instance's resolve event name.
     *
     * @protected
     * @type {string}
     */
    instance._id = ++uuid;

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

    /**
     * Indicates if the deferred instance is asynchronous (Promises A/+ compatible).
     *
     * @protected
     * @type {boolean}
     */
    instance._asynchronous = config.asyncDeferreds;

    /** Call executor function if provided. */
    if (typeOf(executor, 'function')) {

      executor(
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
   * Control instances asynchronity. Providing true as the value will set the instance to be asynchronous. Providing false will set the instance synchronous.
   *
   * @protected
   * @memberof Deferred.prototype
   * @param {boolean} isAsync
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype._async = function (isAsync) {

    this._asynchronous = isAsync ? true : false;

    return this;

  };

  /**
   * Get current state of the instance.
   *
   * @memberof Deferred.prototype
   * @returns {string} 'pending', 'fulfilled' or 'rejected'.
   */
  Deferred.prototype.state = function () {

    return this._state;

  };

  /**
   * Get instance's result value.
   *
   * @memberof Deferred.prototype
   * @returns {*}
   */
  Deferred.prototype.result = function () {

    return this._result;

  };

  /**
   * Resolve deferred. All provided arguments will be passed directly to 'onFulfilled' and 'onSettled' callback functions.
   *
   * @memberof Deferred.prototype
   * @param {*} [val]
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.resolve = function (val) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      processResolve(instance, val);

    }

    return instance;

  };

  /**
   * Reject deferred. All provided arguments will be passed directly to 'onRejected' and 'onSettled' callback functions.
   *
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.reject = function (reason) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      finalizeReject(instance, reason);

    }

    return instance;

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onFulfilled = function (callback) {

    return deferredEventHandler(this, callback, stateFulfilled, evResolve);

  };

  /**
   * Execute a callback function asynchronously when the deferred is rejected.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  Deferred.prototype.onRejected = function (callback) {

    return deferredEventHandler(this, callback, stateRejected, evReject);

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved or rejected.
   *
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
   * @memberof Deferred.prototype
   * @param {function} [onFulfilled]
   * @param {function} [onRejected]
   * @returns {Deferred} Creates a new deferred.
   */
  Deferred.prototype.then = function (onFulfilled, onRejected) {

    var
    instance = this,
    next = defer(),
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

  /**
   * Deferred - Helpers
   * ******************
   */

  /**
   * Create a new deferred instance. Shorthand for "new Deferred()".
   *
   * @public
   * @param {function} [executor]
   * @returns {Deferred}
   */
  function defer(executor) {

    return new Deferred(executor);

  }

  /**
   * Process deferred instance's resolve method.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} val
   */
  function processResolve(instance, val) {

    if (val === instance) {

      finalizeReject(instance, TypeError('A promise can not be resolved with itself.'));

    }
    else if (val instanceof Deferred) {

      val
      .onFulfilled(function (value) {

        finalizeResolve(instance, value);

      })
      .onRejected(function (reason) {

        finalizeReject(instance, reason);

      });

    }
    else if (typeOf(val, 'function') || typeOf(val, 'object')) {

      processThenable(instance, val);

    }
    else {

      finalizeResolve(instance, val);

    }

  }

  /**
   * Process a thenable value within a deferred's resolve process.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} val
   */
  function processThenable(instance, val) {

    try {

      var
      then = val.then,
      thenHandled = 0;

      if (typeOf(then, 'function')) {

        try {

          then.call(
            val,
            function (value) {

              if (!thenHandled) {
                thenHandled = 1;
                processResolve(instance, value);
              }

            },
            function (reason) {

              if (!thenHandled) {
                thenHandled = 1;
                finalizeReject(instance, reason);
              }

            }
          );

        }
        catch (e) {

          if (!thenHandled) {
            finalizeReject(instance, e);
          }

        }

      }
      else {

        finalizeResolve(instance, val);

      }

    }
    catch (e) {

      finalizeReject(instance, e);

    }

  }

  /**
   * Finalize deferred instance's resolve method.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} val
   */
  function finalizeResolve(instance, val) {

    instance._result = val;
    instance._state = stateFulfilled;
    evHub.emit(evResolve + instance._id, [val]);

  }

  /**
   * Finalize deferred instance's reject method.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} reason
   */
  function finalizeReject(instance, reason) {

    instance._result = reason;
    instance._state = stateRejected;
    evHub.emit(evReject + instance._id, [reason]);

  }

  /**
   * Handler for onResolved and onRejected methods.
   *
   * @private
   * @param {Deferred} instance
   * @param {function} callback
   * @param {string} refState
   * @param {string} refEvent
   * @returns {Deferred}
   */
  function deferredEventHandler(instance, callback, refState, refEvent) {

    if (typeOf(callback, 'function')) {

      if (instance._state === refState) {

        deferredEventExec(instance, callback);

      }

      if (instance._state === statePending) {

        evHub.one(refEvent + instance._id, function () {

          deferredEventExec(instance, callback);

        });

      }

    }

    return instance;

  }

  /**
   * Callback executor helper function for onResolved and onRejected.
   *
   * @private
   * @param {Deferred} instance
   * @param {function} callback
   */
  function deferredEventExec(instance, callback) {

    execFn(function () {

      callback(instance.result());

    }, instance._asynchronous);

  }

  /**
   * Returns a "master" deferred that resolves when all of the deferred arguments have resolved. The master deferred is rejected instantly if any of the sub-deferreds is rejected.
   *
   * @private
   * @param {arguments|array} deferreds
   * @param {boolean|undefined} [resolveOnFirst=false]
   * @param {boolean|undefined} [rejectOnFirst=true]
   * @returns {Deferred} A new deferred.
   */
  function when(deferreds, resolveOnFirst, rejectOnFirst) {

    resolveOnFirst = resolveOnFirst === true;
    rejectOnFirst = rejectOnFirst === undefined || rejectOnFirst === true;

    var
    master = defer(),
    masterArgs = [],
    counter = deferreds.length,
    firstRejection;

    if (counter) {

      arrayEach(deferreds, function (deferred, i) {

        deferred = deferred instanceof Deferred ? deferred : defer()._async(false).resolve(deferred);

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

  /**
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
    deferred = defer()._async(false),
    factoryCtx,
    factoryValue;

    /** Module data. */
    instance._id = id;
    instance._dependencies = dependencies;
    instance._deferred = deferred;

    /** Add module to modules object. */
    modules[id] = instance;

    /** Emit initiation event when module is loaded. */
    deferred.onFulfilled(function () {

      evHub.emit(evInitiate + '-' + id, [instance]);

    });

    /** Load dependencies and resolve factory value. */
    loadDependencies(dependencies, function (depModules, depHash) {

      if (typeOf(factory, 'function')) {

        factoryCtx = {
          id: id,
          dependencies: depHash
        };

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

  /**
   * Module - Helpers
   * ****************
   */

  /**
   * Define a module or multiple modules.
   *
   * @private
   * @param {array|string} ids
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   */
  function defineModule(ids, dependencies, factory) {

    var
    hasDeps = arguments.length > 2,
    deps,
    circDep;

    /** Validate/sanitize ids. */
    typeCheck(ids, 'array|string');
    ids = typeOf(ids, 'array') ? ids : [ids];

    /** Validate/sanitize dependencies. */
    if (hasDeps) {

      typeCheck(dependencies, 'array|string');
      deps = typeOf(dependencies, 'array') ? dependencies : [dependencies];

    }
    else {

      deps = [];

    }

    /** Validate/sanitize factory. */
    factory = hasDeps ? factory : dependencies;
    typeCheck(factory, 'function|object');

    /** Define modules. */
    arrayEach(ids, function (id) {

      /** Validate id type. */
      typeCheck(id, 'string');

      /** Make sure id is not empty. */
      if (!id) {

        throw Error('Module must have an id.');

      }

      /** Make sure id is not reserved. */
      if (modules[id] instanceof Module) {

        throw Error('Module ' + id + ' is already defined.');

      }

      /** Detect circular dependencies. */
      if (hasDeps && deps.length) {

        circDep = getCircDependency(id, deps);

        if (circDep) {

          throw Error('Circular dependency between ' + id + ' and ' + circDep + '.');

        }

      }

      /** Define the module. */
      new Module(id, deps, factory);

    });

    return lib;

  }

  /**
   * Require a module.
   *
   * @private
   * @param {array|string} dependencies
   * @param {function} callback
   */
  function requireModule(dependencies, callback) {

    typeCheck(callback, 'function');
    typeCheck(dependencies, 'array|string');
    dependencies = typeOf(dependencies, 'array') ? dependencies : [dependencies];

    loadDependencies(dependencies, function (depModules, depHash) {

      callback.apply({dependencies: depHash}, depModules);

    });

    return lib;

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
    defers = [],
    hash = {};

    arrayEach(dependencies, function (depId) {

      typeCheck(depId, 'string');

      var
      module = modules[depId];

      defers.push(module ? module._deferred : defer(function (resolve) {

        evHub.one(evInitiate + '-' + depId, function (ev, module) {

          resolve(module._deferred.result());

        });

      })._async(config.asyncModules));

    });

    when(defers)._async(config.asyncModules).onFulfilled(function (depModules) {

      arrayEach(dependencies, function (depId, i) {

        hash[depId] = depModules[i];

      });

      callback(depModules, hash);

    });

  }

  /**
   * Return the first circular dependency's id or null.
   *
   * @private
   * @param {string} id
   * @param {array} dependencies
   * @returns {null|string}
   */
  function getCircDependency(id, dependencies) {

    var
    ret = null;

    arrayEach(dependencies, function (depId) {

      var
      depModule = modules[depId];

      if (depModule) {

        arrayEach(depModule._dependencies, function (depModuleDep) {

          if (!ret && depModuleDep === id) {

            ret = depModule._id;

            return 1;

          }

        });

      }

      if (ret) {

        return 1;

      }

    });

    return ret;

  }

  /**
   * Returns info about all modules or a single module. Returns null if no modules are found.
   *
   * @private
   * @param {number} [id]
   * @returns {null|object}
   */
  function getModuleData(id) {

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
      obj === null ? 'null' : /** IE 7/8 fix -> null check. */
      obj === undefined ? 'undefined' : /** IE 7/8 fix -> undefined check. */
      typeof obj
    );

    type = type !== 'object' ? type : toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    /** IE 7/8 fix -> arguments check (the try block is needed because in strict mode arguments.callee can not be accessed). */
    if (!isStrict && type === 'object') {

      type = typeof obj.callee === 'function' && obj === obj.callee.arguments ? 'arguments' : type;

    }

    return isType ? type === isType : type;

  }

  /**
   * Throw a type error if a value is not of the expected type(s). Check against multiple types using '|' as the delimiter.
   *
   * @private
   * @param {*} val
   * @param {string} types
   */
  function typeCheck(val, types) {

    var
    ok = false,
    typesArray = types.split('|');

    arrayEach(typesArray, function (type) {

      if (!ok) {

        ok = type === 'deferred' ? val instanceof Deferred : typeOf(val, type);

      }

    });

    if (!ok) {

      throw TypeError(val + ' is not ' + types);

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

        if (callback(array[i], i)) {
          break;
        }

      }

    }

    return array;

  }

  /**
   * Create cross-browser next tick implementation. Returns a function that accepts a function as a parameter.
   *
   * @todo Add some faster fallbacks such onreadystatechange for IE7-IE10. setImmediate is broken unfortunately.
   *
   * @private
   * @returns {function}
   */
  function getNextTick() {

    var
    NativePromise = isNative(glob.Promise),
    NativeMT,
    queueEmpty,
    processQueue,
    tryFireTick,
    fireTick,
    observerTarget;

    /** First let's try to take advantage of native ES6 Promises. Callback queue is handled automatically by the browser. */
    if (NativePromise) {

      NativePromise = NativePromise.resolve();

      /** Return next tick function. */
      return function (cb) {

        NativePromise.then(cb);

      };

    }
    /** Node.js has good existing next tick implementations, so let's use them. */
    else if (isNode) {

      return glob.setImmediate || process.nextTick;

    }
    /** In unfortunate cases we have to create hacks and manually manage the callback queue. */
    else {

      /** Let's check if mutation observer is supported. */
      NativeMT = isNative(glob.MutationObserver) || isNative(glob.WebKitMutationObserver);

      /** Flag for checking the state of the queue. */
      queueEmpty = 1;

      /** Function to process the queue (fire the callbacks). */
      processQueue = function () {

        queueEmpty = 1;
        evHub.emit('tick');

      };

      /** Function to try trigger next tick.  */
      tryFireTick = function () {

        if (queueEmpty) {

          queueEmpty = 0;
          fireTick();

        }

      };

      /** MutationObserver fallback. */
      if (NativeMT) {

        observerTarget = document.createElement('i');
        (new NativeMT(processQueue)).observe(observerTarget, {attributes: true});

        fireTick = function () {

          observerTarget.id = '';

        };

      }
      /** setTimeout fallback. */
      else {

        fireTick = function () {

          glob.setTimeout(processQueue, 0);

        };

      }

      /** Return next tick function. */
      return function (cb) {

        evHub.one('tick', cb);
        tryFireTick();

      };

    }

  }

  /**
   * Execute a function, sync or async, it's up to you.
   *
   * @private
   * @param {function} fn
   * @param {boolean} [async]
   */
  function execFn(fn, async) {

    async ? nextTick(fn) : fn();

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
   * Public API
   * **********
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
   * @public
   * @see Deferred
   */
  lib.Deferred = Deferred;

  /**
   * @public
   * @see defer
   */
  lib.defer = defer;

  /**
   * @public
   * @see when
   */
  lib.when = when;

  /**
   * @public
   * @see defineModule
   */
  lib.define = defineModule;

  /**
   * @public
   * @see requireModule
   */
  lib.require = requireModule;

  /**
   * @public
   * @see getModuleData
   */
  lib._getModules = getModuleData;

  /**
   * @public
   * @see typeOf
   */
  lib._typeOf = typeOf;

  /**
   * @public
   * @see nextTick
   */
  lib._nextTick = nextTick;

  /**
   * @public
   * @see config
   */
  lib._config = config;

  /**
   * Initiate
   * ********
   */

  /** Initialize private event hub. */
  evHub = eventize();

  /**
   * Publish library using an adapted UMD pattern.
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

})();
