var paths = {
  main: './palikka.js',
  readme: './README.md',
  tests: './tests/tests.js',
  coverage: './coverage',
  coverageLcov: './coverage/**/lcov.info',
  jscsRules: './jscsrc.json',
  karmaConf: './karma.conf.js',
  pkg: './package.json',
  pkgBower: './bower.json'
};

var gulp = require('gulp');
var gulpJscs = require('gulp-jscs');
var gulpKarma = require('gulp-karma');
var rimraf = require('rimraf');
var runSequence = require('run-sequence');

gulp.task('validate', function () {

  return gulp.src(paths.main)
    .pipe(gulpJscs(paths.jscsRules));

});

gulp.task('test-phantom', function (cb) {

  return gulp.src([paths.main, paths.tests])
    .pipe(gulpKarma({
      configFile: paths.karmaConf,
      browsers: ['PhantomJS'],
      reporters: ['progress'],
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('test-local', function (cb) {

  return gulp.src([paths.main, paths.tests])
    .pipe(gulpKarma({
      configFile: paths.karmaConf,
      browsers: ['PhantomJS', 'Chrome', 'Firefox', 'IE11', 'IE10', 'IE9', 'IE8', 'IE7'],
      reporters: ['progress'],
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('test-sauce', function (cb) {

  // Not tested yet.
  return gulp.src([paths.main, paths.tests])
    .pipe(gulpKarma({
      configFile: paths.karmaConf,
      browsers: ['SL_Chrome', 'SL_Firefox'],
      reporters: ['progress', 'saucelabs']
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('test-ci', function (cb) {

  return gulp.src([paths.main, paths.tests])
    .pipe(gulpKarma({
      configFile: paths.karmaConf,
      browsers: ['PhantomJS'],
      preprocessors: {'palikka.js': ['coverage']},
      reporters: ['progress', 'coverage', 'coveralls'],
      coverageReporter: {
        type: 'lcovonly',
        dir: paths.coverage
      },
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('clean', function (cb) {

  rimraf(paths.coverage, cb);

});

gulp.task('default', function (cb) {

  runSequence('validate', 'test-ci', 'clean', cb);

});