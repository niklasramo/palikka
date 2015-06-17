var palikka = require('../palikka');

describe('Promises/A+ Tests', function () {

    require('promises-aplus-tests').mocha({

      resolved: function (value) {

        return palikka.defer().resolve(value);

      },

      rejected: function (value) {

        return palikka.defer().reject(value);

      },

      deferred: function () {

        var promise = palikka.defer();

        return {

          promise: promise,

          resolve: function (value) {

            return promise.resolve(value);

          },

          reject: function (value) {

            return promise.reject(value);

          }

        };

      }

    });

});