var
paths = {
  main: './palikka.js',
  readme: './README.md',
  tests: './tests/tests.js',
  promiseTests: './tests/promises.js',
  coverage: './coverage',
  coverageLcov: './coverage/**/lcov.info',
  jscsRules: './jscsrc.json',
  karmaConf: './karma.conf.js',
  pkg: './package.json',
  pkgBower: './bower.json'
},
gulp = require('gulp'),
gulpJscs = require('gulp-jscs'),
gulpKarma = require('gulp-karma'),
gulpMocha = require('gulp-mocha'),
rimraf = require('rimraf'),
runSequence = require('run-sequence');

gulp.task('validate', function () {

  return gulp
  .src(paths.main)
  .pipe(gulpJscs(paths.jscsRules));

});

gulp.task('test-main', function (cb) {

  var
  karmaOpts = {
    configFile: paths.karmaConf,
    browsers: ['PhantomJS', 'Chrome', 'Firefox', 'IE11', 'IE10', 'IE9', 'IE8', 'IE7'],
    preprocessors: {'palikka.js': ['coverage']},
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      type: 'lcov',
      dir: paths.coverage
    },
    action: 'run'
  };

  // Special for CI
  if (process.env.CI) {
    karmaOpts.browsers = ['PhantomJS'];
    karmaOpts.reporters.push('coveralls');
  }

  return gulp
  .src([paths.main, paths.tests])
  .pipe(gulpKarma(karmaOpts))
  .on('error', function (err) {
    throw err;
  });

});

gulp.task('test-promises', function () {

  return gulp
  .src(paths.promiseTests, {read: false})
  .pipe(gulpMocha({
    reporter: 'nyan',
    timeout: 400,
    bail: true
  }));

});

gulp.task('clean', function (cb) {

  rimraf(paths.coverage, cb);

});

gulp.task('default', function (cb) {

  if (process.env.CI) {
    runSequence('validate', 'test-main', 'test-promises', 'clean', cb);
  }
  else {
    runSequence('validate', 'test-main', 'test-promises', cb);
  }

});