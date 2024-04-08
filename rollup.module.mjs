import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import svg from 'rollup-plugin-svg-import';
import copy from 'rollup-plugin-copy';

export default {
    input: 'temba-components.ts',
    output: {
        file: 'dist/temba-components.js',

        // Immediately Invoked Function Expression
        format: 'iife',

        name: 'TembaComponents',
        sourcemap: true
    },
    plugins: [
        // inline our icons
        svg({ stringify: true }),

        // resolve external modules
        resolve(),

        // convert commonjs modules to es6
        commonjs({ include: 'node_modules/**' }),

        // compile our typescript
        typescript({ sourceMap: true, inlineSources: true }),

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

        // minify
        terser()
    ]
};

