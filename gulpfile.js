var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');

gulp.task('browserify', function() {
    return browserify('./src/javascript/app.js').bundle()
        // vinyl-source-stream makes the bundle compatible with gulp
        .pipe(source('bundle.js')) // Desired filename
        // Output the file
        .pipe(gulp.dest('./build/'));
});

