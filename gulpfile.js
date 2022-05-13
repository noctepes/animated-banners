var { gulp, parallel, series, src, dest, watch } = require("gulp");
var del = require("del");
var plumber = require("gulp-plumber");
var newer = require("gulp-newer");
var rename = require("gulp-rename");

var pug = require("gulp-pug");
var uglify = require("gulp-uglify");
var htmlmin = require("gulp-htmlmin");
var strReplace = require("gulp-string-replace");
var imagemin = require("gulp-imagemin");
// var pngquant = require("imagemin-pngquant");
// var mozjpeg = require("imagemin-mozjpeg");

var currentProject = {
  name: "3044134_MTO_Friends_Media Banners Packages_2HY22", // <-- Replace project folder here
  input: "./src/",
  output: "./dist/",

  workDir: "/2. Working/Awareness", // <-- Change the Animated Folder here
  deliDir: "/2b. Progress/",
  doneDir: "/3. Done/",
};

var workingDir = currentProject.input + currentProject.name + currentProject.workDir;
var deliverDir = currentProject.input + currentProject.name + currentProject.deliDir;
var doneDir = currentProject.input + currentProject.name + currentProject.doneDir;

var clickTagURL = "";

function cleanDeliverFiles() {
  return del(deliverDir);
}

function cleanWorkingFiles() {
  return del([workingDir + "/**/*.*", workingDir + "/**/*/.DS_Store", "!" + workingDir + "/**/*.fla"]);
}

function moveReadyFiles() {
  return src(deliverDir + "/**/*.*")
    .pipe(plumber())
    .pipe(dest(doneDir));
}

function htmlOverview() {
  return src("./src/index.pug")
    .pipe(plumber())
    .pipe(
      pug({
        pretty: true,
      })
    )
    .pipe(dest(deliverDir));
}

function minifyJS() {
  return src(workingDir + "/**/*.js")
    .pipe(plumber())
    .pipe(newer(deliverDir))
    .pipe(uglify())
    .pipe(dest(deliverDir));
}

function minifyHTML() {
  return src(workingDir + "/**/*.html")
    .pipe(plumber())
    .pipe(newer(deliverDir))
    .pipe(
      htmlmin({
        minifyJS: true,
      })
    )
    .pipe(strReplace(`clickTag=""`, `clickTag="${clickTagURL}"`))
    .pipe(
      rename({
        basename: "index",
        extname: ".html",
      })
    )
    .pipe(dest(deliverDir));
}

function optimizeImages() {
  return src(workingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}")
    .pipe(plumber())
    .pipe(newer(deliverDir))
    .pipe(imagemin([imagemin.gifsicle({ interlaced: true }), imagemin.mozjpeg({ quality: 75, progressive: true }), imagemin.optipng({ optimizationLevel: 5 })]))
    .pipe(dest(deliverDir));
}

function copyImages() {
  return src(workingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}")
    .pipe(plumber())
    .pipe(newer(deliverDir))
    .pipe(dest(deliverDir));
}

function watchSource() {
  watch(workingDir + "/**/*.js", series(minifyJS));
  watch(workingDir + "/**/*.html", series(minifyHTML));
  watch(workingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}", series(optimizeImages));
}

exports.minifyJS = series(minifyJS);
exports.minifyHTML = series(minifyHTML);
exports.optimizeImages = series(optimizeImages);
exports.buildHTML = series(htmlOverview);

exports.cleanDeliverFiles = series(cleanDeliverFiles);
exports.moveReadyFiles = series(moveReadyFiles);

exports.watch = series(watchSource);
// exports.default = parallel(minifyJS, minifyHTML, optimizeImages);

// Not Optimize Images
exports.default = parallel(minifyJS, minifyHTML, copyImages);