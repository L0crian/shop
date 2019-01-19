'use strict'
const gulp = require('gulp');

// Plugins
const browserSync = require('browser-sync').create()
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const del = require('del');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const rigger = require('gulp-rigger');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const cssbeautify = require('gulp-cssbeautify');
var uglify = require('gulp-uglify');
const gulpIf = require('gulp-if');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const svgSprite = require('gulp-svg-sprite');
const cheerio = require('gulp-cheerio');
const svgmin = require('gulp-svgmin');
const replace = require('gulp-replace');
const spritesmith = require('gulp.spritesmith');
var gcmq = require('gulp-group-css-media-queries');
var buffer = require('vinyl-buffer');
var csso = require('gulp-csso');
var merge = require('merge-stream');
var util = require('gulp-util');
var size = require('gulp-size');





// Path
var path = {
	dist: {
		html: 'dist/',
		js: 'dist/js/',
		css: 'dist/css/',
		fonts: 'dist/assets/fonts',
		img: 'dist/assets/images/',
		sprites: 'dist/assets/sprites'
	},
	src: {
		html: 'src/template/index.html',
		js: 'src/js/*.js',
		css: 'src/styles/styles.scss',
		fonts: 'src/assets/fonts/**/*.*',
		img: 'src/assets/images/**/*.{png, jpg}',
	},
	watch: {
		html: 'src/**/*.html',
		js: 'src/js/**/*.js',
		styles: 'src/styles/**/*.scss',
		fonts: 'src/assets/fonts/**/*.*',
		img: 'src/assets/images/**/*.*',
		spritesvg: 'src/assets/sprites/svg/*.svg'
	},
	clean: './dist'
};


const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

// Buidld html, css, js
gulp.task('html:build', function () {
	return gulp.src(path.src.html)
		.pipe(rigger())
		.pipe(gulpIf(!isDevelopment, htmlmin()))
		.pipe(gulp.dest(path.dist.html));
});

gulp.task('css:build', function () {
	return gulp.src(path.src.css)
		.pipe(plumber({
			errorHandler: notify.onError(err => ({
				title: 'Styles',
				message: err.message
			}))
		}))
		.pipe(gulpIf(isDevelopment, sourcemaps.init()))
		.pipe(sass())
		.pipe(autoprefixer())
		.pipe(gulpIf(isDevelopment, sourcemaps.write()))
		// .pipe(gulpIf(!isDevelopment, gcmq()))
		.pipe(gulpIf(!isDevelopment, cssnano()))
		.pipe(gulp.dest(path.dist.css));
});

gulp.task('js:build', function () {
	return gulp.src([path.src.js])
	.pipe(concat('scripts.js'))
	.pipe(gulpIf(!isDevelopment, uglify()))
	.pipe(gulp.dest(path.dist.js))
});

// Assets
gulp.task('img:min', function () {
	return gulp.src(path.src.img)
		.pipe(imagemin({
			interlaced: true,
			progressive: true,
			svgoPlugins: [{
				removeViewBox: false
			}],
			use: [pngquant()]
		}))
		.pipe(gulp.dest(path.dist.img));
});

gulp.task('fonts', function () {
	return gulp.src(path.src.fonts)
		.pipe(gulp.dest(path.dist.fonts));
});

// Sprites
gulp.task('png:sprite', function () {

  var spriteData = gulp.src('src/assets/sprites/png/*.png').pipe(spritesmith({
    imgName: 'sprite.png',
		cssName: 'png-sprite.scss',
		imgPath: '../assets/sprites/sprite.png'
  }));
 

  var imgStream = spriteData.img
    .pipe(buffer())
    .pipe(imagemin())
    .pipe(gulp.dest(path.dist.sprites));
 

  var cssStream = spriteData.css
    .pipe(gulp.dest('src/styles/sprites'));
 

  return merge(imgStream, cssStream);
});

gulp.task('svg:sprite', function() {
  return gulp.src('./src/assets/sprites/svg/*.svg')
      .pipe(svgSprite({
        mode: {
          css: {
						dest: '.',
						bust: false,
						sprite: '../assets/sprites/sprite.svg',
						layout: 'vertical',
						prefix: '@mixin sprite-%s',
						dimensions: true,
						render: {
						 scss: {
							 dest: 'svg-sprite.scss'
						 }
					 }
          }
        }
      }))
      .pipe(gulpIf('*.scss', gulp.dest('src/styles/sprites'), gulp.dest('dist/assets')))
});

gulp.task('svg:symbol', function() {
	return gulp.src('./src/assets/sprites/svg/*.svg')
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
				$('[opacity]').removeAttr('opacity');
				$('style').remove();
			},
			parserOptions: { xmlMode: true }
		}))
		.pipe(replace('&gt;', '>'))
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "../sprite.svg",
					render: {
						scss: {
							dest:'_symbol_svg_sprite.scss',
							template: "src/styles/sprites/templates/_symbol_sprite_template.scss"
						}
					},
					example: true
				}
			}
		}))
		.pipe(gulpIf('*.scss', gulp.dest('src/styles/sprites'), gulp.dest('dist/assets/sprites/')))
})

// Serve, watch
gulp.task('serve', function () {
	browserSync.init({
		server: 'dist'
	});

	browserSync.watch('dist/**/*.*').on('change', browserSync.reload);
});

gulp.task('watch', function () {
	gulp.watch([path.watch.html], gulp.series('html:build'));
	gulp.watch([path.watch.styles], gulp.series('css:build'));
	gulp.watch([path.watch.js], gulp.series('js:build'));
	gulp.watch([path.watch.fonts], gulp.series('fonts'));
	gulp.watch([path.watch.img], gulp.series('img:min'));
	gulp.watch([path.watch.spritesvg], gulp.series('svg:symbol'));
});

gulp.task('clean', function () {
	return del(path.clean);
});

gulp.task('build', gulp.series('clean', 'html:build', 'css:build', 'js:build', 'fonts', 'img:min', 'svg:symbol'));

gulp.task('dev', gulp.series('build', gulp.parallel('watch', 'serve')));