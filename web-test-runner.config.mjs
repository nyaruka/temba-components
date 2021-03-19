import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import fs from  "fs";
import * as path from "path";
import * as pngs from "pngjs";
import dynamicpixelmatch from 'dynamicpixelmatch';
import pixelmatch from 'pixelmatch';
import sizeOf from 'image-size';

const SCREENSHOTS = 'screenshots';
const DIFF = 'diff';
const TEST = "test";
const TRUTH = "truth";

const PNG = pngs.PNG;

const fileExists = (filename) => {
  return new Promise((resolve, reject) => {
    fs.access(filename, fs.F_OK, (err) => {
      if (err) {
        resolve(false);
      }
      resolve(true);
    });
  });
};

const removeDir = (toRemove) => {
  return new Promise((resolve, reject) => {
    fs.rm(toRemove, { recursive: true, force: true }, (err) => {
      if (err) {
        reject(err);
      }
      resolve(`${toRemove} is deleted!`);
    });
  });
}

const ensureExists = function (mydir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(mydir, {recursive: true }, function (err) {
      if (err) {
        if (err.code == "EEXIST")
          resolve("ignore the error if the folder already exists");
        else reject(err); // something else went wrong
      }
      resolve("path created");
    });
  });
};


const getPath = async (type, filename) => {
  const file = path.resolve(SCREENSHOTS, type, filename)

  // make sure our directory exists
  const parts = filename.split(path.sep);
  let pngdir = parts.slice(0, parts.length - 1);
  await ensureExists(path.resolve(SCREENSHOTS, type, ...pngdir));
  
  return file;
}


const checkScreenshot = async (filename, excluded, threshold) => {
  
  return new Promise(async (resolve, reject) => {
    const doneReading = async () => {
      
      // Wait until both files are read.
      if (++filesRead < 2) return;

      // The files should be the same size.
      if (img1.width != img2.width || img1.height !== img2.height) {
        // resolve(`Screenshot was ${img2.width}x${img2.height} but should be ${img1.width}x${img1.height}:\n${testImg}`);


        reject({
          message: 'Screenshot was not the right size',
          expected: `${img1.width}x${img1.height}`,
          actual: `${img2.width}x${img2.height}`,
          files: [testImg, truthImg, path.resolve(SCREENSHOTS)]
        });
        return;
      }

      // Do the visual diff.
      const diff = new PNG({ width: img1.width, height: img2.height });
      const matchOptions = { threshold: threshold || 0.3 };
      const numDiffPixels = excluded != null && excluded.length != 0
          ? dynamicpixelmatch(
              img1.data,
              img2.data,
              diff.data,
              img1.width,
              img1.height,
              matchOptions,
              excluded
            )
          : pixelmatch(
              img1.data,
              img2.data,
              diff.data,
              img1.width,
              img1.height,
              matchOptions
            );

      // The files should look the same.
      if (numDiffPixels != 0) {
        // console.error("number of different pixels are not 0");
        const diffImg = await getPath(DIFF, filename);
        diff.pack().pipe(fs.createWriteStream(diffImg));
        reject({message:"Pixel match failed", files: [diffImg, testImg, truthImg, path.resolve(SCREENSHOTS)]});
      } 
      resolve("success");
    };

    let filesRead = 0;

    const truthImg = await getPath(TRUTH, filename);
    const testImg = await getPath(TEST, filename);

    const img1 = fs
      .createReadStream(truthImg)
      .pipe(new PNG())
      .on("parsed", await doneReading);
      
    const img2 = fs
      .createReadStream(testImg)
      .pipe(new PNG())
      .on("parsed", await doneReading);
  });
};


const wireScreenshots = async (page, context) => {

  // clear out any past tests
  const diffs = path.resolve(SCREENSHOTS, DIFF);
  const tests = path.resolve(SCREENSHOTS, TEST);
  await removeDir(diffs);
  await removeDir(tests);

  await page.exposeFunction("matchPageSnapshot", (filename, clip, excluded, threshold) =>{

    return new Promise(async (resolve, reject) => {
    
      const testFile = await getPath(TEST, filename);
      const truthFile = await getPath(TRUTH, filename);

      if (!await fileExists(truthFile)) {
      
        // no truth yet, record it
        await page.screenshot({ path: truthFile, clip});

      } else {

        // if its close, force our file to be the same size as our truth for pixelmatch
        const dimensions = sizeOf(truthFile);
        let { width, height} = dimensions;

        // we should have a device ration of 2
        width /= 2;
        height /= 2;

        const wDiff = Math.abs((clip.width - width) / width);
        const hDiff = Math.abs((clip.height - height) / height);


        if (wDiff < .15) {
          clip.width = width;
        }

        if(hDiff < .15) {
          clip.height = height;
        }

        if (!clip.width || !clip.height) {
          reject({message: "Couldn't take screenshot clip is empty"});
          return;
        }

        // create a test screenshot to compare with our truth
        await page.screenshot({ path: testFile, clip });

        try {
          const result = await checkScreenshot(filename);
          resolve(result);
        } catch(error) {
          reject(error);
          return;
        }
      }

      resolve(true);

    });

  });

  await page.exposeFunction("setViewport", async (options) => {
    await page.setViewport(options);
  });
  
  await page.exposeFunction("waitFor", (millis)=>{
    return new Promise(async (resolve, reject) => {
      await page.waitForTimeout(millis);
      resolve();
    });
  });

  await page.exposeFunction("moveMouse", (x, y) => {
    return new Promise(async (resolve, reject) => {
      await page.mouse.move(x,y);
      resolve();
    });
  });

  await page.exposeFunction("click", async (element) => {    
    const frame = await page.frames().find((f) => { 
      return true;
    });
    const ele = await frame.$(element);
    await ele.click({});
  });

  await page.exposeFunction("typeInto", async (selector, text, replace=false) => {
    // console.log("frames", page.frames().length);
    const frame = await page.frames().find((f) => { 
      return true
    });
    const element = await frame.$(selector);

    await element.click({clickCount: replace ? 3 : 1});
    await page.keyboard.type(text);
  });

  await page.exposeFunction("pressKey", async (key, times, options) => {
    for (let i=0; i<times; i++) {
      await page.keyboard.press(key, options);
    }
  });

  await page.exposeFunction("type", async (text) => {
    await page.keyboard.type(text);
  });


}


const styles = `
<style>
temba-dialog, temba-modax {
  --transition-speed: 0ms;
}

html input {
  font-weight: 300;
}
  
body {
  padding: 20px;
}

html {
  --input-caret: transparent !important;
  --font-family: 'Roboto', Helvetica, Arial, sans-serif;
  --primary-rgb: 35, 135, 202;
  --secondary-rgb: 140, 51, 140;
  --tertiary-rgb: 135, 202, 35;

  --focus-rgb: 82, 168, 236;
  --error-rgb: 255, 99, 71;
  --success-rgb: 102, 186, 104;

  --selection-light-rgb: 240, 240, 240;
  --selection-dark-rgb: 180, 180, 180;

  --select-input-height: inherit;

  --curvature: 6px;
  --curvature-widget: 6px;
  --color-focus: #a4cafe;
  --color-widget-bg: #fff;
  --color-widget-bg-focused: #fff;
  --color-widget-border: rgb(225, 225, 225);

  /* primary colors, should be dark */
  --color-selection: #f0f6ff;

  --widget-box-shadow-focused: 0 0 0 3px rgba(164, 202, 254, .45);
  --widget-box-shadow-focused-error: 0 0 0 3px rgba(var(--error-rgb), 0.3);

  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

  /* page text, borders, widgets */
  --color-text: #555;
  --color-widget-text: #555;
  --color-borders: rgba(0, 0, 0, 0.07);
  --color-placeholder: #ccc;

  /* light colors, panel backgrounds, selection, etc */
  --color-primary-light: #eee;
  --color-secondary-light: #ccc;

  /* dark colors, nav bar, buttons, etc */
  --color-primary-dark: rgb(var(--primary-rgb));
  --color-secondary-dark: rgb(var(--secondary-rgb));

  /* light text goes over dark, dark over lights */
  --color-text-light: rgba(255, 255, 255, 1);
  --color-text-dark: rgba(0, 0, 0, 0.5);
  --color-text-dark-secondary: rgba(0, 0, 0, 0.25);
  --color-text-help: rgba(0, 0, 0, 0.35);

  /* solid overlays with text */
  --color-overlay-dark: rgba(0, 0, 0, 0.2);
  --color-overlay-dark-text: rgba(255, 255, 255, 0.9);
  --color-overlay-light: rgba(0, 0, 0, 0.05);
  --color-overlay-light-text: rgba(0, 0, 0, 0.6);

  /* links, buttons, and label badges */
  --color-link-primary: rgba(var(--primary-rgb), 0.8);
  --color-link-primary-hover: rgba(var(--primary-rgb), 0.9);
  --color-link-secondary: rgba(var(--secondary-rgb), 0.8);
  --color-link-secondary-hover: rgba(var(--secondary-rgb), 0.9);
  --color-button-primary: var(--color-primary-dark);
  --color-button-primary-text: var(--color-text-light);
  --color-button-secondary: var(--color-secondary-light);
  --color-button-secondary-text: var(--color-text-dark);

  --color-button-destructive: rgb(var(--error-rgb));
  --color-button-destructive-text: var(--color-text-light);

  --color-button-attention: #2ecc71;

  --color-label-primary: var(--color-primary-dark);
  --color-label-primary-text: var(--color-text-light);
  --color-label-secondary: rgba(0, 0, 0, 0.2);
  --color-label-secondary-text: rgba(255, 255, 255, 0.9);

  --color-nav-unselected: #fff;
  --color-nav-selected-bg: #fff;
  --color-nav-selected-text: var(--color-primary-dark);

  --color-info: #c0d9eb;
  --color-warning: #fff6c0;
  --color-error: rgb(var(--error-rgb));
  --font-size: 14px;
  --button-font-size: 1.125rem;

  --header-bg: var(--color-primary-dark);

  --temba-textinput-padding: 9px;
  --temba-textinput-font-size: var(--font-size);

  font-size: var(--font-size);
  font-weight: 300;
  font-family: var(--font-family);

  --button-y: 6px;  
  --button-x: 14px;
}

temba-select:focus {
  outline: none;
  box-shadow: none;
}

.flatpickr-calendar {
  margin-top: 28px;
  margin-bottom: 28px;
  margin-left: -13px;
}

*,
::before,
::after {
  box-sizing: border-box; /* 1 */
  border-width: 0; /* 2 */
  border-style: solid; /* 2 */
  border-color: #e2e2e2; /* 2 */
}

#mocha { 
  display:none;
}
</style>
`;

export default {
  rootDir: './',
  files: 'out-tsc/**/test/**/*.test.js',
  nodeResolve: true,
  plugins: [
    {
      name: 'add-style',
      transform(context) {
        if (context.response.is('html')) {
          return { body: context.body.replace(/<head>/, `<head><link rel="stylesheet" href="/test-assets/style.css">`) };
        }
      },
    },
    /* importMapsPlugin({
      inject: {
        importMap: {
          imports: {
            // mock a module in your own code
            // './out-tsc/src/utils/index.js': 'out-tsc/test/server.js',
            // './src/utils': './test/server'
            // './src/utils': './test/server',
          },
        },
      },
    }),*/
  ],
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        headless: true,
      },
      createBrowserContext: ( { browser, config }) => browser.defaultBrowserContext(),      
      createPage: async ({ context, config }) => {
        const page = await context.newPage();
        await page.exposeFunction("readStaticFile", (filename)=> {
          try {
            var content = fs.readFileSync("./" + filename, 'utf8');
            return content;
          } catch(err) {
            console.log(err);
          }
          return "Not Found";
        })
        
        await page.once('load', async () => {
          await page.addScriptTag(({content: `
            window.watched = ${config.watch};
          `}));
          await wireScreenshots(page, context);
        });
       
        return page;
      },
   }),
  ],
};


