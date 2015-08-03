/*!
 * @license
 * Palikka v0.4.1
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/**

TODO:
-----

- [x] Performance/memory optimzations.
- [x] Basic memory leak tests.
- [X] nextTick leaks memory (native Promise being the blame here).
- [x] nextTick() should be chainable, make it return the library.
- [x] .Eventizer.on() and .Eventizer.one() should be able to define the context which can be overriden via .Eventizer.emit()
- [x] BUG: Promises/A+ tests pass tests relating to clause 2.3.3.3.4.2 accidentally and there is always the chance that they fail.
- [x] Clean up "dead" code.
- [ ] Restructure module system for optimal performance.
- [ ] Make tests test all nextTick variations.
- [ ] Make tests cover all library initiation variations (AMD/Node/Browser).
- [x] Restructure Eventizer tests.
- [ ] Restructure Module tests.
- [ ] Restructure Deferred tests.
- [ ] Long resolved/rejected then chain leaks memory badly.
      -> The problem is evidently the next deferred which is used within the inner function.

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

  /** Module event hub and event names. */
  moduleEvents,
  evInitiate = 'a',

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
    this._listeners = typeOf(listeners, typeObject) ? listeners : {};

  }

  /**
   * Bind an event listener.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {function} callback
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  eventizerProto.on = function (type, callback, ctx) {

    var
    listeners = this._listeners;

    if (typeOf(callback, typeFunction)) {

      listeners[type] = listeners[type] || [];
      listeners[type].push({
        id: ++uid,
        fn: callback,
        ctx: ctx
      });

    }

    return this;

  };

  /**
   * Bind an event listener that is called only once.
   *
   * @memberof Eventizer
   * @param {string} type
   * @param {function} callback
   * @param {*} [ctx]
   * @returns {Eventizer} The instance on which this method was called.
   */
  eventizerProto.one = function (type, callback, ctx) {

    var
    instance = this;

    instance.on(type, function (e) {

      var
      args = cloneArray(arguments);

      /** Propagate the original callback function to the callback's event object. */
      args[0].fn = callback;

      /** Unbind the event listener after execution. */
      instance.off(e.type, e.id);

      /** Call the original callback. */
      callback.apply(this, args);

    }, ctx);

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
    eventObjects = listeners[type],
    counter = eventObjects && eventObjects.length;

    /** Make sure that at least one event listener exists before unbinding. */
    if (counter) {

      /** If target is defined, let's do a "surgical" unbind. */
      if (target) {

        var
        targetType = typeOf(target),
        targetId = targetType === typeNumber,
        targetFn = targetType === typeFunction,
        eventObject;

        while (counter--) {

          eventObject = eventObjects[counter];

          if ((targetFn && target === eventObject.fn) || (targetId && target === eventObject.id)) {

            eventObjects.splice(counter, 1);

          }

        }

      }
      /** If no target is defined, let's unbind all the event type's listeners. */
      else {

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

      /**
       * Loop through a CLONED set of event listeners. If the listeners are not cloned before looping
       * there is always the risk that the listeners array gets modified while the loop is being executed,
       * which is something we don't want to happen.
       */
      arrayEach(cloneArray(eventObjects), function (eventObject) {

        /** Safety check (probably unnecessary) just to make sure that the callback function really exists. */
        if (typeOf(eventObject.fn, typeFunction)) {

          /** Clone provided arguments, and add the event data object as the first item. */
          cbArgs = cloneArray(args);
          cbArgs.unshift({
            type: type,
            id: eventObject.id,
            fn: eventObject.fn
          });

          /**
           * Event listener callback context definition:
           * 1. If emit method's ctx argument is defined (-> is not undefined) it is used.
           * 2. Then, if event listener's context is defined, it is used.
           * 3. If no context is defined at all the current instance (this) is used as context.
           */
          eventObject.fn.apply(ctx !== undefined ? ctx : eventObject.ctx !== undefined ? eventObject.ctx : instance, cbArgs);

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

      obj.on = eventizer.on;
      obj.one = eventizer.one;
      obj.off = eventizer.off;
      obj.emit = eventizer.emit;
      obj._listeners = eventizer._listeners;

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
     * Indicates if the instance is being resolved or rejected. The instance cannot be resolved or rejected anymore after it's locked.
     *
     * @private
     * @type {boolean}
     */
    instance._locked = false;

    /**
     * The instance's result value is stored here.
     *
     * @private
     * @type {*}
     */
    instance._result = undefined;

    /**
     * Holds information about the state of the deferred. A deferred can have three different states: 'pending', 'fulfilled' or 'rejected'.
     *
     * @private
     * @type {string}
     */
    instance._state = statePending;

    /**
     * Indicates if the deferred instance is asynchronous.
     *
     * @private
     * @type {boolean}
     */
    instance._async = config.asyncDeferreds;

    /**
     * Callback queue.
     *
     * @private
     * @type {array}
     */
    instance._handlers = [];

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
   * Check if the current instance is set to run asynchronously.
   *
   * @memberof Deferred.prototype
   * @returns {boolean}
   */
  deferredProto.isAsync = function () {

    return this._async;

  };

  /**
   * Check if the current instance is locked.
   *
   * @memberof Deferred.prototype
   * @returns {boolean}
   */
  deferredProto.isLocked = function () {

    return this._locked;

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
      finalizeDeferred(instance, reason, stateRejected);

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

    return bindDeferredCallback(this, callback, stateFulfilled);

  };

  /**
   * Execute a callback function asynchronously when the deferred is rejected.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onRejected = function (callback) {

    return bindDeferredCallback(this, callback, stateRejected);

  };

  /**
   * Execute a callback function asynchronously when the deferred is resolved or rejected.
   *
   * @memberof Deferred.prototype
   * @param {function} callback
   * @returns {Deferred} The instance on which this method was called.
   */
  deferredProto.onSettled = function (callback) {

    return bindDeferredCallback(this, callback);

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

      finalizeDeferred(instance, TypeError('A promise can not be resolved with itself.'), stateRejected);

    }
    else if (val instanceof Deferred) {

      val.onSettled(function (value) {

        finalizeDeferred(instance, value, val._state);

      });

    }
    else if (typeOf(val, typeFunction) || typeOf(val, typeObject)) {

      processThenable(instance, val);

    }
    else {

      finalizeDeferred(instance, val, stateFulfilled);

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
                finalizeDeferred(instance, reason, stateRejected);

              }

            }
          );

        }
        catch (e) {

          if (!thenHandled) {

            thenHandled = 1;
            finalizeDeferred(instance, e, stateRejected);

          }

        }

      }
      else {

        finalizeDeferred(instance, val, stateFulfilled);

      }

    }
    catch (e) {

      finalizeDeferred(instance, e, stateRejected);

    }

  }

  /**
   * Finalize deferred instance's resolve/reject process.
   *
   * @private
   * @param {Deferred} instance
   * @param {*} val
   * @param {string} state
   */
  function finalizeDeferred(instance, val, state) {

    instance._result = val;
    instance._state = state;

    var
    handlersLength = instance._handlers.length;

    if (handlersLength) {

      arrayEach(instance._handlers.splice(0, handlersLength), function (handler) {

        if (!handler.type || handler.type === state) {

          executeDeferredCallback(instance, handler.fn);

        }

      });

    }

  }

  /**
   * Handler for onResolved, onRejected and onSettled methods.
   *
   * @private
   * @param {Deferred} instance
   * @param {function} callback
   * @param {string} state
   * @returns {Deferred}
   */
  function bindDeferredCallback(instance, callback, state) {

    if (typeOf(callback, typeFunction)) {

      if (instance._state === statePending) {

        instance._handlers.push({type: state, fn: callback});

      }
      else if (!state || instance._state === state) {

        executeDeferredCallback(instance, callback);

      }

    }

    return instance;

  }

  /**
   * Execute a deferred callback function, sync or async.
   *
   * @private
   * @param {Deferred} instance
   * @param {function} callback
   */
  function executeDeferredCallback(instance, callback) {

    instance._async ? nextTick(function () { callback(instance._result); }) : callback(instance._result);

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

      if (fateCallback || isFulfilled) {

        tryCatch(
          function () {

            next.resolve(fateCallback ? (spread && typeOf(instanceVal, typeArray) ? fateCallback.apply(spread, instanceVal) : fateCallback(instanceVal)) : instanceVal);

          },
          function (e) {

            next.reject(e);

          }
        );

      }
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

    typeCheck(deferreds, typeArray);

    resolveImmediately = resolveImmediately === true;
    rejectImmediately = rejectImmediately === undefined || rejectImmediately === true;

    var
    master = defer(),
    results = [],
    inspects = [],
    counter = deferreds.length,
    firstRejection;

    if (counter) {

      arrayEach(deferreds, function (deferred, i) {

        deferred = deferred instanceof Deferred ? deferred : defer().resolve(deferred);

        deferred.onSettled(function () {

          if (master.state() === statePending && !master.isLocked()) {

            --counter;
            firstRejection = firstRejection || (deferred.state() === stateRejected && deferred);
            results[i] = deferred.result();
            inspects[i] = deferred.inspect();

            if (firstRejection && (rejectImmediately || !counter)) {

              master.reject(rejectImmediately ? firstRejection.result() : inspects);

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

    /** Load dependencies and resolve factory value. */
    loadDependencies(dependencies, function (depModules, depHash) {

      deferred
      .resolve(typeOf(factory, typeFunction) ? factory.apply({id: id, dependencies: depHash}, depModules) : factory)
      .onFulfilled(function () {

        moduleEvents.emit(evInitiate + id, [instance]);

      });

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
      if (modules[id]) {

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

        moduleEvents.one(evInitiate + depId, function (ev, module) {

          resolve(module.deferred.result());

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
   * List modules. Returns an object containing information about all the modules in their current state.
   *
   * @private
   * @returns {object}
   */
  function listModules() {

    var
    ret = {},
    m,
    id;

    for (id in modules) {

      m = modules[id];

      ret[id] = {
        id: id,
        dependencies: cloneArray(m.dependencies),
        ready: m.deferred.state() === stateFulfilled ? true : false,
        value: m.deferred.result()
      };

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
   * @private
   * @returns {function}
   */
  function getNextTick() {

    var
    resolvedPromise = isNative(glob.Promise) && glob.Promise.resolve(),
    nodeTick = isNode && (process.nextTick || glob.setImmediate),
    MobServer = isNative(glob.MutationObserver) || isNative(glob.WebKitMutationObserver),
    MobServerTarget,
    queue = [],
    queueActive = 0,
    fireTick,
    nextTickFn = function (cb) {

      if (typeOf(cb, typeFunction)) {

        queue.push(cb);

        if (!queueActive) {

          queueActive = 1;
          fireTick();

        }

      }

      return lib;

    },
    processQueue = function () {

      queueActive = 0;
      arrayEach(queue.splice(0, queue.length), function (cb) {

        cb();

      });

    };

    if (resolvedPromise) {

      fireTick = function () {

        resolvedPromise.then(processQueue);

      };

    }
    else if (nodeTick) {

      fireTick = function () {

        nodeTick(processQueue);

      };

    }
    else if (MobServer) {

      MobServerTarget = document.createElement('i');
      (new MobServer(processQueue)).observe(MobServerTarget, {attributes: true});

      fireTick = function () {

        MobServerTarget.id = '';

      };

    }
    else {

      fireTick = function () {

        glob.setTimeout(processQueue, 0);

      };

    }

    return nextTickFn;

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
   * A generic helper to optimize the use of try-catch.
   *
   * @param {function} done
   * @param {function} fail
   */
  function tryCatch(done, fail) {

    try {

      done();

    }
    catch (e) {

      fail(e);

    }

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
   * @see listModules
   */
  lib.list = listModules;

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
   * Initiate
   * ********
   */

  /** Initialize module event hub. */
  moduleEvents = eventize();

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
