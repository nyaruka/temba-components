import replace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';
import fs from 'fs';
import path from 'path';

const replacePlugin = fromRollup(replace);

export default {
  nodeResolve: true,
  plugins: [
    replacePlugin({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],

  middlewares: [
    async (ctx, next) => {
      if (ctx.path.startsWith('/flow/revisions/')) {
        const parts = ctx.path.split('/');
        const uuid = parts[3];
        ctx.set('Content-Type', 'application/json');
        ctx.body = fs.readFileSync(
          path.resolve(`./demo/data/flows/${uuid}.json`),
          'utf-8',
        );
      } else {
        await next();
      }
    },
  ],
};