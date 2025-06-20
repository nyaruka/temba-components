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
    {
      name: 'flow-files',
      serve(context) {
        if (context.request.method === 'POST' && context.path.startsWith('/flow/revisions/')) {
          return new Promise((resolve) => {
            let body = '';
            const parts = context.path.split('/');
            const uuid = parts[3];
            context.req.on('data', chunk => {
              body += chunk.toString();
            });
            context.req.on('end', () => {
              context.contentType = 'application/json';
              if (body) {
                fs.writeFileSync(
                  path.resolve(`./demo/data/flows/${uuid}.json`),
                  JSON.stringify({ definition: JSON.parse(body) }, null, 2)
                );
                console.log(`Flow ${uuid} saved successfully.`);
                context.body = {
                  status: 'success',
                  message: `Flow ${uuid} saved successfully.`,
                  definition: JSON.parse(body),
                };
                context.status = 200;
              } else {
                console.log(`No body received for flow ${uuid}.`);
                context.body = {
                  status: 'error',
                  message: `No body received for flow ${uuid}.`,
                };
                context.status = 400;
              }
              resolve();
            });
          });
        }

        if (context.request.method === 'GET' && context.path.startsWith('/flow/revisions/')) {
          const parts = context.path.split('/');
          const uuid = parts[3];
          context.contentType = 'application/json';
          context.body = fs.readFileSync(
            path.resolve(`./demo/data/flows/${uuid}.json`),
            'utf-8',
          );
        }
      }
    }
  ],
};