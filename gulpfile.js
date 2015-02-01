var paths = {
  main: './palikka.js',
  readme: './README.md',
  tests: './tests/tests.js',
  jscsRules: './jscsrc.json',
  karmaConf: './karma.conf.js',
  pkg: './package.json',
  pkgBower: './bower.json'
};

var gulp = require('gulp');
var gulpJscs = require('gulp-jscs');
var gulpKarma = require('gulp-karma');
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
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('test-all', function (cb) {

  return gulp.src([paths.main, paths.tests])
    .pipe(gulpKarma({
      configFile: paths.karmaConf,
      action: 'run'
    }))
    .on('error', function (err) {
      throw err;
    });

});

gulp.task('default', function (cb) {

  runSequence('validate', 'test-phantom', cb);

});