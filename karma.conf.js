module.exports = function (config) {

  var stn = {};

  stn.basePath = '';

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
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
    'karma-story-reporter'
  ];

  // list of files / patterns to load in the browser
  stn.files = [];

  // list of files to exclude
  stn.exclude = [];

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  stn.preprocessors = {};

  // test results reporter to use
  // possible values: 'dots', 'progress', 'story'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  stn.reporters = [
    'progress'
  ];

  // web server port
  stn.port = 9876;

  // enable / disable colors in the output (reporters and logs)
  stn.colors = true;

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  stn.logLevel = config.LOG_INFO;

  // enable / disable watching file and executing tests whenever any file changes
  stn.autoWatch = false;

  // define custom launchers for browser config
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

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  stn.browsers = ['PhantomJS', 'Chrome', 'Firefox', 'IE11', 'IE10', 'IE9', 'IE8', 'IE7'];

  // If browser does not capture in given timeout [ms], kill it
  stn.captureTimeout = 60000;

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  stn.singleRun = true;

  config.set(stn);

};