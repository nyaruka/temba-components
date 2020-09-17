const webpackConfig = require("./webpack.config");
const path = require("path");

const puppeteer = require("puppeteer");
process.env.CHROME_BIN = puppeteer.executablePath();

delete webpackConfig[0].entry;
webpackConfig[0].mode = "development";
webpackConfig[0]["plugins"] = [webpackConfig[0]["plugins"][0]];
webpackConfig[0]["module"]["rules"] = webpackConfig[0]["module"]["rules"].slice(
  1
);

// make sure our typescript gets analyzed for coverge
webpackConfig[0]["module"]["rules"][0] = {
  test: /\.ts/,
  exclude: [/\.test\.ts$/, /node_modules/],
  use: ["@jsdevtools/coverage-istanbul-loader", "ts-loader"],
};

webpackConfig[0]["module"]["rules"].push({
  test: /\.test\.ts$/,
  use: ["ts-loader"],
});

delete webpackConfig[0].output;

// would love inline-source-map to work here but
// i've lost too much time wrestling with that
webpackConfig[0].devtool = false;

module.exports = (config) => {
  config.set({
    basePath: "",
    browsers: ["PuppeteerHeadless"],

    client: {
      args: config.screenshots ? ["--screenshots"] : [],
    },

    customLaunchers: {
      PuppeteerHeadless: {
        base: "Puppeteer",
        flags: ["--headless=true"],
      },
    },
    frameworks: ["mocha"],
    files: [
      "test/index.test.js",
      {
        pattern: "test-assets/style.css",
        watched: true,
        included: true,
        served: true,
      },
      {
        pattern: "test-assets/**/*",
        watched: false,
        included: false,
        served: true,
      },
    ],

    preprocessors: {
      "test/index.test.js": ["webpack"],
    },

    plugins: [
      "karma-mocha",
      "karma-webpack",
      "karma-chrome-launcher",
      "karma-firefox-launcher",
      "karma-puppeteer-launcher",
      "karma-mocha-reporter",
      "karma-coverage-istanbul-reporter",
      "karma-spec-reporter",
    ],

    reporters: ["coverage-istanbul", "mocha"],

    proxies: {
      "/sitestatic/": "/base/test-assets/",
    },

    mime: {
      "text/x-typescript": ["ts", "tsx"],
      "image/svg+xml": ["svg"],
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true,
    },
    coverageIstanbulReporter: {
      reports: ["html", "text-summary", "lcovonly"],
      dir: path.join(__dirname, "coverage"),

      fixWebpackSourcePaths: true,
      "report-config": {
        html: { outdir: "html" },
      },
    },
  });

  // handy for debugging our config
  // const util = require("util");
  // console.log(util.inspect(config, false, null, true));
};
