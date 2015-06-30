/*!
 * @license
 * Palikka v0.4.0
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
 * Release goals
 * =============
 *
 * - Streamline codebase and API.
 * - Prepare for 1.0.0 release after 0.4.x branch.
 *
 * Task board
 * ==========
 *
 * @idea .bind() -> Check Bluebird.
 * @idea Drop circular dependency detection.
 * @idea Drop type checks.
 * @idea Separate Promise from Deferred.
 * @idea Make private properties of Deferred truly private -> invisible to user. Needs perf tests to see the if it's worth it.
 * @idea Check memory leaks -> Perf tests -> Benchmark.js / jsperf.com
 *
 * @idea .done() -> Check Q and Bluebird.
 * @todo Better handling for collections: https://github.com/petkaantonov/bluebird/blob/master/API.md#collections
 * @todo Update docs and give an example on how to promisify crippled promises -> palikka.when([crippledPromise]);
 * @todo Major test overhaul -> Isolate cases more clearly and add cover more areas.
 * @todo Streamline module system. Try to make it just a thin layer over the promise system.
 *
 * @done Deferred.prototype.spread().
 * @done Deferred.prototype.inspect().
 * @done Deferred.prototype.async().
 * @done Deferred.prototype.sync().
 * @done Better error data for when method in the case when the rejectImmediately argument is false.
 * @done Remove module listing functionality and instead just provide a direct access to to modules object.
 * @done Remove underscore prefix from typeOf, config and nextTick methods.
 * @done Remove underscore prefix from module instance props.
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

  /** Deferreds container. */
  deferreds = {},

  /** Private event hub and event names. */
  evHub,
  evInitiate = 'a',
  evResolve = 'b',
  evReject = 'c',
  evTick = 'd',

  /** Deferred states. */
  statePending = 'pending',
  stateFulfilled = 'fulfilled',
  stateRejected = 'rejected',

  /** Object types. */
  typeFunction = 'function',
  typeObject = 'object',
  typeArray = 'array',
  typeArguments = 'arguments',
  typeNumber = 'number',
  typeString = 'string',

  /** Generic unique identifier that's shared with events, deferreds and modules. */
  uid = 0,

  /** Cache native toString and slice methods. */
  toString = {}.toString,
  slice = [].slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true,

  /** Environment check. */
  isNode = typeof process === typeObject && typeOf(process, 'process'),

  /** Global object. */
  glob = isNode ? global : window,

  /** Get next tick method. */
  nextTick = getNextTick(),

  /** Cache Class prototypes. */
  eventizerProto = Eventizer.prototype,
  deferredProto = Deferred.prototype;

  /**
   * Eventizer - Constructor
   * ***********************
   */

  /**
   * Eventizer instance constructor.
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
  eventizerProto.on = function (type, callback) {

    var
    listeners = this._listeners;

    if (typeOf(callback, typeFunction)) {

      listeners[type] = listeners[type] || [];
      listeners[type].push({
        id: ++uid,
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
  eventizerProto.one = function (type, callback) {

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
  eventizerProto.off = function (type, target) {

    var
    listeners = this._listeners,
    targetType = typeOf(target),
    targetId = targetType === typeNumber,
    targetFn = targetType === typeFunction,
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
  eventizerProto.emit = function (type, args, ctx) {

    var
    instance = this,
    eventObjects = instance._listeners[type],
    cbArgs;

    if (eventObjects) {

      arrayEach(cloneArray(eventObjects), function (eventObject) {

        if (typeOf(eventObject.fn, typeFunction)) {

          cbArgs = cloneArray(args);
          cbArgs.unshift({
            id: eventObject.id,
            type: eventObject.type,
            fn: eventObject.fn
          });

          eventObject.fn.apply(ctx === undefined ? instance : ctx, cbArgs);

        }

      });

    }

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

    if (typeOf(obj, typeObject)) {

      obj._listeners = eventizer._listeners;
      obj.on = eventizer.on;
      obj.one = eventizer.one;
      obj.off = eventizer.off;
      obj.emit = eventizer.emit;

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
   * Deferred instance constructor.
   *
   * @class
   * @private
   * @param {function} executor
   */
  function Deferred(executor) {

    var
    instance = this;

    /**
     * Instance id.
     *
     * @protected
     * @type {string}
     */
    instance._id = ++uid;

    /**
     * Indicates if the instance is being resolved or rejected. The instance cannot be resolved or rejected anymore after it's locked.
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
     * Indicates if the deferred instance is asynchronous.
     *
     * @protected
     * @type {boolean}
     */
    instance._async = config.asyncDeferreds;

    /** Call executor function if provided. */
    if (typeOf(executor, typeFunction)) {

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
   * Get current state of the instance.
   *
   * @memberof Deferred.prototype
   * @returns {string} 'pending', 'fulfilled' or 'rejected'.
   */
  deferredProto.state = function () {

    return this._state;

  };

  /**
   * Get instance's result value.
   *
   * @memberof Deferred.prototype
   * @returns {*}
   */
  deferredProto.result = function () {

    return this._result;

  };

  /**
   * Get a snapshot of the instances current status.
   *
   * @memberof Deferred.prototype
   * @returns {object}
   */
  deferredProto.inspect = function () {

    var
    instance = this;

    return {
      state: instance._state,
      result: instance._result,
      locked: instance._locked,
      async: instance._async
    };

  };

  /**
   * Set current instance to run synchronously.
   *
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.sync = function () {

    this._async = false;

    return this;

  };

  /**
   * Set current instance to run asynchronously.
   *
   * @memberof Deferred.prototype
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.async = function () {

    this._async = true;

    return this;

  };

  /**
   * Resolve deferred. All provided arguments will be passed directly to 'onFulfilled' and 'onSettled' callback functions.
   *
   * @memberof Deferred.prototype
   * @param {*} [val]
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.resolve = function (val) {

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
  deferredProto.reject = function (reason) {

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
  deferredProto.onFulfilled = function (callback) {

    return bindDeferredCallback(this, callback, stateFulfilled, evResolve);

  };

  /**
   * Execute a callback function asynchronously when the deferred is rejected.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onRejected = function (callback) {

    return bindDeferredCallback(this, callback, stateRejected, evReject);

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved or rejected.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onSettled = function (callback) {

    return this.onFulfilled(callback).onRejected(callback);

  };

  /**
   * Returns a new deferred that is resolved when previous deferred is resolved.
   *
   * @memberof Deferred.prototype
   * @param {function} [onFulfilled]
   * @param {function} [onRejected]
   * @returns {Deferred} Creates a new deferred.
   */
  deferredProto.then = function (onFulfilled, onRejected) {

    return then(this, onFulfilled, onRejected);

  };

  /**
   * The same as .then() with the exception that if the result of the instance is an array the result is spread over the arguments of the callback handlers.
   *
   * @memberof Deferred.prototype
   * @param {function} [onFulfilled]
   * @param {function} [onRejected]
   * @returns {Deferred} Creates a new deferred.
   */
  deferredProto.spread = function (onFulfilled, onRejected) {

    return then(this, onFulfilled, onRejected, 1);

  };

  /**
   * Alias for when() to be used within the deferred chain. The calling instance is automatically added as the first value of the deferreds array.
   *
   * @memberof Deferred.prototype
   * @param {array} deferreds
   * @param {boolean} [resolveImmediately=false]
   * @param {boolean} [rejectImmediately=true]
   * @returns {Deferred} A new deferred.
   */
  deferredProto.and = function (deferreds, resolveImmediately, rejectImmediately) {

    deferreds.unshift(this);

    return when(deferreds, resolveImmediately, rejectImmediately);

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
    else if (typeOf(val, typeFunction) || typeOf(val, typeObject)) {

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
      thenHandled;

      if (typeOf(then, typeFunction)) {

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

    evHub
    .emit(evResolve + instance._id, [val])
    .off(evReject + instance._id);

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

    evHub
    .emit(evReject + instance._id, [reason])
    .off(evResolve + instance._id);

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
  function bindDeferredCallback(instance, callback, refState, refEvent) {

    if (typeOf(callback, typeFunction)) {

      if (instance._state === refState) {

        executeDeferredCallback(instance, callback);

      }

      if (instance._state === statePending) {

        evHub.one(refEvent + instance._id, function () {

          executeDeferredCallback(instance, callback);

        });

      }

    }

    return instance;

  }

  /**
   * Finish up what bindDeferredCallback started.
   *
   * @private
   * @param {Deferred} instance
   * @param {function} callback
   */
  function executeDeferredCallback(instance, callback) {

    execFn(function () {

      callback(instance._result);

    }, instance._async);

  }

  /**
   * Returns a new deferred that is resolved when the current deferred is resolved.
   *
   * @memberof Deferred.prototype
   * @param {Deferred} instance
   * @param {function} [onFulfilled]
   * @param {function} [onRejected]
   * @param {boolean} [spread]
   * @returns {Deferred}
   */
  function then(instance, onFulfilled, onRejected, spread) {

    var
    next = defer(),
    isFulfilled,
    fateCallback;

    instance.onSettled(function (instanceVal) {

      isFulfilled = instance._state === stateFulfilled;
      onFulfilled = isFulfilled && typeOf(onFulfilled, typeFunction) ? onFulfilled : 0;
      onRejected = !isFulfilled && typeOf(onRejected, typeFunction) ? onRejected : 0;
      fateCallback = onFulfilled || onRejected || 0;

      /**
       * If we have a callback that matches the instance's fate (fulfilled -> onFulfilled, rejected -> onRejected)
       * or if the instance was fulfilled, let's do the default try catch procedure.
       */
      if (fateCallback || isFulfilled) {

        try {

          next.resolve(fateCallback ? (spread && typeOf(instanceVal, typeArray) ? fateCallback.apply(this, instanceVal) : fateCallback(instanceVal)) : instanceVal);

        }
        catch (e) {

          next.reject(e);

        }

      }
      /** In other cases, let's sink the error down the then chain until it's caught. */
      else {

        next.reject(instanceVal);

      }

    });

    return next;

  }

  /**
   * Returns a new deferred that resolves when all provided values and are resolved. Non-thenable values are "promisified" and resolved immediately.
   *
   * @private
   * @param {array} deferreds
   * @param {boolean} [resolveImmediately=false]
   * @param {boolean} [rejectImmediately=true]
   * @returns {Deferred} A new deferred.
   */
  function when(deferreds, resolveImmediately, rejectImmediately) {

    resolveImmediately = resolveImmediately === true;
    rejectImmediately = rejectImmediately === undefined || rejectImmediately === true;

    var
    master = defer(),
    results = [],
    snapshots = [],
    counter = deferreds.length,
    firstRejection;

    if (counter) {

      arrayEach(deferreds, function (deferred, i) {

        var d = deferred instanceof Deferred ? deferred : defer().resolve(deferred);

        d.onSettled(function () {

          if (master._state === statePending && !master._locked) {

            --counter;
            firstRejection = firstRejection || (d._state === stateRejected && d);
            results[i] = d._result;
            snapshots[i] = d.inspect();

            if (firstRejection && (rejectImmediately || !counter)) {

              master.reject(rejectImmediately ? firstRejection._result : snapshots);

            }

            if (!firstRejection && (resolveImmediately || !counter)) {

              master.resolve(resolveImmediately ? results[i] : results);

            }

          }

        });

      });

    }
    else {

      master.resolve(results);

    }

    return master;

  }

  /**
   * Module - Constructor
   * ********************
   */

  /**
   * Module instance constructor.
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
    deferred = defer().sync();

    /** Module data. */
    instance.id = id;
    instance.dependencies = dependencies;
    instance.deferred = deferred;

    /** Add module to modules object. */
    modules[id] = instance;

    /** Emit initiation event when module is loaded. */
    deferred
    .onFulfilled(function () {

      evHub.emit(evInitiate + id, [instance]);

    });

    /** Load dependencies and resolve factory value. */
    loadDependencies(dependencies, function (depModules, depHash) {

      deferred.resolve(typeOf(factory, typeFunction) ? factory.apply({id: id, dependencies: depHash}, depModules) : factory);

    });

  }

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
    typeCheck(ids, typeArray + '|' + typeString);
    ids = typeOf(ids, typeArray) ? ids : [ids];

    /** Validate/sanitize dependencies. */
    if (hasDeps) {

      typeCheck(dependencies, typeArray + '|' + typeString);
      deps = typeOf(dependencies, typeArray) ? dependencies : [dependencies];

    }
    else {

      deps = [];

    }

    /** Validate/sanitize factory. */
    factory = hasDeps ? factory : dependencies;
    typeCheck(factory, typeFunction + '|' + typeObject);

    /** Define modules. */
    arrayEach(ids, function (id) {

      /** Validate id type. */
      typeCheck(id, typeString);

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

    typeCheck(callback, typeFunction);
    typeCheck(dependencies, typeArray + '|' + typeString);
    dependencies = typeOf(dependencies, typeArray) ? dependencies : [dependencies];

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

      typeCheck(depId, typeString);

      defers.push(modules[depId] ? modules[depId].deferred : defer(function (resolve) {

        evHub.one(evInitiate + depId, function (ev, module) {

          resolve(module.deferred._result);

        });

      }).sync());

    });

    when(defers)
    [config.asyncModules ? 'async' : 'sync']()
    .onFulfilled(function (depModules) {

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

        arrayEach(depModule.dependencies, function (depId) {

          if (!ret && depId === id) {

            ret = depModule.id;

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

    type = type !== typeObject ? type : toString.call(obj).split(' ')[1].replace(']', '').toLowerCase();

    /** IE 7/8 fix -> arguments check (the try block is needed because in strict mode arguments.callee can not be accessed). */
    if (!isStrict && type === typeObject) {

      type = typeof obj.callee === typeFunction && obj === obj.callee.arguments ? typeArguments : type;

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

      ok = !ok ? typeOf(val, type) : ok;

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
  function cloneArray(array) {

    var
    arrayType = typeOf(array);

    return (
      arrayType === typeArray ? array.slice(0) :
      arrayType === typeArguments ? slice.call(array) :
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

    if (typeOf(callback, typeFunction)) {

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
        evHub.emit(evTick);

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

        evHub.one(evTick, cb);
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

    return typeOf(fn, typeFunction) && fn.toString().indexOf('[native') > -1 && fn;

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
   * @see typeOf
   */
  lib.typeOf = typeOf;

  /**
   * @public
   * @see nextTick
   */
  lib.nextTick = nextTick;

  /**
   * @public
   * @see config
   */
  lib.config = config;

  /**
   * @public
   * @see modules
   */
  lib._modules = modules;

  /**
   * Initiate
   * ********
   */

  /** Initialize private event hub. */
  evHub = eventize();

  /**
   * Publish library using an adapted UMD pattern.
   */
  if (typeof define === typeFunction && define.amd) {

    define([], lib);

  }
  else if (typeof exports === typeObject) {

    module.exports = lib;

  }
  else {

    glob[ns] = lib;

  }

})();
