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
      name: 'api-mock-server',
      serve(context) {
        // Handle API endpoints by serving static files
        if (context.request.method === 'GET' && context.path.startsWith('/api/')) {
          // Map API endpoints to static files
          const apiMappings = {
            '/api/v2/groups.json': './static/api/groups.json',
            '/api/v2/fields.json': './static/api/fields.json', 
            '/api/v2/globals.json': './static/api/globals.json',
            '/api/v2/completion.json': './static/api/completion.json',
            '/api/v2/functions.json': './static/api/functions.json',
            '/api/internal/templates.json': './static/api/templates.json',
            '/api/v2/media.json': './static/api/media.json',
            '/api/v2/users.json': './static/api/users.json',
            '/api/v2/contacts.json': './static/api/contacts.json',
            '/api/v2/optins.json': './static/api/optins.json',
            '/api/v2/topics.json': './static/api/topics.json',
            '/api/internal/locations.json': './static/api/locations.json',
            '/api/internal/orgs.json': './static/api/orgs.json'
          };

          // Handle base path without query parameters
          const basePath = context.path.split('?')[0];
          const staticFile = apiMappings[basePath];
          
          if (staticFile && fs.existsSync(path.resolve(staticFile))) {
            context.contentType = 'application/json';
            context.body = fs.readFileSync(path.resolve(staticFile), 'utf-8');
            return;
          }
        }
      }
    },
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
                // console.log(`Flow ${uuid} saved successfully.`);
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