const { gulp, parallel, series, src, dest, watch } = require("gulp");
const fs = require("fs");
const plumber = require("gulp-plumber");
const newer = require("gulp-newer");
const rename = require("gulp-rename");

const pug = require("gulp-pug");
const uglify = require("gulp-uglify");
const htmlmin = require("gulp-htmlmin");
const strReplace = require("gulp-string-replace");
const imagemin = require("gulp-imagemin");
const tinypng = require("gulp-tinypng-extended");

/*=====  Start of tinyPNG Account Management  ======*/

// Free tinyPNG accounts
const tinyPNGAccounts = [
    {
        email: "toan.huynh@spring-production.com",
        key: "HCZ9GFy7z18gPrnSGy4t3vmVkK31qx8P"
    },
    {
        email: "kami.shino1000@gmail.com",
        key: "b4jzygsdt58wLWF224sNhhJYD7p4KXt4"
    },
    {
        email: "kami.shino70411@gmail.com",
        key: "T2sQsq948BGZSCqvFCKC5dhgkPn9rmr2"
    },
    // Temporary Email
    {
        email: "hilmugugne@vusra.com",
        key: "HwW87YCYGlCyS6YB63scCcvqNmnlvs3X"
    },
    {
        email: "erla11@wmqrhabits.com",
        key: "CplxXxkJhP1TS0wL97DVrrk2zh1jMYlS"
    },
];

// Load usage data from file if exists
const usageFilePath = './tinypng-usage.json';
let currentAccountIndex = 0;

function loadUsageData() {
    try {
        if (fs.existsSync(usageFilePath)) {
            const data = JSON.parse(fs.readFileSync(usageFilePath, 'utf8'));
            // Update usage data
            data.accounts.forEach((account, index) => {
                if (tinyPNGAccounts[index]) {
                    tinyPNGAccounts[index].used = account.used || 0;
                    tinyPNGAccounts[index].quota = account.quota || 500;
                }
            });
            currentAccountIndex = data.currentIndex || 0;
            console.log(`Loaded usage data. Current account: ${currentAccountIndex}`);
        } else {
            // Initialize with default values if no saved data
            tinyPNGAccounts.forEach(account => {
                account.used = 0;
                account.quota = 500;
            });
        }
    } catch (error) {
        console.log('Could not load usage data, starting fresh');
        // Initialize with default values on error
        tinyPNGAccounts.forEach(account => {
            account.used = 0;
            account.quota = 500;
        });
    }
}

function saveUsageData() {
    const data = {
        currentIndex: currentAccountIndex,
        accounts: tinyPNGAccounts.map(account => ({
            email: account.email,
            used: account.used,
            quota: account.quota
        })),
        lastUpdated: new Date().toISOString()
    };

    try {
        fs.writeFileSync(usageFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Could not save usage data:', error.message);
    }
}

function getNextAvailableAccount() {
    // Check current account first
    if (tinyPNGAccounts[currentAccountIndex].used < tinyPNGAccounts[currentAccountIndex].quota) {
        return tinyPNGAccounts[currentAccountIndex];
    }

    // Find next available account
    for (let i = 0; i < tinyPNGAccounts.length; i++) {
        const nextIndex = (currentAccountIndex + i + 1) % tinyPNGAccounts.length;
        if (tinyPNGAccounts[nextIndex].used < tinyPNGAccounts[nextIndex].quota) {
            currentAccountIndex = nextIndex;
            console.log(`Switched to account: ${tinyPNGAccounts[currentAccountIndex].email}`);
            saveUsageData();
            return tinyPNGAccounts[currentAccountIndex];
        }
    }

    // All accounts are over quota
    throw new Error('All TinyPNG accounts have exceeded their quota. Please wait for next month or add more accounts.');
}

function incrementUsage() {
    tinyPNGAccounts[currentAccountIndex].used++;
    saveUsageData();

    const current = tinyPNGAccounts[currentAccountIndex];
    console.log(`Account ${current.email}: ${current.used}/${current.quota} images used`);

    if (current.used >= current.quota) {
        console.log(`Account ${current.email} has reached quota limit!`);
    }
}
// Initialize usage data
loadUsageData();

/*=====  End of tinyPNG Account Management  ======*/

/*=====  Start of Setup project folder path  ======*/

const folderPath = {
    brief: "1_Src",
    working: "2_Working",
    progress: "2b_Progress",
    done: "3_Done",
    delivery: "4_Delivery",
};

const currentProject = {
    input: "./src/", // <-- Every project must be created in this folder - You can change the path if you want
    output: "./dist/",

    name: "_Compress", // <-- Change the folder name here

    workDir: `/${folderPath.working}`,
    progDir: `/${folderPath.progress}`,
    doneDir: `/${folderPath.done}`,
    deliDir: `/${folderPath.delivery}`,
};

const currentWorkingDir = currentProject.input + currentProject.name + currentProject.workDir;
const currentProgressDir = currentProject.input + currentProject.name + currentProject.progDir;
const currentDoneDir = currentProject.input + currentProject.name + currentProject.doneDir;
const currentDeliveryDir = currentProject.input + currentProject.name + currentProject.deliDir;

const CLICKTAG_URL = ""; // <-- Add the clickTag URL

/*=====  End of Setup project folder path  ======*/

function createHTMLOverview() {
    return src(currentProject.input + "index.pug")
        .pipe(plumber())
        .pipe(
            pug({
                pretty: true,
            })
        )
        .pipe(dest(currentProgressDir));
}

function minifyJS() {
    return src(currentWorkingDir + "/**/*.js")
        .pipe(plumber())
        .pipe(newer(currentProgressDir))
        .pipe(uglify())
        .pipe(dest(currentProgressDir));
}

function minifyHTML() {
    console.log(currentWorkingDir + "/**/*.html");

    return src(currentWorkingDir + "/**/*.html")
        .pipe(plumber())
        .pipe(newer(currentProgressDir))
        .pipe(
            htmlmin({
                minifyJS: true,
            })
        )
        .pipe(strReplace(`clickTag=""`, `clickTag="${CLICKTAG_URL}"`))
        .pipe(
            rename({
                basename: "index",
                extname: ".html",
            })
        )
        .pipe(dest(currentProgressDir));
}

function minifyImages() {
    return src(currentWorkingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}")
        .pipe(plumber({
            errorHandler: function (error) {
                console.error('Error in minifyImages:', error.message);
                this.emit('end');
            }
        }))
        .pipe(newer(currentProgressDir))
        .pipe(
            imagemin([
                imagemin.gifsicle({ interlaced: true }),
                imagemin.mozjpeg({ quality: 80, progressive: true }),
                imagemin.optipng({ optimizationLevel: 3 }), // Reduced from 6 to 3 for better compatibility
            ], {
                verbose: true // Enable verbose logging to see what's happening
            })
        )
        .pipe(dest(currentProgressDir));
}

function useTinyPNG() {
    return new Promise((resolve, reject) => {
        let currentAccount;

        try {
            currentAccount = getNextAvailableAccount();
        } catch (error) {
            return reject(error);
        }

        console.log(`Using TinyPNG account: ${currentAccount.email}`);

        const stream = src(currentWorkingDir + "/**/*.{png,jpg,jpeg}")
            .pipe(plumber({
                errorHandler: function (error) {
                    console.error('Error in TinyPNG:', error.message);

                    // If quota exceeded, try next account
                    if (error.message.includes('quota') || error.message.includes('limit')) {
                        console.log('Quota exceeded, trying next account...');
                        incrementUsage(); // Mark current account as used up

                        try {
                            currentAccount = getNextAvailableAccount();
                            console.log(`Switched to account: ${currentAccount.email}`);
                            // Restart the process with new account
                            useTinyPNG().then(resolve).catch(reject);
                            return;
                        } catch (nextError) {
                            reject(nextError);
                            return;
                        }
                    }

                    this.emit('end');
                }
            }))
            .pipe(newer(currentProgressDir))
            .pipe(
                tinypng({
                    key: currentAccount.key,
                    log: true,
                    summarise: true,
                })
            )
            .pipe(dest(currentProgressDir));

        stream.on('end', () => {
            incrementUsage();
            resolve();
        });

        stream.on('error', reject);
    });
}

function copyLoader() {
    return src(currentWorkingDir + "/**/*.gif")
        .pipe(plumber())
        .pipe(dest(currentProgressDir));
}

function watchSource() {
    watch(currentWorkingDir + "/**/*.js", series(minifyJS));
    watch(currentWorkingDir + "/**/*.html", series(minifyHTML));
    watch(currentWorkingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}", series(minifyImages));
}

// Reset usage data (useful for new month)
function resetUsage() {
    tinyPNGAccounts.forEach(account => {
        account.used = 0;
    });
    currentAccountIndex = 0;
    saveUsageData();
    console.log('Usage data reset for new month!');
}

// Show current usage status
function showUsage() {
    console.log('\n=== TinyPNG Account Usage ===');
    tinyPNGAccounts.forEach((account, index) => {
        const status = index === currentAccountIndex ? ' (CURRENT)' : '';
        const percentage = ((account.used / account.quota) * 100).toFixed(1);
        console.log(`${index + 1}. ${account.email}${status}: ${account.used}/${account.quota} (${percentage}%)`);
    });
    console.log('=============================\n');
}

exports.minifyJS = series(minifyJS);
exports.minifyHTML = series(minifyHTML);
exports.minifyImages = series(minifyImages);
exports.useTinyPNG = series(useTinyPNG, copyLoader);
exports.createHTMLOverview = series(createHTMLOverview);
exports.copyImages = series(copyImages);
exports.copyOtherFiles = series(copyOtherFiles);
exports.resetUsage = resetUsage;
exports.showUsage = showUsage;

exports.watch = series(watchSource);

function copyImages() {
    return src(currentWorkingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}")
        .pipe(plumber())
        .pipe(newer(currentProgressDir))
        .pipe(dest(currentProgressDir));
}

/*=====  Start of Files to exclude from copying  ======*/

const excludeFiles = [
    // Exclude processed files
    "!" + currentWorkingDir + "/**/*.js",
    "!" + currentWorkingDir + "/**/*.html",
    "!" + currentWorkingDir + "/**/*.{png,jpg,jpeg,gif,ico,svg}",

    // Add your custom exclusions here:
    "!" + currentWorkingDir + "/**/*.psd",           // Photoshop files
    "!" + currentWorkingDir + "/**/*.ai",            // Illustrator files
    "!" + currentWorkingDir + "/**/*.sketch",        // Sketch files
    "!" + currentWorkingDir + "/**/*.fig",           // Figma files
    "!" + currentWorkingDir + "/**/*.xd",            // Adobe XD files
    "!" + currentWorkingDir + "/**/*.zip",           // Archive files
    "!" + currentWorkingDir + "/**/*.rar",
    "!" + currentWorkingDir + "/**/*.7z",
    "!" + currentWorkingDir + "/**/*.tmp",           // Temporary files
    "!" + currentWorkingDir + "/**/*.bak",           // Backup files
    "!" + currentWorkingDir + "/**/*.log",           // Log files
    "!" + currentWorkingDir + "/**/.DS_Store",       // Mac system files
    "!" + currentWorkingDir + "/**/Thumbs.db",       // Windows system files
    "!" + currentWorkingDir + "/**/*.md",            // Markdown files
    "!" + currentWorkingDir + "/**/*.txt",           // Text files
    "!" + currentWorkingDir + "/**/node_modules/**", // Node modules
    "!" + currentWorkingDir + "/**/.git/**",         // Git files
    "!" + currentWorkingDir + "/**/.vscode/**",      // VS Code settings
    "!" + currentWorkingDir + "/**/*.scss",          // SCSS source files
    "!" + currentWorkingDir + "/**/*.less",          // LESS source files
    "!" + currentWorkingDir + "/**/*.ts",            // TypeScript source files

    // Uncomment below lines if you want to exclude them:
    // "!" + currentWorkingDir + "/**/*.css",        // CSS files
    // "!" + currentWorkingDir + "/**/*.json",       // JSON files
    // "!" + currentWorkingDir + "/**/*.xml",        // XML files
    // "!" + currentWorkingDir + "/**/*.pdf",        // PDF files
    // "!" + currentWorkingDir + "/**/*.doc",        // Word documents
    // "!" + currentWorkingDir + "/**/*.docx",
    // "!" + currentWorkingDir + "/**/*.xlsx",       // Excel files
    // "!" + currentWorkingDir + "/**/*.ppt",        // PowerPoint files
    // "!" + currentWorkingDir + "/**/*.pptx",
];

/*=====  End of Files to exclude from copying  ======*/

function copyOtherFiles() {
    return src([
        currentWorkingDir + "/**/*",
        ...excludeFiles
    ])
        .pipe(plumber())
        .pipe(newer(currentProgressDir))
        .pipe(dest(currentProgressDir));
}

exports.copyImages = series(copyImages);
exports.copyOtherFiles = series(copyOtherFiles);

// Default: Minify JS/HTML, copy images & other files
//exports.default = parallel(minifyJS, minifyHTML, copyImages);

// Option 1: Using native optimize images
exports.default = parallel(minifyJS, minifyHTML, exports.minifyImages);

// Option 2: Using tinyPNG images
//exports.default = parallel(minifyJS, minifyHTML, exports.useTinyPNG);