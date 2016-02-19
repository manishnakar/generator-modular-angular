'use strict';
/* jshint camelcase: false */

var config = require('./config');
var gulp = require('gulp');

/**
 * Dev Task File
 *
 */


var sass = require('gulp-sass').sync;
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var wiredep = require('wiredep').stream;
var inj = require('gulp-inject');

var browserSync = require('browser-sync');
var reload = browserSync.reload;
var proxy = require('proxy-middleware');
var url = require('url');

var watch = require('gulp-watch');
var runSequence = require('run-sequence')
    .use(gulp);

var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var KarmaServer = require('karma').Server;

var gulpNgConfig = require('gulp-ng-config');

var merge = require('merge-stream');
var plumber = require('gulp-plumber');
var sort = require('gulp-natural-sort');

var beautify = require('gulp-jsbeautifier');

// main task
gulp.task('default', function(cb) {
    gulp.start('test');

    runSequence(
        //'ngConfig',
        'lint',
        'beautify',
        'injectAll',
        'buildStyles',
        'browserSync',
        'watch',
        cb
    );
});
gulp.task('serve', ['default']);
gulp.task('server', ['default']);


gulp.task('injectAll', function(callback) {
    runSequence(
        'wiredep',
        'injectScripts',
        'injectStyles',
        'beautify',
        callback
    );
});


gulp.task('watch', function(cb) {
    watch(config.stylesF, function() {
        gulp.start('buildStyles')
            .on('end', cb);
    });
    watch(config.scriptsF, function() {
        gulp.start('injectScripts')
            .on('end', cb);
    });
    watch(config.scripts + '*.json', function() {
        gulp.start('ngConfig')
            .on('end', cb);
    });
    watch(config.scriptsAllF, function() {
        gulp.start('lint')
            .on('end', cb);

    });
    watch(config.allHtmlF, function() {
        gulp.start('html')
            .on('end', cb);
    });

    gulp.watch('bower.json', ['wiredep']);
});


gulp.task('buildStyles', function(cb) {
    runSequence(
        'injectStyles',
        'sass',
        cb
    );
});


gulp.task('injectStyles', function() {
    var sources = gulp.src(config.stylesF, {read: false})
        .pipe(sort());
    var target = gulp.src(config.mainSassFile);
    var outputFolder = gulp.dest(config.styles);

    return target
        .pipe(inj(sources,
            {
                starttag: '// inject:sass',
                endtag: '// endinject',
                ignorePath: [config.base.replace('./', ''), 'styles'],
                relative: true,
                addRootSlash: false,
                transform: function(filepath) {
                    if (filepath) {
                        return '@import  \'' + filepath + '\';';
                    }
                }
            }
        ))
        .pipe(outputFolder);
});


gulp.task('injectScripts', function() {
    var sources = gulp.src(config.scriptsF, {read: true})
        .pipe(sort());
    var target = gulp.src(config.mainFile);
    return target
        .pipe(inj(sources,
            {
                ignorePath: config.base.replace('./', ''),
                addRootSlash: false
            }
        ))
        .pipe(gulp.dest(config.base));
});


gulp.task('sass', function() {
    var sources = gulp.src(config.mainSassFile);
    var outputFolder = gulp.dest(config.styles);

    return sources
        .pipe(plumber({
            handleError: function(err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe(sourcemaps.init())
        .pipe(sass({errLogToConsole: true}))
        .pipe(autoprefixer({
            browsers: ['> 1%']
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(config.tmp))
        .pipe(outputFolder)
        .pipe(browserSync.stream());
});


gulp.task('browserSync', function() {
    var proxyOptions = url.parse('http://localhost:3000/api');
    proxyOptions.route = '/api';

    browserSync({
        server: {
            baseDir: config.base,
            livereload: true,
            middleware: [proxy(proxyOptions)]
        }
    });
});


gulp.task('html', function() {
    return gulp.src(config.allHtmlF)
        .pipe(reload({stream: true}));
});


gulp.task('wiredep', function() {
    var karmaKonf = gulp.src(config.karmaConf, {base: './'})
        .pipe(wiredep({
            devDependencies: true,
            exclude: config.excludedBowerComponents
        }))
        // required as weird workaround for not messing up the files
        .pipe(gulp.dest(config.tmp))
        .pipe(gulp.dest('./'));

    var indexHtml = gulp.src(config.mainFile, {base: './'})
        .pipe(wiredep({
            devDependencies: false,
            exclude: config.excludedBowerComponents
        }))
        // required as weird workaround for not messing up the files
        .pipe(gulp.dest(config.tmp))
        .pipe(gulp.dest('./'));

    return merge(karmaKonf, indexHtml);
});


gulp.task('test', function(done) {
    new KarmaServer({
        configFile: __dirname + '/../karma.conf.js',
        action: 'watch',
        autoWatch: true,
        singleRun: false
    }, done).start();
});


gulp.task('testSingle', function(done) {
    new KarmaServer({
        configFile: __dirname + '/../karma.conf.js',
        action: 'run',
        autoWatch: false,
        singleRun: true
    }, done).start();
});


gulp.task('lint', function() {
    return gulp.src([
            config.scriptsAllF,
            './karma-e2e.conf.js',
            './karma.conf.js',
            './gulpfile.js'
        ], {base: './'})
        //.pipe(beautify({
        //    config: '.jsbeautifyrc'}))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jscs());
});

gulp.task('beautify', function() {
    return gulp.src([
            config.scriptsAllF,
            './karma-e2e.conf.js',
            './karma.conf.js',
            './gulpfile.js'
        ], {base: './'})
        .pipe(jscs({fix: true}))
        .pipe(gulp.dest('./'));
});


//gulp.task('ngConfig', function () {
//    return gulp.src(config.scripts + 'constants.json')
//        .pipe(gulpNgConfig('config', {
//            wrap: '(function () {\n\'use strict\';\n/*jshint ignore:start*/\n return <%= module %> /*jshint ignore:end*/\n})();',
//            environment: 'dev'
//        }))
//        .pipe(gulp.dest(config.scripts))
//});

