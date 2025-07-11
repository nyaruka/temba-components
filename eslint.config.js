import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import htmlPlugin from 'eslint-plugin-html';
import litPlugin from 'eslint-plugin-lit';
import litA11yPlugin from 'eslint-plugin-lit-a11y';
import wcPlugin from 'eslint-plugin-wc';
import noOnlyTestsPlugin from 'eslint-plugin-no-only-tests';
import globals from 'globals';

export default [
  // Include ESLint recommended configuration
  js.configs.recommended,

  {
    // Apply to all files
    files: ['**/*.{js,ts}'],

    // Configure language options
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha, // For test files
        customElements: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        EventListener: 'readonly'
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },

    // Configure plugins
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      html: htmlPlugin,
      lit: litPlugin,
      'lit-a11y': litA11yPlugin,
      wc: wcPlugin,
      'no-only-tests': noOnlyTestsPlugin
    },

    // Base rules
    rules: {
      // Disabled typescript rules
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Disabled import rules
      'import/named': 'off',
      'import/no-unresolved': 'off',

      // Block console.log statements unless explicitly disabled
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Allow unused vars in test files
      'no-unused-vars': 'off'
    }
  },

  // Special handling for test files
  {
    files: ['**/test/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        typeInto: 'readonly',
        moveMouse: 'readonly',
        mouseDown: 'readonly',
        mouseUp: 'readonly',
        waitFor: 'readonly',
        click: 'readonly',
        pressKey: 'readonly',
        type: 'readonly',
        mouseClick: 'readonly',
        setViewport: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        xit: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },

  // Add ignore patterns (equivalent to .eslintignore)
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'coverage/**',
      'out-tsc/**',
      'screenshots/**',
      '.eslintrc.js',
      'svg.js',
      'CreateIncludesPlugin.js',
      'check-coverage.js',
      'demo/static/js/**',
      'web-dev-server.config.mjs',
      'web-test-runner.config.mjs'
    ]
  }
];
