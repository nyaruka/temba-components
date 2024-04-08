import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import svg from 'rollup-plugin-svg-import';

export default {
    input: 'temba-webchat.ts',
    output: {
        file: 'dist/temba-webchat.js',

        // Immediately Invoked Function Expression
        format: 'iife',

        name: 'WebChat',
        sourcemap: true
    },
    plugins: [
        // inline our icons
        svg({ stringify: true }),

        // resolve external modules
        resolve(),

        // convert commonjs modules to es6
        commonjs(),

        // compile our typescript
        typescript({ sourceMap: true, inlineSources: true }),

        // minify
        terser()
    ]
};

