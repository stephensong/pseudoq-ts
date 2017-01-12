"use strict";

const gulp = require('gulp');
const jasmine = require('gulp-jasmine');
const tsc = require('gulp-typescript');
const browserSync = require('browser-sync').create();
const runSequence = require("run-sequence");


gulp.task('test-oxigen', () =>
    gulp.src('test/oxigen.spec.js')
        // gulp-jasmine works on filepaths so you can't have any plugins before it
        .pipe(jasmine())
);

gulp.task("test", ["build"], function(cb) {
    runSequence(["test-oxigen"], cb);
});

gulp.task("watch", ["default"], function () {
    
    browserSync.init({
        server: "."
    });
    
    gulp.watch([ "source/**/**.ts", "test/**/*.ts"], ["default"]);
    gulp.watch("dist/*.js").on('change', browserSync.reload); 
});
