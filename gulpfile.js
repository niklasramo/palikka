var
paths = {
  palikka: './palikka.js',
  palikkaMin: './palikka.min.js',
  readme: './README.md',
  tests: './tests/tests.js',
  promisesaplus: './tests/promises-aplus.js',
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
gulpUglify = require('gulp-uglify'),
gulpRename = require('gulp-rename'),
gulpSize = require('gulp-size'),
rimraf = require('rimraf'),
runSequence = require('run-sequence');

gulp.task('validate', function () {

  return gulp
  .src(paths.palikka)
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
  .src([paths.palikka, paths.tests])
  .pipe(gulpKarma(karmaOpts))
  .on('error', function (err) {
    throw err;
  });

});

gulp.task('test-promises', function () {

  return gulp
  .src(paths.promisesaplus, {read: false})
  .pipe(gulpMocha({
    reporter: 'nyan',
    timeout: 400,
    bail: true
  }));

});

gulp.task('clean', function (cb) {

  rimraf(paths.coverage, cb);

});

gulp.task('compress', function() {

  return gulp
  .src(paths.palikka)
  .pipe(gulpSize({title: 'development'}))
  .pipe(gulpUglify({
    preserveComments: 'some'
  }))
  .pipe(gulpSize({title: 'minified'}))
  .pipe(gulpSize({title: 'gzipped', gzip: true}))
  .pipe(gulpRename('palikka.min.js'))
  .pipe(gulp.dest('./'));

});

gulp.task('default', function (cb) {

  runSequence('validate', 'test-main', 'test-promises', 'clean', cb);

});