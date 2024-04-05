import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import image from '@rollup/plugin-image';

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
        image(),

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

