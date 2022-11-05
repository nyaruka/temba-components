#!/usr/bin/env node

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .argv

const svgstore = require('svgstore');
const htmlclean = require('htmlclean');
const sh = require('shelljs');
const fs = require('fs');
const path = require('path');
const SVGFixer = require('oslllo-svg-fixer');

const cwd = process.cwd();
const OUTPUT_FILE_NAME = cwd + "/static/svg/index.svg";
const TRACED_DIR = cwd + "/static/svg/traced";
const PACK_DIR = cwd + "/static/svg/packs";

  
const sprites = svgstore()
let packs = sh.ls(PACK_DIR);

async function main() {

  // trace our strokes so we can rely on consistent fills
  if (argv.trace) {
    var options = {
      showProgressBar: true,
      throwIfDestinationDoesNotExist: false,
    };
    
    // only work on the provided pack if given
    if (argv.pack) {
      packs = packs.filter((file) => file.endsWith(argv.pack));
    }

    packs.sort();
    // trace our strokes
    for (let index = 0; index < packs.length; index++) {
      const pack = packs[index];
      await SVGFixer(`${PACK_DIR}/${pack}`, TRACED_DIR, options).fix();
    }
    
  } else {

    const files = sh.find(TRACED_DIR)
      .filter(file => file.match(/\.svg$/))

    files.forEach(file => {
      const id = path.basename(file, '.svg')
      const contents = fs.readFileSync(file, 'utf8')
      sprites.add(id, contents)
    });    

    let output = htmlclean(sprites.toString({ cleanDefs: true, cleanSymbols: true, renameDefs: true }))
    output = output.replaceAll(/fill="black"/g, `fill="currentColor"`);

    fs.writeFileSync(OUTPUT_FILE_NAME, output)
    console.info('Merged %s files into %s', files.length, OUTPUT_FILE_NAME);
  }
}

main();