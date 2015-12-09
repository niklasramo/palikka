var
fs = require('fs'),
gulp = require('gulp'),
jscs = require('gulp-jscs'),
karma = require('karma'),
mocha = require('gulp-mocha'),
uglify = require('gulp-uglify'),
rename = require('gulp-rename'),
size = require('gulp-size'),
argv = require('yargs').argv,
rimraf = require('rimraf'),
runSequence = require('run-sequence');

// Load environment variables if .env file exists
if (fs.existsSync('./.env')) {
  require('dotenv').load();
}

gulp.task('validate', function () {

  return gulp
  .src('./palikka.js')
  .pipe(jscs())
  .pipe(jscs.reporter());

});

gulp.task('test-sauce', function (done) {

  var
  sauceBrowsers = require('./karma.sauce-browsers.js'),
  opts = {
    configFile: __dirname + '/karma.sauce-conf.js',
    action: 'run'
  };

  if (process.env.CI) {
    opts.browsers = sauceBrowsers.getSupportedBrowsers();
  }
  else if (argv.browsers) {
    opts.browsers = sauceBrowsers.getBrowsers(argv.browsers);
  }
  else {
    opts.browsers = sauceBrowsers.getBrowsers();
  }

  (new karma.Server(opts, done)).start();

});

gulp.task('test-promises', function () {

  return gulp
  .src('./tests/promises-aplus.js', {read: false})
  .pipe(mocha({
    reporter: 'nyan',
    timeout: 400,
    bail: false
  }));

});

gulp.task('clean', function (cb) {

  rimraf('./coverage', cb);

});

gulp.task('mem', function (cb) {

  require('./tests/benchmark-memory.js')(cb);

});

gulp.task('compress', function() {

  return gulp
  .src('./palikka.js')
  .pipe(size({title: 'development'}))
  .pipe(uglify({
    preserveComments: 'some'
  }))
  .pipe(size({title: 'minified'}))
  .pipe(size({title: 'gzipped', gzip: true}))
  .pipe(rename('palikka.min.js'))
  .pipe(gulp.dest('./'));

});

gulp.task('default', function (cb) {

  if (process.env.CI) {
    runSequence('validate', 'test-promises', 'test-sauce', 'clean', cb);
  }
  else {
    runSequence('validate', 'test-promises', 'test-sauce', cb);
  }

});