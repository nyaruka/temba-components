import merge from 'deepmerge';
import { createSpaConfig } from '@open-wc/building-rollup';
import packageJson from './package.json';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

const baseConfig = createSpaConfig({
  // if you need to support older browsers, such as IE11, set the legacyBuild
  // option to generate an additional build just for this browser
  // legacyBuild: true,

  outputDir: 'dist',
  // eslint-disable-next-line no-undef
  developmentMode: process.env.ROLLUP_WATCH === 'true',
  injectServiceWorker: false,

  html: {
    input: ['./templates/components-*.html'],
    flattenOutput: false,
    transformHtml: [
      // inject app version
      (html, args) => {
        if (args.htmlFileName === 'templates/components-body.html') {
          html = html.replace(
            '</body>',
            `<script>window.TEMBA_COMPONENTS_VERSION = "${packageJson.version}";</script></body>`
          );
          html = html.replace(/(.*<body>)/is, '');
          html = html.replace(/(<\/body>.*)/is, '');
        }

        if (args.htmlFileName === 'templates/components-head.html') {
          html = html.replace(/(.*<head>)/is, '');
          html = html.replace(/(<\/head>.*)/is, '');
          html = html.replace('as="script"', '');
          html = html.replace(
            '<link rel="preload"',
            '<link rel="modulepreload"'
          );
        }

        return html.replace(
          '="../',
          '="{{STATIC_URL}}@nyaruka/temba-components/dist/'
        );
      },
    ],
  },
});

const rollupConfig = merge(baseConfig, {
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      if (warning.message.includes('luxon')) {
        return;
      }
    }
    warn(warning);
  },
  plugins: [
    commonjs({
      include: 'node_modules/**',
    }),
    copy({
      targets: [
        { src: 'static/svg/index.svg', dest: 'dist/static/svg/' },
        { src: 'static/img', dest: 'dist/static/' },
        { src: 'out-tsc/src/locales', dest: 'dist/' },
        {
          src: 'dist/*.js',
          dest: 'dist/',
          rename: () => 'index.js',
        },
      ],
      hook: 'writeBundle',
    }),
  ],
});

export default rollupConfig;
