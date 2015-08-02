var
paths = {
  palikka: './palikka.js',
  palikkaMin: './palikka.min.js',
  readme: './README.md',
  tests: './tests/tests.js',
  memTests: './tests/memtest-tests.js',
  benchmarks: './tests/benchmarks.js',
  promisesaplus: './tests/promises-aplus.js',
  coverage: './coverage',
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
runSequence = require('run-sequence'),
benchmark = require('benchmark'),
memTests = require(paths.memTests),
benchmarks = require(paths.benchmarks),
palikka = require(paths.palikka);

gulp.task('validate', function () {

  return gulp
  .src(paths.palikka)
  .pipe(gulpJscs(paths.jscsRules));

});

gulp.task('test-main', function (cb) {

  return gulp
  .src([paths.palikka, paths.tests])
  .pipe(gulpKarma({
    configFile: paths.karmaConf,
    action: 'run'
  }))
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
    bail: false
  }));

});

gulp.task('clean', function (cb) {

  rimraf(paths.coverage, cb);

});

gulp.task('memtest', function (cb) {

  memTests(cb);

});

gulp.task('benchmarks', function (cb) {

  benchmarks(cb);

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