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
var webpack = require('../target/dependency/node_modules/webpack-stream');

var util = require('../target/dependency/node_modules/util');

function webpackWrapper(watch, test, callback) {
  var webpackOptions = {
    resolve: { extensions: ['', '.ts'] },
    watch: watch,
    module: {
      preLoaders: [{ test: /\.ts$/, exclude: /node_modules/, loader: 'tslint-loader'}],
      loaders: [{ test: /\.ts$/, exclude: /node_modules/, loaders: ['ng-annotate', 'babel-loader', 'awesome-typescript-loader']}]
    },
    output: { filename: 'index.module.js' }
  };

  if(watch) {
    webpackOptions.devtool = 'inline-source-map';
  }

  var webpackChangeHandler = function(err, stats) {
    if(err) {
      conf.errorHandler('Webpack')(err);
    }
    util.log(stats.toString({
//      colors: util.colors.supportsColor,
      chunks: false,
      hash: false,
      version: false
    }));
    browserSync.reload();
    if(watch) {
      watch = false;
      callback();
    }
  };

  var sources = [ path.join(conf.paths.src, '/app/index.module.ts') ];
  if (test) {
    sources.push(path.join(conf.paths.src, '/{app,components}/**/*.spec.ts'));
  }

  return gulp.src(sources)
    .pipe(webpack(webpackOptions, null, webpackChangeHandler))
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app')));
}

gulp.task('scripts', ['colors', 'proxySettings'], function () {
  return webpackWrapper(false, false);
});

gulp.task('scripts:watch', ['scripts'], function (callback) {
  return webpackWrapper(true, false, callback);
});

gulp.task('scripts:test', ['colors', 'outputcolors', 'proxySettings'], function () {
  return webpackWrapper(false, true);
});

gulp.task('scripts:test-watch', ['scripts'], function (callback) {
  return webpackWrapper(true, true, callback);
});
