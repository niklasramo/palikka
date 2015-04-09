/*!
 * Palikka v0.3.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
  IDEAS/TODOS:
  ------------
  - Add a minified version to the project repo and improve the build system in general (more automation).
  - Better test coverage (improved tests for return values).
  - Easier importing of third party libs.
*/

(function (glob) {
  'use strict';

  var
  ns = 'palikka',
  lib = {},

  /** Modules */
  modules = {},
  modulePrimaryKey = 0,
  evInitiate = 'initiate',
  evRegister = 'register',

  /** Deferred */
  evResolve = 'resolve',
  evReject = 'reject',
  statePending = 'pending',
  stateResolved = 'resolved',
  stateRejected = 'rejected';

  /** Eventize library. */
  Eventizer.call(lib);

  /**
   * Module storage object.
   *
   * @public
   * @static
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
   * Define a single module or multiple modules. Returns an array that contains id's of all modules that were succesfully registered.
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
      id = defineSingle(id, dependencies, factory);
      if (id) {
        ret.push(id);
      }
    });

    return ret;

  };

  /**
   * Undefine a module. If any other define or require instance depends on the module it cannot be undefined. Returns an array tha contains id's of all modules that were undefined successfully, otherwise returns false.
   *
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
   * Clone array or function's arguments object.
   *
   * @private
   * @param {array} array
   * @returns {array}
   */
  function cloneArray(array) {

    return array instanceof Array ? array.slice(0) : Array.prototype.slice.call(array);

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
   * Define a module. Returns module's id if module registration was successful, otherwise returns false.
   *
   * @public
   * @param {string} id
   * @param {array|string} [dependencies]
   * @param {function|object} factory
   * @returns {boolean|string}
   */
  function defineSingle(id, dependencies, factory) {

    var
    hasDeps = factory,
    depIds = hasDeps ? sanitizeDependencies(dependencies) : [],
    factory = hasDeps ? factory : dependencies,
    factoryType = typeOf(factory),
    isValidId = id && typeOf(id, 'string'),
    isValidFactory = factoryType === 'object' || factoryType === 'function',
    primaryKey = isValidId && isValidFactory && registerModule(id, depIds),
    init,
    async,
    factoryCtx,
    moduleData;

    /** Return false if module registration failed. */
    if (!primaryKey) {
      return false;
    }

    loadDependencies(depIds, function (depModules) {

      init = function (data) {
        initModule(id, primaryKey, arguments.length ? data : moduleData);
      };

      if (factoryType === 'function') {

        factoryCtx = {
          id: id,
          dependencies: {},
          async: function () {
            async = 1;
            return init;
          }
        };

        arrayEach(depIds, function (depId, i) {
          factoryCtx.dependencies[depId] = depModules[i];
        });

        moduleData = factory.apply(factoryCtx, depModules);

        if (!async) {
          init(moduleData);
        }

      }
      else {

        init(factory);

      }

    });

    /** Return module id to indicate a succesful module registration. */
    return id;

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
   * Register a module. Returns the modules primary key (a positive integer) if succesful, otherwise returns zero.
   *
   * @private
   * @param {string} id
   * @returns {number}
   */
  function registerModule(id, dependencies) {

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
      lib.emit(evRegister + '-' + id, [modules[id]]);
      lib.emit(evRegister, [modules[id]]);
      return pk;
    } else {
      return 0;
    }

  }

  /**
   * Initialize a module.
   *
   * @private
   * @param {string} id
   * @param {number} primaryKey
   * @param {*} data
   */
  function initModule(id, primaryKey, data) {

    if (modules[id] && modules[id].pk === primaryKey && !modules[id].loaded) {
      modules[id].data = data;
      modules[id].loaded = true;
      lib.emit(evInitiate + '-' + id, [modules[id]]);
      lib.emit(evInitiate, [modules[id]]);
    }

  }

  /**
   * Load dependencies by their ids and return a deferred object that will be resolved when the all dependencies are loaded.
   * TODO: Use deferreds here to reduce codebase size.
   *
   * @private
   * @param {array} dependencies
   * @param {function} callback
   */
  function loadDependencies(dependencies, callback) {

    var
    depModules = [],
    depsLength = dependencies.length,
    depsReadyCounter = 0,
    depsReadyCallback = function () {

      arrayEach(dependencies, function (depId) {
        depModules.push(modules[depId].data);
      });

      callback(depModules);

    };

    if (depsLength) {

      arrayEach(dependencies, function (depId, i) {

        var
        evName = evInitiate + '-' + depId,
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

      });

    }
    else {

      depsReadyCallback();

    }

  }

  /**
   * A tiny event system that binds basic on/off/emit functionality to an object.
   *
   * @typedef {object} Eventizer
   * @property {object} _listeners
   * @property {function} on
   * @property {function} off
   * @property {function} emit
   */

  /**
   * Creates a new Eventizer instance that allows you to bind, unbind and emit events.
   *
   * @class
   * @param {object} [listeners]
   */
  function Eventizer(listeners) {

    /**
     * An object where all the instance's callbacks (listeners) are stored in.
     *
     * @public
     * @static
     * @type {object}
     */
    this._listeners = listeners || {};

    /**
     * Bind an event listener.
     *
     * @public
     * @param {string} type
     * @param {function} callback
     * @returns {Eventizer} The instance on which this method was called.
     */
    this.on = function (type, callback) {

      var listeners = this._listeners;
      listeners[type] = listeners[type] || [];
      listeners[type].push(callback);

      return this;

    };

    /**
     * Unbind an event listener. If a callback function is not provided all listeners for the type will be removed, otherwise only the provided function instances will be removed.
     *
     * @public
     * @param {string} type
     * @param {function} [callback]
     * @returns {Eventizer} The instance on which this method was called.
     */
    this.off = function (type, callback) {

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
     * Emit event.
     *
     * @public
     * @param {string} type
     * @param {array} [args]
     * @param {*} [ctx]
     * @returns {Eventizer} The instance on which this method was called.
     */
    this.emit = function (type, args, ctx) {

      var
      that = this,
      typeCallbacks = that._listeners[type],
      argsType;

      if (typeCallbacks) {
        arrayEach(typeCallbacks.slice(0), function (callback) {
          if (typeOf(callback, 'function')) {
            argsType = typeOf(args);
            args = argsType === 'array' ? args : argsType === 'arguments' ? cloneArray(args) : [];
            args.unshift({type: type, fn: callback});
            ctx = typeOf(ctx, 'undefined') ? that : ctx;
            callback.apply(ctx, args);
          }
        });
      }

      return that;

    };

  }

  /**
   * Create a deferred object.
   *
   * @class
   * @param {function} callback
   */
  function Deferred(callback) {

    var

    /**
     * A private event hub for the Deferred instance.
     *
     * @private
     * @static
     * @type {Eventizer}
     */
    _ev = new Eventizer(),

    /**
     * When the Deferred instance is resolved or rejected the provided arguments are stored here.
     *
     * @private
     * @static
     * @type {array}
     */
    _args = [];

    /**
     * Holds information about the state of the Deferred instance. A Deferred can have three different states: 'pending', 'resolved' or 'rejected'.
     *
     * @public
     * @static
     * @type {string}
     */
    this.state = statePending;

    /**
     * When Deferreds are chained with 'then' method this property will point to the previous Deferred in the chain.
     *
     * @public
     * @static
     * @type {Deferred|undefined}
     */
    this.prev = undefined;

    /**
     * Resolve Deferred. All provided arguments will be passed directly to 'done' and 'always' callback functions.
     *
     * @public
     * @returns {Deferred} The instance on which this method was called.
     */
    this.resolve = function () {

      if (this.state === statePending) {
        _args = arguments;
        this.state = stateResolved;
        _ev.emit(evResolve, _args);
      }

      return this;

    };

    /**
     * Reject deferred. All provided arguments will be passed directly to 'fail' and 'always' callback functions.
     *
     * @public
     * @returns {Deferred} The instance on which this method was called.
     */
    this.reject = function () {

      if (this.state === statePending) {
        _args = arguments;
        this.state = stateRejected;
        _ev.emit(evReject, _args);
      }

      return this;

    };

    /**
     * Execute a callback function when the Deferred instance is resolved.
     *
     * @public
     * @param {function} callback
     * @returns {Deferred} The instance on which this method was called.
     */
    this.whenResolved = function (callback) {

      var that = this;

      if (typeOf(callback, 'function')) {

        if (that.state === stateResolved) {
          callback.apply(that, _args);
        }

        if (that.state === statePending) {
          _ev.on(evResolve, function (e) {
            callback.apply(that, _args);
            _ev.off(evResolve, e.fn);
          });
        }

      }

      return that;

    };

    /**
     * Execute a callback function when the Deferred instance is rejected.
     *
     * @public
     * @param {function} callback
     * @returns {Deferred} The instance on which this method was called.
     */
    this.whenRejected = function (callback) {

      var that = this;

      if (typeOf(callback, 'function')) {

        if (that.state === stateRejected) {
          callback.apply(that, _args);
        }

        if (that.state === statePending) {
          _ev.on(evReject, function (e) {
            callback.apply(that, _args);
            _ev.off(evReject, e.fn);
          });
        }

      }

      return that;

    };

    /**
     * Execute a callback function when the Deferred instance is resolved or rejected.
     *
     * @public
     * @param {function} callback
     * @returns {Deferred} The instance on which this method was called.
     */
    this.whenSettled = function (callback) {

      return this.whenResolved(callback).whenRejected(callback);

    };

    /**
     * Chain Deferreds.
     *
     * @public
     * @param {function} [whenResolved]
     * @param {function} [whenRejected]
     * @returns {Deferred} Creates a new Deferred instance.
     */
    this.then = function (whenResolved, whenRejected) {

      var
      that = this,
      next = new Deferred(),
      ret;

      that.whenResolved(function () {

        try {

          if (typeOf(whenResolved, 'function')) {

            ret = whenResolved.apply(that, arguments);

            if (ret instanceof Deferred) {

              ret
              .whenResolved(function () {
                next.resolve.apply(next, arguments);
              })
              .whenRejected(function () {
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

      that.whenRejected(function () {

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
     * @todo resolveOnFirst & rejectOnFirst
     * @todo emit an event whenever a subdeferred is resolved/rejected
     * @todo this should be chainable with then call somehow...
     *
     * @public
     * @param {Deferred|array} [deferreds]
     * @param {boolean} [resolveOnFirst=false]
     * @param {boolean} [rejectOnFirst=true]
     * @returns {Deferred} A new Deferred instance.
     */
    this.join = function (deferreds, resolveOnFirst, rejectOnFirst) {

      deferreds = typeOf(deferreds, 'array') ? deferreds : [deferreds];
      deferreds.unshift(this);

      var
      master = new Deferred(),
      masterArgs = [],
      counter = deferreds.length,
      inc = 0,
      resolvedHandler = function () {
        --counter;
        masterArgs[inc] = this instanceof Deferred ? arguments : undefined;
        if (!counter) {
          master.resolve.apply(master, masterArgs);
        }
      },
      rejectedHandler = function () {
        master.reject.apply(master, arguments);
      };

      if (counter) {
        arrayEach(deferreds, function (deferred, i) {
          inc = i;
          if (deferred instanceof Deferred) {
            deferred
            .whenResolved(resolvedHandler)
            .whenRejected(rejectedHandler);
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

    if (typeOf(callback, 'function')) {
      callback.call(this, this.resolve, this.reject);
    }

  }

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
