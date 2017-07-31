/* eslint-disable */
const gulp = require('gulp');
const sequence = require('run-sequence');
const $ = require('gulp-load-plugins')();

const developAscii = `
                                                                         
 _|_|_|    _|_|_|_|  _|      _|  _|_|_|_|  _|          _|_|    _|_|_|    
 _|    _|  _|        _|      _|  _|        _|        _|    _|  _|    _|  
 _|    _|  _|_|_|    _|      _|  _|_|_|    _|        _|    _|  _|_|_|    
 _|    _|  _|          _|  _|    _|        _|        _|    _|  _|        
 _|_|_|    _|_|_|_|      _|      _|_|_|_|  _|_|_|_|    _|_|    _|        
                                                                         
                                                                         `;
const productAscii = `
                                                                         
 _|_|_|    _|_|_|      _|_|    _|_|_|    _|    _|    _|_|_|  _|_|_|_|_|  
 _|    _|  _|    _|  _|    _|  _|    _|  _|    _|  _|            _|      
 _|_|_|    _|_|_|    _|    _|  _|    _|  _|    _|  _|            _|      
 _|        _|    _|  _|    _|  _|    _|  _|    _|  _|            _|      
 _|        _|    _|    _|_|    _|_|_|      _|_|      _|_|_|      _|      
                                                                         
                                                                         `;
const chalk = require('chalk');
const developLog = str => {
  console.log(chalk.green(str));
};
const productLog = str => {
  console.log(chalk.blue(str));
};
const ENV_CODE = $.util.env._[0];
const DEV_MODE = ENV_CODE !== 'p' && ENV_CODE !== 'pp';
const log = str => {
  if (DEV_MODE) developLog(str);
  else productLog(str);
};

gulp.task('image', () => {
  const merge = require('merge-stream');
  const imageminMozjpeg = require('imagemin-mozjpeg');
  const imageminPngquant = require('imagemin-pngquant');
  const imageSrc = ['src/img/**/*.+(jpg|png|gif)', '!src/img/**/_*', '!src/img/_*/*'];
  const ignoreSrc = ['src/img/**/_*', 'src/img/_*/*'];
  const distPath = 'dist/img';
  const taskIgnore = gulp.src(ignoreSrc)
    .pipe($.changed(distPath))
    .pipe($.size({ showFiles: true }))
    .pipe(gulp.dest(distPath));
  const taskImage = gulp.src(imageSrc)
    .pipe($.changed(distPath))
    .pipe($.imagemin([
      imageminMozjpeg({ quality: 80 }),
      imageminPngquant({ quality: 75 }),
      $.imagemin.gifsicle({interlaced: true}),
      // $.imagemin.jpegtran({ progressive: true }),
      // $.imagemin.optipng({ optimizationLevel: 5 }),
    ], { verbose: true }))
    .pipe(gulp.dest(distPath));
  if (DEV_MODE) {
    gulp.watch('src/img/**/*', () => sequence('image', 'reload'));
  }
  return merge(taskIgnore, taskImage);
});

gulp.task('pug', () => {
  const srcPath = ['src/html/**/*.pug', '!src/html/**/_*', '!src/html/include/*.pug'];
  const moment = require('moment');
  if (DEV_MODE) {
    gulp.watch('src/html/**/*.pug', () => sequence('pug', 'reload'));
  }
  return gulp.src(srcPath)
    .pipe($.plumber())
    .pipe($.pug({
      pretty: DEV_MODE,
      data: {
        DEV_MODE,
        TIME: moment().format('YYYY/MM/DD-HH:mm:ss'),
        HASH: moment().format('YYYYMMDDHHmmss'),
      },
      verbose: true,
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('stylus', () => {
  const srcPath = ['src/css/**/*.styl', '!src/css/**/_*'];
  const autoprefixer = require('autoprefixer');
  if (DEV_MODE) {
    gulp.watch('src/css/**/*.styl', () => sequence('stylus', 'stream'));
  }
  return gulp.src(srcPath)
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.stylus({
      compress: DEV_MODE,
      'include css': true,
    }))
    .pipe($.postcss([
      autoprefixer({
        browsers: [
          'last 3 version',
          'ie >= 9',
          'iOS >=8',
          'Safari >=8',
        ]
      }),
    ]))
    .pipe(DEV_MODE ? $.sourcemaps.write() : $.util.noop())
    .pipe(gulp.dest('dist/css'));
});

gulp.task('js', () => {
  const browserify = require('browserify');
  const babelify = require('babelify');
  const envify = require('envify/custom');
  const watchify = require('watchify');
  const entryList = [
    'src/js/index.js',
  ];
  const streams = entryList.map((entry) => {
    const brow = browserify(entry, {
      debug: DEV_MODE,
      cache: {},
      packageCache: {},
    });
    brow.transform(babelify, {
      presets: ['es2015', 'stage-3'],
      plugins: [
        'transform-runtime',
        'transform-object-rest-spread',
        'transform-async-to-generator',
        'transform-async-generator-functions',
        'transform-class-properties',
      ],
    });
    brow.transform(envify({
      NODE_ENV: DEV_MODE ? 'development' : 'production',
    }));
    const makeWatchify = (bundler, entry) => {
      const path = require('path');
      const source = require('vinyl-source-stream');
      const buffer = require('vinyl-buffer');
      return () => {
        $.util.log('build-start', entry);
        const name = path.basename(entry);
        return bundler.bundle()
          .on('error', (err) => {
            $.util.log('build-error', err);
          })
          .pipe(source(name))
          .pipe(buffer())
          .pipe($.sourcemaps.init({ loadMaps: true }))
          .pipe(DEV_MODE ? $.util.noop() : $.uglify())
          .pipe(DEV_MODE ? $.sourcemaps.write() : $.util.noop())
          .pipe(gulp.dest('dist/js'))
          .on('end', () => {
            if (DEV_MODE) gulp.start('reload');
          });
      };
    };
    let watchFunc;
    if (!DEV_MODE) watchFunc = makeWatchify(brow, entry);
    else {
      const bundler = watchify(brow);
      watchFunc = makeWatchify(bundler, entry);
      bundler.on('update', watchFunc);
      bundler.on('log', log);
    }
    return watchFunc();
  });
  return streams;
});

gulp.task('lib', () => {
  return gulp.src('src/lib/*.js')
    .pipe($.concat('lib.js', { newLine: ';\n\n' }))
    .pipe(gulp.dest('./dist/js'));
});

/**

   _|_|_|  _|_|_|_|  _|_|_|    _|      _|  _|_|_|_|  _|_|_|
 _|        _|        _|    _|  _|      _|  _|        _|    _|
   _|_|    _|_|_|    _|_|_|    _|      _|  _|_|_|    _|_|_|
       _|  _|        _|    _|    _|  _|    _|        _|    _|
 _|_|_|    _|_|_|_|  _|    _|      _|      _|_|_|_|  _|    _|


 */
const server = require('browser-sync').create();

gulp.task('server', () => {
  // const proxy = require('http-proxy-middleware')
  server.init({
    open: true,
    server: {
      baseDir: './dist/',
      // middleware: [
      //   proxy('/api/*.ashx', {
      //     target: '',
      //     changeOrigin: true,
      //   })
      // ]
    },
  });
});

gulp.task('reload', (callback) => {
  server.reload();
  callback();
});

gulp.task('stream', (callback) => {
  server.stream({ match: '**/*.css' });
  callback();
});

gulp.task('rimraf', (callback) => {
  const rimraf = require('rimraf');
  rimraf('./dist', callback);
});

/**

 _|_|_|    _|_|_|_|  _|_|_|_|    _|_|    _|    _|  _|    _|_|_|_|_|
 _|    _|  _|        _|        _|    _|  _|    _|  _|        _|
 _|    _|  _|_|_|    _|_|_|    _|_|_|_|  _|    _|  _|        _|
 _|    _|  _|        _|        _|    _|  _|    _|  _|        _|
 _|_|_|    _|_|_|_|  _|        _|    _|    _|_|    _|_|_|_|  _|


 */
const DEFAULT = ['image', 'pug', 'stylus', 'js', 'lib'];

gulp.task('d', () => {
  log(developAscii);
  return sequence(...DEFAULT.concat(['server']));
});

gulp.task('p', () => {
  log(productAscii);
  return sequence(...['rimraf'].concat(DEFAULT));
});
