module.exports = function (config) {

  var stn = {};

  stn.basePath = '';

  // https://npmjs.org/browse/keyword/karma-adapter
  stn.frameworks = [
    'qunit'
  ];

  // plugins to use
  stn.plugins = [
    'karma-qunit',
    'karma-phantomjs-launcher',
    'karma-chrome-launcher',
    'karma-firefox-launcher',
    'karma-ie-launcher',
    'karma-story-reporter',
    'karma-coveralls',
    'karma-coverage'
  ];

  // list of files / patterns to load in the browser
  stn.files = [];

  // list of files to exclude
  stn.exclude = [];

  // preprocess matching files before serving them to the browser
  // https://npmjs.org/browse/keyword/karma-preprocessor
  stn.preprocessors = {'palikka.js': ['coverage']};

  // possible values: 'dots', 'progress', 'story'
  // https://npmjs.org/browse/keyword/karma-reporter
  stn.reporters = [
    'story',
    'coverage'
  ];

  stn.coverageReporter = {
    type: 'lcov',
    dir: './coverage'
  };

  // web server port
  stn.port = 8888;

  // enable / disable colors in the output (reporters and logs)
  stn.colors = true;

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  stn.logLevel = config.LOG_INFO;

  stn.autoWatch = false;

  stn.customLaunchers = {
    IE11: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE11'
    },
    IE10: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE10'
    },
    IE9: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE9'
    },
    IE8: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE8'
    },
    IE7: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE7'
    }
  };

  stn.browsers = [
    'PhantomJS',
    'Chrome',
    'Firefox',
    'IE11',
    'IE10',
    'IE9',
    'IE8',
    'IE7'
  ];

  stn.captureTimeout = 60000;

  stn.browserDisconnectTolerance = 2;

  stn.browserDisconnectTimeout = 10000;

  stn.browserNoActivityTimeout = 120000;

  stn.singleRun = true;

  // Overrides for CI
  if (process.env.CI) {

    stn.browsers = ['PhantomJS'];
    stn.reporters.push('coveralls');

  }

  config.set(stn);

};