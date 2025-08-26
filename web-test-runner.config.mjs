/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { puppeteerLauncher } from '@web/test-runner-puppeteer';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import fs from 'fs';
import * as path from 'path';
import * as pngs from 'pngjs';
import dynamicpixelmatch from 'dynamicpixelmatch';
import pixelmatch from 'pixelmatch';
import sizeOf from 'image-size';

import rimraf from 'rimraf';

import replace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';

const replacePlugin = fromRollup(replace);

const SCREENSHOTS = 'screenshots';
const DIFF = 'diff';
const TEST = 'test';
const TRUTH = 'truth';

const PNG = pngs.PNG;

const fileExists = filename => {
  return new Promise((resolve, reject) => {
    fs.access(filename, fs.F_OK, err => {
      if (err) {
        resolve(false);
      }
      resolve(true);
    });
  });
};

const ensureExists = function (mydir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(mydir, { recursive: true }, function (err) {
      if (err) {
        if (err.code == 'EEXIST')
          resolve('ignore the error if the folder already exists');
        else reject(err); // something else went wrong
      }
      resolve('path created');
    });
  });
};

const getPath = async (type, filename) => {
  const file = path.resolve(SCREENSHOTS, type, filename);

  // make sure our directory exists
  const parts = filename.split(path.sep);
  let pngdir = parts.slice(0, parts.length - 1);
  await ensureExists(path.resolve(SCREENSHOTS, type, ...pngdir));

  return file;
};

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
          files: [testImg, truthImg, path.resolve(SCREENSHOTS)],
        });
        return;
      }

      // Do the visual diff.
      const diff = new PNG({ width: img1.width, height: img2.height });
      const matchOptions = {
        threshold: threshold || 0.3,
        includeAA: false,
        diffColor: [255, 0, 0],
        aaColor: [0, 0, 255],
      };
      const numDiffPixels =
        excluded != null && excluded.length != 0
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
        reject({
          message: 'Pixel match failed',
          files: [diffImg, testImg, truthImg, path.resolve(SCREENSHOTS)],
        });
      }
      resolve('success');
    };

    let filesRead = 0;

    const truthImg = await getPath(TRUTH, filename);
    const testImg = await getPath(TEST, filename);

    const img1 = fs
      .createReadStream(truthImg)
      .pipe(new PNG())
      .on('parsed', doneReading);

    const img2 = fs
      .createReadStream(testImg)
      .pipe(new PNG())
      .on('parsed', doneReading);
  });
};

const wireScreenshots = async (page, context, wait, replaceScreenshots) => {
  // clear out any past tests
  const diffs = path.resolve(SCREENSHOTS, DIFF);
  const tests = path.resolve(SCREENSHOTS, TEST);

  rimraf.sync(diffs);
  rimraf.sync(tests);

  page.exposeFunction(
    'matchPageSnapshot',
    (filename, clip, excluded, threshold) => {
      return new Promise(async (resolve, reject) => {
        // const start = Date.now();
        const testFile = await getPath(TEST, filename);
        const truthFile = await getPath(TRUTH, filename);

        // Only wait for network idle if explicitly requested
        try{
          if (wait) {
            await page.waitForNetworkIdle({idleTime: 500, timeout: 2000});
          } else {
            await page.waitForNetworkIdle({ idleTime: 100, timeout: 1000 });
          }
        } catch (error) {
          console.error('Error waiting for network idle, proceeding: ' + filename);
        }

        if (!(await fileExists(truthFile))) {
          // no truth yet, record it
          await page.screenshot({ path: truthFile, clip });
        } else {
          // if its close, force our file to be the same size as our truth for pixelmatch
          const dimensions = sizeOf(truthFile);
          let { width, height } = dimensions;

          // we should have a device ratio of 2
          width /= 2;
          height /= 2;

          const wDiff = Math.abs((clip.width - width) / width);
          const hDiff = Math.abs((clip.height - height) / height);

          if (wDiff < 0.15) {
            clip.width = width;
          }

          if (hDiff < 0.15) {
            clip.height = height;
          }

          if (!clip.width || !clip.height) {
            reject({ message: "Couldn't take screenshot clip is empty" });
            return;
          }

          // create a test screenshot to compare with our truth
          await page.screenshot({ path: testFile, clip });

          try {
            const result = await checkScreenshot(filename, excluded, threshold);
            // const end = Date.now();
            // console.log(`Screenshot took ${end - start}ms`);
            resolve(result);
          } catch (error) {
            if (replaceScreenshots) {
              await page.screenshot({ path: truthFile, clip });
              resolve();
            } else  {
              reject(error);
            }
            return;
          }
        }

        resolve(true);
      });
    }
  );

  await page.exposeFunction('waitForNetworkIdle', async () => {
    await page.waitForNetworkIdle();
  });

  await page.exposeFunction('setViewport', async options => {
    await page.setViewport(options);
  });

  await page.exposeFunction('waitFor', millis => {
    return page.waitForTimeout(millis);
  });

  await page.exposeFunction('moveMouse', (x, y) => {
    return new Promise(async (resolve, reject) => {
      await page.mouse.move(x, y, { steps: 5 });
      resolve();
    });
  });

  await page.exposeFunction('mouseClick', (x, y) => {
    return new Promise(async (resolve, reject) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.up();
      resolve();
    });
  });

  await page.exposeFunction('mouseDown', async () => {
    return new Promise(async (resolve, reject) => {
      await page.mouse.down();
      resolve();
    });
  });

  await page.exposeFunction('mouseUp', async () => {
    return new Promise(async (resolve, reject) => {
      await page.mouse.up();
      resolve();
    });
  });

  await page.exposeFunction('click', async element => {
    const frame = await page.frames().find(f => {
      return true;
    });
    const ele = await frame.$(element);
    await ele.click({});
  });


  await page.exposeFunction(
    'typeInto',
    async (selector, text, replace = false, enter = false) => {
      const selectors = selector.split(':');
      const frame = await page.frames().find(f => {
        return true;
      });
      await frame.$(selectors[0]);

      let codeSelector = `document.querySelector("${selectors[0]}")`;
      selectors.shift();
      if (selectors.length > 0) {
        codeSelector +=
          '.' +
          selectors
            .map(entry => `shadowRoot.querySelector("${entry}")`)
            .join('.');
      }

      const element = await page.evaluateHandle(codeSelector);
      await element.click({ clickCount: replace ? 3 : 1 });
      await page.keyboard.type(text);

      if (enter) {
        await page.keyboard.press('Enter');
      }
    }
  );

  await page.exposeFunction('pressKey', async (key, times, options) => {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(key, options);
    }
  });

  await page.exposeFunction('type', async text => {
    await page.keyboard.type(text);
  });
};

export default {
  rootDir: './',
  files: '**/test/**/*.test.ts',
  nodeResolve: true,
  setupFiles: ['./test-setup.js'],
  concurrency: 4,
  testFramework: {
    config: {
      timeout: '5000',
    },
  },

  plugins: [
    replacePlugin({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('test'),
    }),
    {
      name: 'add-style',
      transform(context) {
        if (context.response.is('html')) {
          return {
            body: context.body.replace(
              /<head>/,
              `<head><link rel="stylesheet" href="/test-assets/temba-components.css"/><link rel="stylesheet" href="/test-assets/style.css"/>`
            ),
          };
        }
      },
    },
    esbuildPlugin({ ts: true }),

    /* importMapsPlugin({
      inject: {
        importMap: {
          imports: {
            // mock a module in your own code
            // './out-tsc/src/utils/index.js': 'out-tsc/test/server.js',
            // './src/utils': './test/server'
          },
        },
      },
    }),*/
  ],
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        args: [
          '--font-render-hinting=medium',
          '--force-color-profile=srgb',
          '--hide-scrollbars',
          '--disable-web-security',
          '--force-device-scale-factor=1',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-font-subpixel-positioning',
          '--disable-lcd-text',
          '--force-prefers-reduced-motion',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          // additional flags for consistent rendering across environments
          '--disable-gpu-sandbox',
          '--disable-software-rasterizer',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-sync',
          '--disable-translate',
          '--hide-crash-restore-bubble',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--use-mock-keychain',
          '--disable-ipc-flooding-protection',
          '--disable-component-update',
          '--disable-domain-reliability',
        ],
        headless: true,
      },
      createPage: async ({ context, config }) => {
        const params = (config['unknown'] || [])
        const wait = !params.includes('--fast');
        const replaceScreenshots = params.includes('--replace-screenshots');

        const page = await context.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
        );
        
        // detect if we're running in copilot's environment
        const isCopilotEnvironment = process.env.COPILOT_API_URL || process.env.COPILOT_AGENT_CALLBACK_URL;
        
        // inject script into every document that loads
        await page.evaluateOnNewDocument((watched, copilotEnv) => {
          window.watched = watched;
          window.isCopilotEnvironment = copilotEnv;
        }, config.watch, !!isCopilotEnvironment);
        
        await page.once('load', async () => {
          await wireScreenshots(page, context, wait, replaceScreenshots);
        });

        await page.emulateTimezone('GMT');

        return page;
      },
    }),
  ],
};

