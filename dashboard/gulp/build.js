/*******************************************************************************
 * Copyright (c) 2015-2017 Codenvy, S.A.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Codenvy, S.A. - initial API and implementation
 *******************************************************************************/

'use strict';

var path = require('../target/dependency/node_modules/path');
var gulp = require('../target/dependency/node_modules/gulp');
var conf = require('./conf');

var replace = require('../target/dependency/node_modules/gulp-replace');
var inject = require('../target/dependency/node_modules/gulp-inject');
var minifyHtml = require('../target/dependency/node_modules/gulp-minify-html');
var angularTemplatecache = require('../target/dependency/node_modules/gulp-angular-templatecache');
var filter = require('../target/dependency/node_modules/gulp-filter');
var flatten = require('../target/dependency/node_modules/gulp-flatten');
var rename = require('../target/dependency/node_modules/gulp-rename');



var size = require('../target/dependency/node_modules/gulp-size');
var rev = require('../target/dependency/node_modules/gulp-rev');
var uglify = require('../target/dependency/node_modules/gulp-uglify');
var uglifySaveLicense = require('../target/dependency/node_modules/uglify-save-license');
var minifyCss = require('../target/dependency/node_modules/gulp-minify-css');
var sourcemaps = require('../target/dependency/node_modules/gulp-sourcemaps');
var useref = require('../target/dependency/node_modules/gulp-useref');
var revReplace = require('../target/dependency/node_modules/gulp-rev-replace');




var del = require('../target/dependency/node_modules/del');


var minimist = require('../target/dependency/node_modules/minimist');

var serverOptions = {
  string: 'server',
  default: {server: 'http://localhost:8080'}
};

var options = minimist(process.argv.slice(2), serverOptions);

gulp.task('partials', function () {
  return gulp.src([
      path.join(conf.paths.src, '/{app,components}/**/*.html'),
      path.join(conf.paths.tmp, '/serve/{app,components}/**/*.html')
    ])
    .pipe(minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe(angularTemplatecache('templateCacheHtml.js', {
      module: 'userDashboard'
    }))
    .pipe(gulp.dest(conf.paths.tmp + '/partials/'));
});

gulp.task('html', ['inject', 'partials'], function () {
  var partialsInjectFile = gulp.src(path.join(conf.paths.tmp, '/partials/templateCacheHtml.js'), { read: false });
  var partialsInjectOptions = {
    starttag: '<!-- inject:partials -->',
    ignorePath: path.join(conf.paths.tmp, '/partials'),
    addRootSlash: false
  };
  var htmlFilter = filter('*.html', { restore: true });
  var jsFilter = filter('**/*.js', { restore: true });
  var cssFilter = filter('**/*.css', { restore: true });
  var assets;

  return gulp.src(path.join(conf.paths.tmp, '/serve/*.html'))
    .pipe(inject(partialsInjectFile, partialsInjectOptions))
    .pipe(assets = useref.assets())
    .pipe(rev())
    .pipe(jsFilter)
    .pipe(sourcemaps.init())
    .pipe(uglify({ preserveComments: uglifySaveLicense })).on('error', conf.errorHandler('Uglify'))
    .pipe(sourcemaps.write('maps'))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    .pipe(sourcemaps.init())
    .pipe(replace('../target/dependency/bower_components/material-design-iconfont/iconfont/', '../fonts/'))
    .pipe(minifyCss({ processImport: false }))
    .pipe(sourcemaps.write('maps'))
    .pipe(cssFilter.restore)
    .pipe(assets.restore())
    .pipe(useref())
    .pipe(revReplace())
    .pipe(htmlFilter)
    .pipe(minifyHtml({
      empty: true,
      spare: true,
      quotes: true,
      conditionals: true
    }))
    .pipe(htmlFilter.restore)
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')))
    .pipe(size({ title: path.join(conf.paths.dist, '/'), showFiles: true }));
});

gulp.task('images', function () {
  return gulp.src(conf.paths.src + '/assets/images/**/*')
    .pipe(gulp.dest(conf.paths.dist + '/assets/images/'));
});


gulp.task('htmlassets', function () {
  return gulp.src(conf.paths.src + '/assets/html/**/*')
    .pipe(gulp.dest(conf.paths.dist + '/assets/html/'));
});

gulp.task('brandingassets', function () {
  return gulp.src(conf.paths.src + '/assets/branding/**/*')
    .pipe(gulp.dest(conf.paths.dist + '/assets/branding/'));
});

gulp.task('zeroclipboardassets', function () {
  return gulp.src('target/dependency/bower_components/zeroclipboard/dist/**/*')
    .pipe(filter('**/*.swf'))
    .pipe(flatten())
    .pipe(gulp.dest(conf.paths.dist + '/assets/zeroclipboard/'));
});

gulp.task('existingfonts', function () {
  return gulp.src(conf.paths.src + '/assets/fonts/*')
    .pipe(filter('**/*.{eot,svg,ttf,otf,woff,woff2}'))
    .pipe(flatten())
    .pipe(gulp.dest(conf.paths.dist + '/fonts/'));
});

gulp.task('fonts', ['colors', 'outputcolors', 'proxySettings', 'existingfonts'], function () {
  return gulp.src('target/dependency/bower_components/material-design-iconfont/iconfont/*')
    .pipe(filter('**/*.{eot,svg,ttf,woff,woff2}'))
    .pipe(flatten())
    .pipe(gulp.dest(path.join(conf.paths.dist, '/fonts/')));
});

var fs = require('fs');
gulp.task('colorstemplate', function () {
  return gulp.src('src/app/colors/che-color.constant.ts.template')
    .pipe(replace('%CONTENT%', fs.readFileSync('src/app/colors/che-colors.json')))
    .pipe(replace('\"', '\''))
    .pipe(gulp.dest('src/app/colors/template'));
});

gulp.task('colors', ['colorstemplate'], function () {
  return gulp.src("src/app/colors/template/che-color.constant.ts.template")
    .pipe(rename("che-color.constant.ts"))
    .pipe(gulp.dest("src/app/colors"));
});

gulp.task('outputcolorstemplate', function () {
  return gulp.src('src/app/colors/che-output-colors.constant.ts.template')
    .pipe(replace('%CONTENT%', fs.readFileSync('src/app/colors/che-output-colors.json')))
    .pipe(replace('\"', '\''))
    .pipe(gulp.dest('src/app/colors/template'));
});

gulp.task('outputcolors', ['outputcolorstemplate'], function () {
  return gulp.src("src/app/colors/template/che-output-colors.constant.ts.template")
    .pipe(rename("che-output-colors.constant.ts"))
    .pipe(gulp.dest("src/app/colors"));
});

gulp.task('proxySettingsTemplate', function () {
  return gulp.src("src/app/proxy/proxy-settings.constant.ts.template")
    .pipe(replace('%CONTENT%', options.server))
    .pipe(gulp.dest('src/app/proxy/template'));
});

gulp.task('proxySettings', ['proxySettingsTemplate'], function () {
  return gulp.src("src/app/proxy/template/proxy-settings.constant.ts.template")
    .pipe(rename("proxy-settings.constant.ts"))
    .pipe(gulp.dest("src/app/proxy"));
});


gulp.task('other', function () {
  var fileFilter = filter(function (file) {
    return file.stat.isFile();
  });

  return gulp.src([
      path.join(conf.paths.src, '/**/*'),
      path.join('!' + conf.paths.src, '/**/*.{html,css,js,styl}')
    ])
    .pipe(fileFilter)
    .pipe(gulp.dest(path.join(conf.paths.dist, '/')));
});

gulp.task('clean', function () {
  return del([path.join(conf.paths.dist, '/'), path.join(conf.paths.tmp, '/')]);
});


gulp.task('build', ['html', 'images', 'htmlassets', 'brandingassets', 'zeroclipboardassets', 'fonts', 'other']);
