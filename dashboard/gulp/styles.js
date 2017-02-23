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

var browserSync = require('../target/dependency/node_modules/browser-sync');

var inject = require('../target/dependency/node_modules/gulp-inject');
var sourcemaps = require('../target/dependency/node_modules/gulp-inject');
var stylus = require('../target/dependency/node_modules/gulp-stylus');
var autoprefixer = require('../target/dependency/node_modules/gulp-autoprefixer');
var sourcemaps = require('../target/dependency/node_modules/gulp-sourcemaps');

var wiredep = require('../target/dependency/node_modules/wiredep').stream;
var _ = require('../target/dependency/node_modules/lodash');

gulp.task('styles', function () {

  var injectFiles = gulp.src([
    path.join(conf.paths.src, '/{app,components}/**/*.styl'),
    path.join('!' + conf.paths.src, '/app/index.styl')
  ], { read: false });

  var injectOptions = {
    transform: function(filePath) {
      filePath = filePath.replace(conf.paths.src + '/app/', '');
      filePath = filePath.replace(conf.paths.src + '/components/', '../components/');
      return '@import "' + filePath + '";';
    },
    starttag: '// injector',
    endtag: '// endinjector',
    addRootSlash: false
  };


  return gulp.src([
    path.join(conf.paths.src, '/app/index.styl')
  ])
    .pipe(inject(injectFiles, injectOptions))
    .pipe(wiredep(_.extend({}, conf.wiredep)))
    .pipe(sourcemaps.init())
    .pipe(stylus()).on('error', conf.errorHandler('Stylus'))
    .pipe(autoprefixer()).on('error', conf.errorHandler('Autoprefixer'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app/')))
    .pipe(browserSync.reload({ stream: true }));
});
