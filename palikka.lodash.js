(function (root, factory) {

  // TODO: Find out what's the correct method for extending a library in Node and AMD

  if (typeof define === 'function' && define.amd) {

    define(['palikka', 'lodash'], factory);

  }
  else if (typeof module === 'object' && module.exports) {

    module.exports = factory(require('palikka'), require('lodash'));

  }
  else {

    factory(root.palikka, root._);

  }

}(this, function (palikka, _) {

  'use strict';

  var
  methodsList = [
    'chunk',
    'compact',
    'difference',
    'drop',
    'dropRight',
    'dropRightWhile',
    'dropWhile',
    'fill',
    'findIndex',
    'findLastIndex',
    'first',
    'flatten',
    'flattenDeep',
    'indexOf',
    'initial',
    'intersection',
    'last',
    'lastIndexOf',
    'pull',
    'pullAt',
    'remove',
    'rest',
    'slice',
    'sortedIndex',
    'sortedLastIndex',
    'take',
    'takeRight',
    'takeRightWhile',
    'takeWhile',
    'union',
    'uniq',
    'unzip',
    'unzipWith',
    'without',
    'xor',
    'zip',
    'zipObject',
    'zipWith',
    'ary',
    'bind',
    'bindAll',
    'bindKey',
    'curry',
    'curryRight',
    'debounce',
    'defer',
    'delay',
    'flow',
    'flowRight',
    'memoize',
    'modArgs',
    'negate',
    'once',
    'partial',
    'partialRight',
    'rearg',
    'restParam',
    'spread',
    'throttle',
    'wrap',
    'assign',
    'create',
    'defaults',
    'defaultsDeep',
    'findKey',
    'findLastKey',
    'forIn',
    'forInRight',
    'forOwn',
    'forOwnRight',
    'functions',
    'get',
    'has',
    'invert',
    'keys',
    'keysIn',
    'mapKeys',
    'mapValues',
    'merge',
    'omit',
    'pairs',
    'pick',
    'result',
    'set',
    'transform',
    'values',
    'valuesIn',
    'at',
    'countBy',
    'every',
    'filter',
    'find',
    'findLast',
    'findWhere',
    'forEach',
    'forEachRight',
    'groupBy',
    'includes',
    'indexBy',
    'invoke',
    'map',
    'partition',
    'pluck',
    'reduce',
    'reduceRight',
    'reject',
    'sample',
    'shuffle',
    'size',
    'some',
    'sortBy',
    'sortByAll',
    'sortByOrder',
    'where',
    'camelCase',
    'capitalize',
    'deburr',
    'endsWith',
    'escape',
    'escapeRegExp',
    'kebabCase',
    'pad',
    'padLeft',
    'padRight',
    'parseInt',
    'repeat',
    'snakeCase',
    'startCase',
    'startsWith',
    'template',
    'trim',
    'trimLeft',
    'trimRight',
    'trunc',
    'unescape',
    'words',
    'clone',
    'cloneDeep',
    'gt',
    'gte',
    'isArguments',
    'isArray',
    'isBoolean',
    'isDate',
    'isElement',
    'isEmpty',
    'isEqual',
    'isError',
    'isFinite',
    'isFunction',
    'isMatch',
    'isNaN',
    'isNative',
    'isNull',
    'isNumber',
    'isObject',
    'isPlainObject',
    'isRegExp',
    'isString',
    'isTypedArray',
    'isUndefined',
    'lt',
    'lte',
    'toArray',
    'toPlainObject',
    'add',
    'ceil',
    'floor',
    'max',
    'min',
    'round',
    'sum',
    'inRange',
    'attempt',
    'constant',
    'matches',
    'matchesProperty',
    'method',
    'methodOf',
    'property',
    'propertyOf',
    'times'
  ],
  methodsRef = {},
  slice = [].slice;

  for (var i = 0, len = methodsList.length; i < len; i++) {

    methodsRef[methodsList[i]] = methodsList[i];

  }

  palikka.Deferred.prototype._ = function () {

    var
    args = slice.call(arguments);

    return this.then(function (val) {

      return _[methodsRef[args.splice(0, 1, val)[0]]].apply(_, args);

    });

  };

  return palikka;

}));