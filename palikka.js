/*!
 * @license
 * Palikka v0.5.0
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
Done updates:
 - Added Promise.prototype.next()
 - Added Promise.prototype.fail()
 - Added Promise.prototype.bind()
 - Added Promise.prototype.call()
 - Added Promise.prototype.apply()
 - Added Promise.prototype.reveal()
 - Added Promise.prototype.delay()
 - Added Promise.prototype.timeout()
 - Added Promise.prototype.race()
 - Added Promise.prototype.all()
 - Added Promise.prototype.any()
 - Added Promise.prototype.settle()
 - Removed Promise.prototype.async()
 - Removed Promise.prototype.sync()
 - Removed Promise.prototype.spread()
 - Added Promise.race()
 - Added Promise.all()
 - Added Promise.any()
 - Added Promise.settle()
 - Added Promise.resolve()
 - Added Promise.reject()
 - Removed Promise.prototype.and()
 - Removed when()
 - Internal module resolve event simplified.
 - Internal documentation updates.
 - Removed value type checks.
 - Promise() exectutor function now suppresses throws.
 - Replaced list() with log().
 - Deprecated config.asyncModules
 - Renamed config.asyncDeferreds -> config.async
 - Added custom error type: TimeoutError
 - Renamed Deferred to Promise internally
 - Renamed palikka.Deferred -> palikka.Promise
 - Iterables supported.
*/

/*
Todos:

  - Error handling overview
    -> Custom error types.
       -> TimeoutError
       -> OperationalError
    -> Distinguish which errors are thrown and which are explicit rejects.
    -> Allow catching only specific error types with a custom filter argument that accepts a
       predicate or an error type.

  - Performance testing.

  - Docs.

*/

(function (undefined) {

  'use strict';

  var

  /**
   * @alias Palikka
   * @global
   */
  palikka = {},

  /** Library namespace. */
  ns = 'palikka',

  /** Generic unique identifier. */
  uid = 0,

  /**
   * @constant {String}
   * @default
   */
  statePending = 'pending',

  /**
   * @constant {String}
   * @default
   */
  stateFulfilled = 'fulfilled',

  /**
   * @constant {String}
   * @default
   */
  stateRejected = 'rejected',

  /**
   * @alias Configuration
   * @public
   */
  config = {

    /**
     * @public
     * @type {Boolean}
     */
    async: true

  },

  /** Modules stuff: container object, event hub and event names. */
  modules = {},
  moduleEvents,
  evInitiate = 'a',

  /** Cache string representations of object types. */
  typeFunction = 'function',
  typeObject = 'object',
  typeArray = 'array',
  typeArguments = 'arguments',
  typeNumber = 'number',
  typeString = 'string',

  /** Cache native toString and slice methods. */
  toString = {}.toString,
  slice = [].slice,

  /** Check if strict mode is supported. */
  isStrict = !this === true,

  /** Check if we are in Node.js environment. */
  isNode = typeof process === typeObject && typeOf(process, 'process'),

  /** Determine global object. */
  glob = isNode ? global : window,

  /** Check Symbol.iterator support */
  iterator = typeOf(glob.Symbol, 'symbol') ? Symbol.iterator : false,

  /**
   * Loop iterables with for...of loop in supported environments and fall back to traditional for
   * loop.
   *
   * @private
   * @alias iterableEach
   * @param {Iterable} iterable
   * @param {Function} callback
   */
  iterableEach = getIterableEach(),

  /**
   * Execute a function in the next turn of event loop.
   *
   * @public
   * @alias nextTick
   * @param {Function} function
   */
  nextTick = getNextTick(),

  /** Cache class prototypes. */
  eventizerProto = Eventizer.prototype,
  promiseProto = Promise.prototype;

  /**
   * Custom Errors
   * *************
   */

  function ErrorPrototypeInheritor() {}
  ErrorPrototypeInheritor.prototype = Error.prototype;

  function TimeoutError() {

    var
    temp = Error.apply(this, arguments);

    temp.name = this.name = 'TimeoutError';
    this.stack = temp.stack;
    this.message = temp.message;

  }

  TimeoutError.prototype = new ErrorPrototypeInheritor();

  /**
   * Eventizer - Constructor
   * ***********************
   */

  /**
   * Eventizer instance constructor.
   *
   * @class
   * @public
   * @param {Object} [listeners] - An object where the instance's event listeners will be stored.
   */
  function Eventizer(listeners) {

    /**
     * The object where all the instance's event listeners are stored in.
     *
     * @protected
     * @type {Object}
     */
    this._listeners = typeOf(listeners, typeObject) ? listeners : {};

  }

  /**
   * @callback Eventizer~listenerCallback
   * @param {Eventizer~listenerData} ev
   * @param {...*} arg
   */

  /**
   * @typedef {Object} Eventizer~listenerData
   * @property {Number} id - The event listener's id.
   * @property {Function} fn - The event listener's callback function.
   * @property {String} type - The event listener's type.
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Eventizer.prototype
   * @param {String} type - Event's name.
   * @param {Eventizer~callback} callback - Callback function that will be called when the event is
   *        emitted.
   * @param {*} [ctx] - Callback function's context.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
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
   * @public
   * @memberof Eventizer.prototype
   * @param {String} type - Event's name.
   * @param {Eventizer~callback} callback - Callback function that will be called when the event is
   *        emitted.
   * @param {*} [ctx] - Callback function's context.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
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
   * Unbind event listeners. If no target is provided all listeners for the specified event will be
   * removed.
   *
   * @public
   * @memberof Eventizer.prototype
   * @param {String} type - Event's name.
   * @param {Function|Number} [target] - Filter the event listener's to be removed by callback
   *        function or id.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
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
   * Emit event.
   *
   * @public
   * @memberof Eventizer.prototype
   * @param {String} type - Event's name.
   * @param {Array} [args] - Arguments that will be applied to the event listener callbacks.
   * @param {*} [ctx] - Custom context that will be applied to the event listener callbacks.
   *        Overrides custom context defined by .on() and .one() methods.
   * @returns {Eventizer|Object} The instance or object on which this method was called.
   */
  eventizerProto.emit = function (type, args, ctx) {

    var
    instance = this,
    eventObjects = instance._listeners[type],
    cbArgs;

    if (eventObjects) {

      /**
       * Loop through a cloned set of event listeners. If the listeners are not cloned before
       * looping there is always the risk that the listeners array gets modified while the loop is
       * being executed, which is something we don't want to happen.
       */
      iterableEach(cloneArray(eventObjects), function (eventObject) {

        /**
         * Safety check (probably unnecessary) just to make sure that the callback function really
         * exists.
         */
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
   * Creates a new Eventizer instance that will be returned directly if no object is provided as the
   * first argument. If an object is provided as the first argument the created Eventizer instance's
   * properties and methods will be propagated to the provided object and the provided object will
   * be returned instead.
   *
   * @public
   * @constructs Eventizer
   * @param {Object} [obj]
   * @param {Object} [listeners]
   * @returns {Object|Eventizer}
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
   * Promise - Constructor
   * *********************
   */

  /**
   * Promise constructor.
   *
   * @public
   * @class
   * @param {Function} executor
   */
  function Promise(executor) {

    var
    instance = this;

    /**
     * Indicates if the instance can be resolved or rejected currently. The instance cannot be
     * resolved or rejected after it's once locked.
     *
     * @protected
     * @type {Boolean}
     */
    instance._locked = false;

    /**
     * The instance's result value.
     *
     * @protected
     * @type {*}
     */
    instance._result = undefined;

    /**
     * The instance's current state: 'pending', 'fulfilled' or 'rejected'.
     *
     * @protected
     * @type {String}
     */
    instance._state = statePending;

    /**
     * Indicates if the instance is currently in asynchronous mode.
     *
     * @protected
     * @type {Boolean}
     */
    instance._async = config.async;

    /**
     * The instance's context which will be used as the context of all handler functions of this
     * instance.
     *
     * @protected
     * @type {Boolean}
     */
    instance._ctx = undefined;

    /**
     * Callback queue.
     *
     * @protected
     * @type {Promise~handler[]}
     */
    instance._handlers = [];

    /** Call executor function if provided. */
    if (typeOf(executor, typeFunction)) {

      try {

        executor(
          function (val) {

            instance.resolve(val);

          },
          function (reason) {

            instance.reject(reason);

          }
        );

      }
      catch (e) {

        instance.reject(e);

      }

    }

  }

  /**
   * Returns a promise that is resolved with the given value. If the value is a thenable the
   * returned promise will "follow" that thenable, adopting its eventual state. Otherwise the
   * returned promise will be fulfilled with the value.
   *
   * @public
   * @memberof Promise
   * @param {*} [val]
   * @returns {Promise}
   */
  Promise.resolve = function (val) {

    return defer().resolve(val);

  };

  /**
   * Returns a promise that is rejected with the given reason.
   *
   * @public
   * @memberof Promise
   * @param {*} [reason]
   * @returns {Promise}
   */
  Promise.reject = function (reason) {

    return defer().reject(reason);

  };

  /**
   * @public
   * @memberof Promise
   * @see race
   */
  Promise.race = race;

  /**
   * @public
   * @memberof Promise
   * @see all
   */
  Promise.all = all;

  /**
   * @public
   * @memberof Promise
   * @see any
   */
  Promise.any = any;

  /**
   * @public
   * @memberof Promise
   * @see settle
   */
  Promise.settle = settle;

  /**
   * @callback Promise~handlerCallback
   * @param {*|...*} result - Promise's result.
   */

  /**
   * @typedef {Object} Promise~handler
   * @property {Promise~handlerCallback} fn - The handler's callback function.
   * @property {String|Undefined} type - The handler's type: fulfilled', 'rejected' or undefined.
   */

  /**
   * @typedef {Object} Promise~inspection
   * @property {String} state - Inspected instance's state: 'pending', 'fulfilled' or 'rejected'.
   * @property {*} result - Inspected instance's result.
   * @property {Boolean} locked - Is inspected instance locked?
   * @property {Boolean} async - Is inspected instance in asynchronous mode?
   */

  /**
   * Get the current state of the instance.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {String} 'pending', 'fulfilled' or 'rejected'.
   */
  promiseProto.state = function () {

    return this._state;

  };

  /**
   * Get the instance's result.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {*}
   */
  promiseProto.result = function () {

    return this._result;

  };

  /**
   * Check if the instance is set to work asynchronously.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Boolean}
   */
  promiseProto.isAsync = function () {

    return this._async;

  };

  /**
   * Check if the current instance is locked.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Boolean}
   */
  promiseProto.isLocked = function () {

    return this._locked;

  };

  /**
   * Get a snapshot of the instances current status.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise~inspection}
   */
  promiseProto.inspect = function () {

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
   * Resolve instance.
   *
   * @public
   * @memberof Promise.prototype
   * @param {*} [value]
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.resolve = function (value) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      processResolve(instance, value);

    }

    return instance;

  };

  /**
   * Reject instance.
   *
   * @public
   * @memberof Promise.prototype
   * @param {*} [reason]
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.reject = function (reason) {

    var
    instance = this;

    if (instance._state === statePending && !instance._locked) {

      instance._locked = true;
      finalizePromise(instance, reason, stateRejected);

    }

    return instance;

  };

  /**
   * Execute a callback function when the instance is fulfilled.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} callback
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.onFulfilled = function (callback) {

    return bindPromiseCallback(this, callback, stateFulfilled);

  };

  /**
   * Execute a callback function when the instance is rejected.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} callback
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.onRejected = function (callback) {

    return bindPromiseCallback(this, callback, stateRejected);

  };

  /**
   * Execute a callback function when the instance is either fulfilled or rejected.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} callback
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.onSettled = function (callback) {

    return bindPromiseCallback(this, callback);

  };

  /**
   * Throws the result (reason) of the instance if it is rejected.
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise} The instance on which this method was called.
   */
  promiseProto.reveal = function () {

    return this.onRejected(function (e) {

      throw e;

    });

  };

  /**
   * Returns a new promise which is settled when this instance is settled.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} [onFulfilled]
   * @param {Promise~handlerCallback} [onRejected]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.then = function (onFulfilled, onRejected) {

    return then(this, onFulfilled, onRejected);

  };

  /**
   * Same as promise.then(cb), but allows providing additional arguments for the callback function.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} onFulfilled
   * @param {Array} [args]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.next = function (onFulfilled, args) {

    return then(this, function (val) {

      args = args || [];
      args.unshift(val);

      return onFulfilled.apply(this, args);

    });

  };

  /**
   * Same as promise.then(null, cb), but allows providing additional arguments for the callback
   * function.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Promise~handlerCallback} onRejected
   * @param {Array} [args]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.fail = function (onRejected, args) {

    return then(this, null, function (reason) {

      args = args || [];
      args.unshift(reason);

      return onRejected.apply(this, args);

    });

  };

  /**
   * Returns a new promise which has the provided context bound to it. The context is inherited
   * by all other instances which are chained to the returned instance. The context is defined by
   * providing a function which's return value will be used as the returned instance's context
   * value. The function is called after this instance is resolved and it receives the result of
   * this instance as it's first argument. The context value is always transformed into a promise
   * in order to account for the possibility that the context value itself is thenable. The
   * context instance is waited to be resolved and on fulfillment it's final value will be used as
   * the returned instance's context value. In case the context instance is rejected the returned
   * instance will be rejected with the same reason as the context instance.
   *
   * @todo Rethink... should we allow binding when current Promise is rejected?
   * @todo Simple to-the-point description.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Function} [ctx]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.bind = function (ctx) {

    var
    instance = this,
    next = then(this, function (val) {

      return defer()
      .resolve(typeOf(ctx, typeFunction) ? ctx.call(instance._ctx, val) : undefined)
      .then(function (ctxVal) {

        next._ctx = ctxVal;

        return val;

      });

    });

    return next;

  };

  /**
   * Call a specific method of the instance's result. Returns a new promise which's value is
   * the result of the method call.
   *
   * @public
   * @memberof Promise.prototype
   * @param {String} methodName
   * @param {...*} [args]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.call = function (methodName, args) {

    args = cloneArray(arguments);

    return then(this, function (val) {

      return val[args.shift()].apply(val, args);

    });

  };

  /**
   * Apply a specific method of the instance's value. Returns a new promise which's value is
   * the result of the method call.
   *
   * @public
   * @memberof Promise.prototype
   * @param {String} methodName
   * @param {Array} [args]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.apply = function (methodName, args) {

    return then(this, function (val) {

      return val[methodName].apply(val, args || []);

    });

  };

  /**
   * Returns a new promise that is resolved with this instance's value after provided time
   * (ms).
   *
   * @public
   * @memberof Promise.prototype
   * @param {Number} time
   * @returns {Promise} New Promise instance.
   */
  promiseProto.delay = function (time) {

    return then(this, function (val) {

      return defer(function (res) {

        glob.setTimeout(function () {

          res(val);

        }, time);

      });

    });

  };

  /**
   * Returns a new promise that will be automatically rejected with the provided reason in
   * provided time (ms) unless this instance is resolved before the time runs out. The timer starts
   * ticking instantly.
   *
   * @public
   * @memberof Promise.prototype
   * @param {Number} time
   * @param {*} [reason=TimeoutError('Operation timed out.')]
   * @returns {Promise} New Promise instance.
   */
  promiseProto.timeout = function (time, reason) {

    var
    next = then(this, function (val) {

      return val;

    });

    glob.setTimeout(function () {

      if (next._state === statePending) {

        next.reject(!reason || typeOf(reason, typeString) ? new TimeoutError('Operation timed out.') : reason);

      }

    }, time);

    return next;

  };

  /**
   * Returns a new promise and calls Promise.race() on this returned instance's value (assuming it
   * is an iterable).
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise} New Promise instance.
   */
  promiseProto.race = function () {

    return then(this, race);

  };

  /**
   * Returns a new promise and calls Promise.any() on this returned instance's value (assuming it
   * is an iterable).
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise} New Promise instance.
   */
  promiseProto.any = function () {

    return then(this, any);

  };

  /**
   * Returns a new promise and calls Promise.all() on this returned instance's value (assuming it
   * is an iterable).
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise} New Promise instance.
   */
  promiseProto.all = function () {

    return then(this, all);

  };

  /**
   * Returns a new promise and calls Promise.settle() on this returned instance's value (assuming
   * it is an iterable).
   *
   * @public
   * @memberof Promise.prototype
   * @returns {Promise} New Promise instance.
   */
  promiseProto.settle = function () {

    return then(this, settle);

  };

  /**
   * Promise - Helpers
   * *****************
   */

  /**
   * Returns a new promise. Sugar method for new Promise().
   *
   * @public
   * @constructs Promise
   * @param {Function} [executor]
   * @returns {Promise}
   */
  function defer(executor) {

    return new Promise(executor);

  }

  /**
   * Promise resolver.
   *
   * @private
   * @param {Promise} instance
   * @param {*} value
   */
  function processResolve(instance, value) {

    if (value === instance) {

      finalizePromise(instance, TypeError('A promise can not be resolved with itself.'), stateRejected);

    }
    else if (value instanceof Promise) {

      value.onSettled(function (result) {

        finalizePromise(instance, result, value._state);

      });

    }
    else if (typeOf(value, typeFunction) || typeOf(value, typeObject)) {

      processThenable(instance, value);

    }
    else {

      finalizePromise(instance, value, stateFulfilled);

    }

  }

  /**
   * Process thenable.
   *
   * @private
   * @param {Promise} instance
   * @param {Function|Object} thenable
   */
  function processThenable(instance, thenable) {

    try {

      var
      then = thenable.then,
      thenHandled;

      if (typeOf(then, typeFunction)) {

        try {

          then.call(
            thenable,
            function (value) {

              if (!thenHandled) {

                thenHandled = 1;
                processResolve(instance, value);

              }

            },
            function (reason) {

              if (!thenHandled) {

                thenHandled = 1;
                finalizePromise(instance, reason, stateRejected);

              }

            }
          );

        }
        catch (e) {

          if (!thenHandled) {

            thenHandled = 1;
            finalizePromise(instance, e, stateRejected);

          }

        }

      }
      else {

        finalizePromise(instance, thenable, stateFulfilled);

      }

    }
    catch (e) {

      finalizePromise(instance, e, stateRejected);

    }

  }

  /**
   * Finalize promise's resolve process.
   *
   * @private
   * @param {Promise} instance
   * @param {*} result
   * @param {String} state
   */
  function finalizePromise(instance, result, state) {

    instance._result = result;
    instance._state = state;

    var
    handlersLength = instance._handlers.length;

    if (handlersLength) {

      iterableEach(instance._handlers.splice(0, handlersLength), function (handler) {

        if (!handler.type || handler.type === state) {

          executePromiseCallback(instance, handler.fn);

        }

      });

    }

  }

  /**
   * Handler for promise.onResolved(), promise.onRejected() and promise.onSettled() methods.
   *
   * @private
   * @param {Promise} instance
   * @param {Promise~handlerCallback} callback
   * @param {String} state
   * @returns {Promise}
   */
  function bindPromiseCallback(instance, callback, state) {

    if (typeOf(callback, typeFunction)) {

      if (instance._state === statePending) {

        instance._handlers.push({type: state, fn: callback});

      }
      else if (!state || instance._state === state) {

        executePromiseCallback(instance, callback);

      }

    }

    return instance;

  }

  /**
   * Execute a promise's callback.
   *
   * @private
   * @param {Promise} instance
   * @param {Promise~handlerCallback} callback
   */
  function executePromiseCallback(instance, callback) {

    instance._async ? nextTick(function () { callback(instance._result); }) : callback(instance._result);

  }

  /**
   * Returns a new promise which is settled when the provided instance is settled.
   *
   * @private
   * @param {Promise} instance
   * @param {Promise~handlerCallback} [onFulfilled]
   * @param {Promise~handlerCallback} [onRejected]
   * @returns {Promise} New Promise instance.
   */
  function then(instance, onFulfilled, onRejected) {

    var
    next = defer(),
    isFulfilled,
    fateCallback;

    instance.onSettled(function (instanceResult) {

      isFulfilled = instance._state === stateFulfilled;
      onFulfilled = isFulfilled && typeOf(onFulfilled, typeFunction) ? onFulfilled : 0;
      onRejected = !isFulfilled && typeOf(onRejected, typeFunction) ? onRejected : 0;
      fateCallback = onFulfilled || onRejected || 0;

      if (fateCallback || isFulfilled) {

        tryCatch(
          function () {

            next.resolve(fateCallback ? fateCallback.call(instance._ctx, instanceResult) : instanceResult);

          },
          function (e) {

            next.reject(e);

          }
        );

      }
      else {

        next.reject(instanceResult);

      }

    });

    return next;

  }

  /**
   * Returns a new promise that is settled when all the values in the provided iterable are
   * settled. All values in the iterable which are not instances of Promise are transformed into a
   * promise and resolved immediately with the value in question.
   *
   * @public
   * @param {Iterable} iterable
   * @param {Boolean} [resolveImmediately=false]
   * @param {Boolean} [rejectImmediately=false]
   * @returns {Promise} New Promise instance.
   */
  function when(iterable, resolveImmediately, rejectImmediately) {

    var
    master = defer(),
    results = [],
    counter = iterableSize(iterable),
    firstRejection;

    if (counter) {

      iterableEach(iterable, function (val, i) {

        var
        promise = val instanceof Promise ? val : defer().resolve(val);

        promise.onSettled(function () {

          if (master._state === statePending && !master._locked) {

            --counter;
            firstRejection = firstRejection || (promise._state === stateRejected && promise);
            results[i] = !resolveImmediately && !rejectImmediately ? promise.inspect() : promise._result;

            if (firstRejection && (rejectImmediately || !counter)) {

              master.reject(rejectImmediately ? firstRejection._result : results);

            }
            else if (!firstRejection && (resolveImmediately || !counter)) {

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
   * Returns a new promise that is resolved when any of the values in the provided iterable
   * is resolved. The returned instance will be rejected if all the instances in the iterable are
   * rejected. All values in the iterable which are not instances of Promise will be automatically
   * transformed into a promise.
   *
   * @public
   * @param {Iterable} iterable
   * @returns {Promise} New Promise instance.
   */
  function any(iterable) {

    return when(iterable, 1, 0);

  }

  /**
   * Returns a new promise that is resolved as soon as one of the values in the provided
   * iterable is resolved. The returned instance inherits the state and value of the first resolved
   * instance in the iterable. All values in the iterable which are not instances of Promise will be
   * automatically transformed into a promise.
   *
   * @public
   * @param {Iterable} iterable
   * @returns {Promise} New Promise instance.
   */
  function race(iterable) {

    return when(iterable, 1, 1);

  }

  /**
   * Returns a new promise that is resolved when all the values in the provided iterable are
   * resolved. If any of the values is rejected the returned promise is immediately rejected
   * with the same reason as the rejected value. All values in the iterable which are not instances
   * of Promise will be automatically transformed into a promise.
   *
   * @public
   * @param {Iterable} iterable
   * @returns {Promise} New Promise instance.
   */
  function all(iterable) {

    return when(iterable, 0, 1);

  }

  /**
   * Returns a new promise that is resolved when all the values in the provided iterable are
   * resolved. The result of the returned promise is always an array which contains inspection
   * objects of the provided values in the same order they were provided. The returned promise will
   * never be rejected, it is always fulfilled, even if every provided value is rejected. All values
   * in the iterable which are not instances of Promise will be automatically transformed into a
   * promise.
   *
   * @public
   * @param {Iterable} iterable
   * @returns {Promise} New Promise instance.
   */
  function settle(iterable) {

    return when(iterable, 0, 0);

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
   * @param {String} id
   * @param {Array} dependencies
   * @param {Function|Object} factory
   */
  function Module(id, dependencies, factory) {

    var
    instance = this,
    promise = defer();

    /** Module data. */
    instance.id = id;
    instance.dependencies = dependencies;
    instance.promise = promise;

    /** Add module to modules object. */
    modules[id] = instance;

    /** Load dependencies and resolve factory value. */
    loadDependencies(dependencies, function (depModules, depHash) {

      promise
      .resolve(typeOf(factory, typeFunction) ? factory.apply({id: id, dependencies: depHash}, depModules) : factory)
      .onFulfilled(function (val) {

        moduleEvents.emit(evInitiate + id, val);

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
   * @public
   * @param {Array|String} ids
   * @param {Array|String} [dependencies]
   * @param {Function|Object} factory
   * @returns {Palikka}
   */
  function defineModule(ids, dependencies, factory) {

    var
    hasDeps = arguments.length > 2,
    deps = !hasDeps ? [] : typeOf(dependencies, typeArray) ? dependencies : [dependencies],
    circularDeps;

    /** Validate/sanitize ids. */
    ids = typeOf(ids, typeArray) ? ids : [ids];

    /** Validate/sanitize factory. */
    factory = hasDeps ? factory : dependencies;

    /** Define modules. */
    iterableEach(ids, function (id) {

      /** Validate/sanitize id. */
      id = typeOf(id, typeString) ? id : null;

      /** Make sure id is not empty. */
      if (!id) {

        throw Error('Module must have an id.');

      }

      /** Allow defining the module if id is not reserved. */
      if (!modules[id]) {

        /** Detect circular dependencies. */
        if (deps.length && (circularDeps = getCircDependency(id, deps))) {

          throw Error('Circular dependency between ' + id + ' and ' + circularDeps + '.');

        }

        /** Define module. */
        new Module(id, deps, factory);

      }

    });

    return palikka;

  }

  /**
   * Require a module.
   *
   * @public
   * @param {Array|String} dependencies
   * @param {Function} callback
   * @returns {Palikka}
   */
  function requireModule(dependencies, callback) {

    loadDependencies(typeOf(dependencies, typeArray) ? dependencies : [dependencies], function (depModules, depHash) {

      callback.apply({dependencies: depHash}, depModules);

    });

    return palikka;

  }

  /**
   * Load module dependencies asynchronously.
   *
   * @private
   * @param {Array} dependencies
   * @param {Function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    defers = [],
    hash = {};

    dependencies = typeOf(dependencies, typeArray) ? dependencies : null;

    iterableEach(dependencies, function (depId) {

      defers.push(modules[depId] ? modules[depId].promise : defer(function (resolve) {

        moduleEvents.one(evInitiate + depId, function (ev, val) {

          resolve(val);

        });

      }));

    });

    all(defers)
    .onFulfilled(function (depModules) {

      iterableEach(dependencies, function (depId, i) {

        hash[depId] = depModules[i];

      });

      callback(depModules, hash);

    });

  }

  /**
   * Return the first circular dependency's id or null.
   *
   * @private
   * @param {String} id
   * @param {Array} dependencies
   * @returns {Null|String}
   */
  function getCircDependency(id, dependencies) {

    var
    ret = null;

    dependencies = typeOf(dependencies, typeArray) ? dependencies : null;

    iterableEach(dependencies, function (depId) {

      var
      depModule = modules[depId];

      if (depModule) {

        iterableEach(depModule.dependencies, function (depId) {

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
   * Log info of all modules or a single module.
   *
   * @public
   * @param {string} moduleId
   * @returns {Object}
   */
  function logModules(moduleId) {

    if (moduleId) {

      return logModule(moduleId);

    }
    else {

      var
      ret = {},
      id;

      for (id in modules) {

        ret[id] = logModule(id);

      }

      return ret;

    }

  }

  /**
   * Log a single module's current info.
   *
   * @public
   * @param {string} id
   * @returns {Object}
   */
  function logModule(id) {

    var
    mod = modules[id];

    return !mod ? undefined : {
      id: mod.id,
      dependencies: cloneArray(mod.dependencies),
      ready: mod.promise._state === stateFulfilled ? true : false,
      value: mod.promise._result
    };

  }

  /**
   * Generic helpers
   * ***************
   */

  /**
   * Returns type of any object in lowercase letters. If "isType" is provided the function will
   * compare the type directly and returns a boolean.
   *
   * @public
   * @param {Object} value
   * @param {String} [isType]
   * @returns {String|Boolean}
   */
  function typeOf(value, isType) {

    var
    type = (
      value === null ? 'null' : /** IE 7/8 -> Null check. */
      value === undefined ? 'undefined' : /** IE 7/8 -> Undefined check. */
      typeof value
    );

    type = type !== typeObject ? type : toString.call(value).split(' ')[1].replace(']', '').toLowerCase();

    /** IE 7/8 -> Arguments check. */
    if (!isStrict && type === typeObject) {

      type = typeof value.callee === typeFunction && value === value.callee.arguments ? typeArguments : type;

    }

    return isType ? type === isType : type;

  }

  /**
   * Clone array or arguments object.
   *
   * @private
   * @param {Array} array
   * @returns {Array}
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
   * Get the size of an iterable.
   *
   * @private
   * @param {Iterable} iterable
   * @returns {Number}
   */
  function iterableSize(iterable) {

    var
    type = typeOf(iterable);

    if (type === typeArray || type === typeString || type.indexOf(typeArray) > -1) {

      return iterable.length;

    }
    else if (type === 'map' || type === 'set') {

      return iterable.size;

    }
    else {

      var
      size = 0,
      val;

      for (val of iterable) {

        ++size;

      }

      return size;

    }

  }


  /**
   * Generate an each function that loops iterables in environments that supports them and falls
   * back to good old for loop in case iterables are not supported.
   *
   * @private
   * @param {Iterable} iterable
   * @param {Function} callback
   * @returns {Array}
   */
  function getIterableEach() {

    if (iterator) {

      return function (iterable, callback) {

        var
        i = 0,
        val;

        for (val of iterator) {

          if (callback(val, i++)) {

            break;

          }

        }

      };

    }
    else {

      return function (iterable, callback) {

        for (var i = 0, len = iterable.length; i < len; i++) {

          if (callback(iterable[i], i)) {

            break;

          }

        }

      };

    }

  }

  /**
   * Create cross-browser next tick implementation. Returns a function that accepts a function as a
   * parameter.
   *
   * @private
   * @returns {Function}
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

      return palikka;

    },
    processQueue = function () {

      queueActive = 0;
      iterableEach(queue.splice(0, queue.length), function (cb) {

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
   * Check if a function is native code. Returns the passed function if it is native code and
   * otherwise returns false.
   *
   * @private
   * @param {Function} fn
   * @returns {Function|false}
   */
  function isNative(fn) {

    return typeOf(fn, typeFunction) && fn.toString().indexOf('[native') > -1 && fn;

  }

  /**
   * Check if a value is iterable. Arrays and strings are always considered iterables in all
   * environments and if value's type is not either of those the existence of provied value's
   * iterator is checked.
   *
   * @private
   * @param {*} val
   * @returns {Boolean}
   */
  function isIterable(val) {

    return typeOf(val, typeArray) || typeOf(val, typeString) || (iterator && typeOf(val[iterator], typeFunction));

  }

  /**
   * A generic helper to optimize the use of try-catch.
   *
   * @private
   * @param {Function} done
   * @param {Function} fail
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
   * @memberof Palikka
   * @see Eventizer
   */
  palikka.Eventizer = Eventizer;

  /**
   * @public
   * @memberof Palikka
   * @see eventize
   */
  palikka.eventize = eventize;

  /**
   * @public
   * @memberof Palikka
   * @see Promise
   */
  palikka.Promise = Promise;

  /**
   * @public
   * @memberof Palikka
   * @see defer
   */
  palikka.defer = defer;

  /**
   * @public
   * @memberof Palikka
   * @see defineModule
   */
  palikka.define = defineModule;

  /**
   * @public
   * @memberof Palikka
   * @see requireModule
   */
  palikka.require = requireModule;

  /**
   * @public
   * @memberof Palikka
   * @see logModules
   */
  palikka.log = logModules;

  /**
   * @public
   * @memberof Palikka
   * @see typeOf
   */
  palikka.typeOf = typeOf;

  /**
   * @public
   * @memberof Palikka
   * @see nextTick
   */
  palikka.nextTick = nextTick;

  /**
   * @public
   * @memberof Palikka
   * @see Configuration
   */
  palikka.config = config;

  /**
   * @public
   * @memberof Palikka
   * @see TimeoutError
   */
  palikka.TimeoutError = TimeoutError;

  /**
   * Initiate
   * ********
   */

  /** Create module event hub. */
  moduleEvents = eventize();

  /**
   * Initiate library using returnExports UMD pattern.
   * https://github.com/umdjs/umd/blob/master/returnExports.js
   */
  if (typeof define === typeFunction && define.amd) {

    define([], palikka);

  }
  else if (typeof module === typeObject && module.exports) {

    module.exports = palikka;

  }
  else {

    glob[ns] = palikka;

  }

})();
