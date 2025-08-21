import replace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';
import fs from 'fs';
import path from 'path';

// Import the shared flow info generator and Minio functionality
import { generateFlowInfo, handleMinioUpload } from './web-dev-mock.mjs';

const replacePlugin = fromRollup(replace);

// Simple wrapper function to use the shared flow info generator
function generateFlowMetadata(flowDefinition) {
  return generateFlowInfo(flowDefinition);
}

export default {
  nodeResolve: true,
  plugins: [
    replacePlugin({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.MINIO_ENDPOINT': JSON.stringify('http://minio:9000'),
      'process.env.MINIO_PUBLIC_ENDPOINT': JSON.stringify('http://localhost:9000'),
      'process.env.MINIO_ACCESS_KEY': JSON.stringify('root'),
      'process.env.MINIO_SECRET_KEY': JSON.stringify('tembatemba'),
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
            '/api/v2/completion.json': './static/mr/docs/en-us/editor.json',
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

        // Handle minio file uploads for media
        if (context.request.method === 'POST' && context.path === '/api/v2/media.json') {
          return handleMinioUpload(context);
        }
      }
    },
    {
      name: 'flows-directory-listing',
      serve(context) {
        // Handle directory listing for flows using a special API endpoint

        if (context.request.method === 'GET' && context.path === '/api/flows-list') {

          const flowsDir = path.resolve('./demo/data/flows');
          
          if (fs.existsSync(flowsDir)) {
            const files = fs.readdirSync(flowsDir).filter(file => file.endsWith('.json'));

            // Return JSON array of filenames
            context.contentType = 'application/json';
            context.body = JSON.stringify(files);
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
                const flowDefinition = JSON.parse(body);
                fs.writeFileSync(
                  path.resolve(`./demo/data/flows/${uuid}.json`),
                  JSON.stringify({ definition: flowDefinition }, null, 2)
                );
                
                // Generate metadata similar to production
                const metadata = generateFlowMetadata(flowDefinition);
                
                const response = {
                  status: 'success',
                  saved_on: new Date().toISOString(),
                  revision: {
                    id: Math.floor(Math.random() * 1000) + 1,
                    user: {
                      email: 'admin1@textit.com',
                      name: 'Adam McAdmin'
                    },
                    created_on: new Date().toISOString(),
                    version: flowDefinition.spec_version || '14.3.0',
                    revision: (flowDefinition.revision || 0) + 1
                  },
                  info: {
                    counts: metadata.counts,
                    dependencies: metadata.dependencies,
                    locals: metadata.locals,
                    results: metadata.results,
                    parent_refs: [],
                    issues: []
                  },
                  issues: [],
                  metadata: {
                    counts: metadata.counts,
                    dependencies: metadata.dependencies,
                    locals: metadata.locals,
                    results: metadata.results,
                    parent_refs: [],
                    issues: []
                  }
                };
                
                context.body = JSON.stringify(response);
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
          
          // Read the flow definition from file
          const flowFileContent = fs.readFileSync(
            path.resolve(`./demo/data/flows/${uuid}.json`),
            'utf-8',
          );
          
          const flowData = JSON.parse(flowFileContent);
          
          if (flowData.definition) {
            const info = generateFlowMetadata(flowData.definition);
            context.body = JSON.stringify({
              definition: flowData.definition,
              info: info
            });
          }
        }
      }
    }
  ],
};