const webpackConfig = require("./webpack.config");
const path = require("path");

const puppeteer = require("puppeteer");
process.env.CHROME_BIN = puppeteer.executablePath();

delete webpackConfig.entry;
webpackConfig.mode = "development";
webpackConfig[0]["plugins"] = [webpackConfig[0]["plugins"][0]];
webpackConfig[0]["module"]["rules"] = webpackConfig[0]["module"]["rules"].slice(
  1
);

// console.log(JSON.stringify(webpackConfig[0]["module"]["rules"], null, 2));

module.exports = (config) => {
  config.set({
    browsers: ["ChromeHeadless"],
    frameworks: ["mocha"],
    reporters: ["spec"],
    files: ["src/**/*.test.ts"],
    preprocessors: {
      "src/**/*.ts": ["webpack"],
    },
    mime: {
      "text/x-typescript": ["ts", "tsx"],
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
};
