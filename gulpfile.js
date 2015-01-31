// Define paths.
var paths = {
  main: './palikka.js',
  readme: './README.md',
  tests: './tests/tests.js',
  jscsRules: './jscsrc.json',
  karmaConf: './karma.conf.js',
  pkg: './package.json',
  pkgBower: './bower.json'
};

// Get package.json data.
var getPkg = function () {
  return require(paths.pkg);
};

// Require gulp + plugins.
var gulp = require('gulp');
var gulpUtil = require('gulp-util');
var gulpReplace = require('gulp-replace');
var gulpUglify = require('gulp-uglify');
var gulpFilesize = require('gulp-filesize');
var gulpBump = require('gulp-bump');
var gulpJsonEditor = require('gulp-json-editor');
var gulpJscs = require('gulp-jscs');
var gulpKarma = require('gulp-karma');
var gulpClone = require('gulp-clone');
var gulpRename = require('gulp-rename');

// Require other npm packages.
var minimist = require('minimist');
var runSequence = require('run-sequence');
var mergeStream = require('merge-stream');

// Define known arguments and their types/defaults.
var args = minimist(process.argv.slice(2), {
  string: ['v'],
  default: {v: 'prerelease'}
});

gulp.task('minify', function() {

  var cloneSink = gulpClone.sink();
  return gulp.src(paths.main)
  .pipe(cloneSink)
  .pipe(gulpUglify())
  .pipe(gulpRename(function (path) {
    path.extname = ".min.js";
  }))
  .pipe(cloneSink.tap())
  .pipe(gulp.dest('./'));

});

gulp.task('validate', function () {

  return gulp.src(paths.main)
  .pipe(gulpJscs(paths.jscsRules));

});

gulp.task('test', function (cb) {

  return gulp.src([paths.main, paths.tests])
  .pipe(gulpKarma({
    configFile: paths.karmaConf,
    action: 'run'
  }))
  .on('error', function (err) {
    throw err;
  });

});

gulp.task('sync', function () {

  var pkg = getPkg();
  var now = new Date();
  var generateBanner = function () {
    return [
      '/*!',
      ' * ' + pkg.name + ' v' + pkg.version,
      ' * ' + pkg.homepage + '',
      ' * Copyright (c) ' + now.getFullYear() + ' ' + pkg.author.name + ' <' + pkg.author.email + '>',
      ' * Released under the ' + pkg.license + ' license',
      ' * Date: ' + now.toISOString(),
      ' */'
    ].join('\n');
  };

  return mergeStream.apply(null, [
    gulp.src(paths.main)
      .pipe(gulpReplace(/(?:\/\*\!(?:[\s\S]*?)\*\/)/gm, generateBanner()))
      .pipe(gulp.dest('./')),
    gulp.src(paths.readme)
      .pipe(gulpReplace(/##API(.*?)($)/m, '##API ' + pkg.version))
      .pipe(gulp.dest('./')),
    gulp.src(paths.pkgBower)
      .pipe(gulpJsonEditor({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        keywords: pkg.keywords,
        homepage: pkg.homepage,
        license: pkg.license,
        repository: pkg.repository,
        authors: [pkg.author]
      }, {
        indent_size: 2
      }))
      .pipe(gulp.dest('./'))
  ]);

});

gulp.task('_bump', function () {

  var bumpArgs = {};
  bumpArgs.indent = 2;
  if (['major', 'minor', 'patch', 'prerelease'].indexOf(args.v) > -1) {
    bumpArgs.type = args.v;
  } else {
    bumpArgs.version = args.v;
  }

  return gulp.src(paths.pkg)
  .pipe(gulpBump(bumpArgs))
  .pipe(gulp.dest('./'));

});

gulp.task('bump', function (cb) {

  runSequence('_bump', 'sync', cb);

});

gulp.task('deploy', function (cb) {

  // TODO: Tag.
  // TODO: Push to repo.
  // TODO: Push to bower if this the version is not prerelease.
  runSequence(cb);

});

// TODO: Make the initial command return all commands and flags.
gulp.task('default', function (cb) {

  console.log('');
  console.log('gulp validate');
  console.log('  * Lint mezr.js file.');
  console.log('');
  console.log('gulp test');
  console.log('  * Run unit tests.');
  console.log('');
  console.log('gulp sync');
  console.log('  * Sync all files with package.json data.');
  console.log('  * Generate API docs from JSDoc comments.');
  console.log('');
  console.log('gulp bump');
  console.log('  --v major/minor/patch/prerelease/version');
  console.log('  * Bump version number or set it to specified version.');
  console.log('  * Default version: prerelease.');
  console.log('');
  console.log('gulp minify');
  console.log('  * Create a minified version of the library.');
  console.log('');
  console.log('gulp deploy');
  console.log('  --branch branchName');
  console.log('  --v major/minor/patch/prerelease/version');
  console.log('  * prep, tag, push to repo and finally push to bower.');
  console.log('');
  cb();

});