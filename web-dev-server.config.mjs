import replace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';

const replacePlugin = fromRollup(replace);

export default {
  nodeResolve: true,
  plugins: [
    replacePlugin({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
};