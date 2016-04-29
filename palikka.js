/*!
 * @license
 * Palikka v2.0.0-beta
 * https://github.com/niklasramo/palikka
 * Copyright (c) 2015 Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 */

/*
  TODO
  ****
  - Documentation.
  - Migration guide from 0.4 to 0.5
  - Bench against modulejs (perf / ease of use / API / versatility).
  - An auto-throttling define function for defining third part modules.
  - Undefine module..?
  - Should circular dependencies throw at all..? Would it suffice if circ
    dependencies were indicated in the log?
  - As a developer I want to seee quickly...
    -> A list of defined modules and their dependencies.
    -> A list of required undefined modules.
    -> A list of defined pending modules.
*/

(function (glob, factory) {

  // UMD returnExports pattern.
  // https://github.com/umdjs/umd/blob/master/templates/returnExports.js
  if (typeof define === 'function' && define.amd) {
    define([], function () {
      return factory(glob);
    });
  }
  else if (typeof module === 'object' && module.exports) {
    module.exports = factory(glob);
  }
  else {
    glob['Palikka'] = factory(glob);
  }

}(this, function (glob, undefined) {

  'use strict';

  // Default palikka instance which is used by the static Palikka methods.
  var P = new Palikka();

  /**
   * Module
   * ******
   */

  /**
   * Module instance constructor.
   *
   * @class
   * @private
   * @param {Palikka} palikka
   * @param {String} id
   * @param {Array} dependencies
   * @param {Function|Object} factory
   */
  function Module(palikka, id, dependencies, factory) {

    var instance = this;

    // Make sure module id is a string.
    if (!id || typeof id !== 'string') {
      throw Error('Module must have an id (string).');
    }

    // Make sure module is not already defined.
    if (palikka._modules[id]) {
      return;
    }

    // Make sure the module does not have a circular dependency.
    var circularDependency;
    if (dependencies.length && (circularDependency = getFirstCircularDependency(palikka, id, dependencies))) {
      throw Error('Circular dependency between ' + id + ' and ' + circularDependency + '.');
    }

    // Setup instance data.
    instance.id = id;
    instance.dependencies = dependencies;
    instance.ready = false;
    instance.value = undefined;

    // Add module to palikka modules.
    palikka._modules[id] = instance;

    // Load dependency modules and resolve the module.
    if (dependencies.length) {
      loadModules(palikka, dependencies, onDependenciesLoaded);
    }
    else {
      onDependenciesLoaded([], {});
    }

    // Module resolver function.
    function resolve(value) {

      // Update instance ready state and value.
      instance.ready = true;
      instance.value = value;

      // Process palikka callback queue.
      var queues = palikka._queues;
      var queue = queues[id] = (queues[id] || []).slice(0);
      for (var i = 0; i < queue.length; i++) {
        queue[i](instance);
      }

    }

    // A callback function for when dependency modules are loaded.
    function onDependenciesLoaded(dependencies, dependenciesHash) {

      if (typeof factory === 'function') {

        var isDeferred = false;
        var value = factory.apply({
          id: id,
          dependencies: dependenciesHash,
          defer: function (resolver) {
            isDeferred = true;
            resolver(function (value) {
              resolve(value);
            });
          }
        }, dependencies);

        if (!isDeferred) {
          resolve(value);
        }

      }
      else {

        resolve(factory);

      }

    }

  }

  /**
   * Palikka
   * *******
   */

  /**
   * Palikka instance constructor.
   *
   * @class
   * @public
   */
  function Palikka() {

    this._modules = {};
    this._queues = {};

  }

  /**
   * Define a module or multiple modules.
   *
   * @public
   * @memberof Palikka
   * @param {Array|String} ids
   * @param {Array|String} [dependencies]
   * @param {Function|Object} factory
   * @returns {Palikka}
   */
  Palikka.define = function (ids, dependencies, factory) {

    return P.define.apply(P, arguments);

  };

  /**
   * Require modules.
   *
   * @public
   * @memberof Palikka
   * @param {Array|String} modules
   * @param {Function} callback
   * @returns {Palikka}
   */
  Palikka.require = function (modules, callback) {

    return P.require.apply(P, arguments);

  };

  /**
   * Log modules.
   *
   * @public
   * @memberof Palikka
   * @param {Array|String} modules
   * @returns {Palikka}
   */
  Palikka.log = function (modules) {

    return P.log.apply(P, arguments);

  };

  /**
   * Define a module or multiple modules.
   *
   * @public
   * @memberof Palikka.prototype
   * @param {Array|String} ids
   * @param {Array|String} [dependencies]
   * @param {Function|Object} factory
   * @returns {Palikka}
   */
  Palikka.prototype.define = function (ids, dependencies, factory) {

    var hasDeps = arguments.length > 2;
    var ids = [].concat(ids);
    var deps = hasDeps ? [].concat(dependencies) : [];
    var factory = hasDeps ? factory : dependencies;

    if (!ids.length) {
      throw Error('define method must have id(s).');
    }

    for (var i = 0; i < ids.length; i++) {
      new Module(this, ids[i], deps, factory);
    }

    return this;

  };

  /**
   * Require modules.
   *
   * @public
   * @memberof Palikka.prototype
   * @param {Array|String} modules
   * @param {Function} callback
   * @returns {Palikka}
   */
  Palikka.prototype.require = function (modules, callback) {

    modules = [].concat(modules);

    if (!modules.length) {
      throw Error('require method must have id(s).');
    }

    if (typeof callback !== 'function') {
      throw Error('require method must have a callback function.');
    }

    loadModules(this, modules, function (modules, modulesHash) {
      callback.apply(modulesHash, modules);
    });

    return this;

  };

  /**
   * Log modules.
   *
   * @public
   * @memberof Palikka.prototype
   * @param {Array|String} modules
   * @returns {Palikka}
   */
  Palikka.prototype.log = function (modules) {

    var modulesData = this._modules;
    var moduleIds = module ? [].concat(modules) : Object.keys(modulesData);
    for (var i = 0; i < moduleIds.length; i++) {
      var module = modulesData[moduleIds[i]];
      var moduleState = module.ready ? '[✓]' : '[✗]';
      var dependencies = module.dependencies;
      console.log(moduleState + '——> ' + module.id);
      for (var ii = 0; ii < dependencies.length; ii++) {
        var depId = dependencies[ii];
        var depModule = modulesData[depId];
        var depState = !depModule ? ' [?]' : depModule.ready ? ' [✓]' : ' [✗]';
        console.log('   ' + depState + '——> ' + depId);
      }
    }

    return this;

  };

  /**
   * Helpers
   * *******
   */

  /**
   * Load modules.
   *
   * @private
   * @param {Palikka} palikka
   * @param {Array} modules
   * @param {Function} callback
   */
  function loadModules(palikka, modules, callback) {

    var modules = [].concat(modules);
    var modulesLength = modules.length;
    var readyCounter = 0;
    var retModules = [];
    var retModulesHash = {};
    var loadModule = function (i, module) {
      retModules[i] = module.value;
      retModulesHash[module.id] = module.value;
      if (++readyCounter === modulesLength) {
        callback(retModules, retModulesHash);
      }
    };

    for (var i = 0; i < modules.length; i++) {
      (function (i) {

        var id = modules[i];

        if (!id || typeof id !== 'string') {
          throw Error('Module must have an id (string).');
        }

        var module = palikka._modules[id];

        if (module && module.ready) {
          loadModule(i, module);
        }
        else {
          var queues = palikka._queues;
          var queue = queues[id] = queues[id] || [];
          queue[queue.length] = function (module) {
            loadModule(i, module);
          };
        }

      })(i);
    }

  }

  /**
   * Return the first circular dependency's id or null.
   *
   * @private
   * @param {Palikka} palikka
   * @param {String} id
   * @param {Array} dependencies
   * @returns {Null|String}
   */
  function getFirstCircularDependency(palikka, id, dependencies) {

    var ret = null;
    var modules = palikka._modules;

    for (var i = 0; i < dependencies.length; i++) {

      var dependency = modules[dependencies[i]];

      if (dependency) {
        var depDependencies = dependency.dependencies;
        for (var ii = 0; i < depDependencies.length; ii++) {
          if (!ret && depDependencies[ii] === id) {
            ret = dependency.id;
            break;
          }
        }
      }

      if (ret) {
        break;
      }

    }

    return ret;

  }

  return Palikka;

}));
