import replace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';
import fs from 'fs';
import path from 'path';
import { Client as MinioClient } from 'minio';
import busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';

const replacePlugin = fromRollup(replace);

// Initialize Minio client for file uploads
const minioClient = new MinioClient({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'root',
  secretKey: 'tembatemba'
});

// Helper function to generate the correct public URL for uploaded files
function getPublicUrl(bucketName, fileName, request) {
  // Check if request is coming from localhost/127.0.0.1 (host machine)
  // or from within docker network
  const host = request.headers.host;
  const userAgent = request.headers['user-agent'] || '';
  
  // If accessing from host machine (localhost:3010), use localhost for minio too
  if (host && host.startsWith('localhost:')) {
    return `http://localhost:9000/${bucketName}/${fileName}`;
  }
  
  // If accessing from docker network, use internal hostname
  return `http://minio:9000/${bucketName}/${fileName}`;
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

        // Handle minio file uploads for media
        if (context.request.method === 'POST' && context.path === '/api/v2/media.json') {
          return new Promise((resolve) => {
            try {
              const bb = busboy({ headers: context.request.headers });
              let fileInfo = null;
              let fileBuffer = null;
              
              bb.on('file', (name, file, info) => {
                fileInfo = info;
                const chunks = [];
                
                file.on('data', (chunk) => {
                  chunks.push(chunk);
                });
                
                file.on('end', () => {
                  fileBuffer = Buffer.concat(chunks);
                });
              });
              
              bb.on('finish', async () => {
                if (!fileBuffer || !fileInfo) {
                  context.status = 400;
                  context.body = JSON.stringify({ error: 'No file uploaded' });
                  resolve();
                  return;
                }
                
                try {
                  const fileUuid = uuidv4();
                  const fileName = `${fileUuid}-${fileInfo.filename}`;
                  const bucketName = 'temba-attachments';
                  
                  // Upload to minio
                  await minioClient.putObject(bucketName, fileName, fileBuffer, {
                    'Content-Type': fileInfo.mimeType
                  });
                  
                  // Return success response with appropriate URL based on request source
                  const publicUrl = getPublicUrl(bucketName, fileName, context.request);
                  
                  // Debug logging
                  console.log('🔧 Upload Debug:', {
                    fileUuid,
                    fileName,
                    bucketName,
                    publicUrl,
                    contentType: fileInfo.mimeType,
                    host: context.request.headers.host
                  });
                  
                  context.contentType = 'application/json';
                  context.body = JSON.stringify({
                    uuid: fileUuid,
                    content_type: fileInfo.mimeType,
                    url: publicUrl,
                    filename: fileInfo.filename,
                    size: fileBuffer.length
                  });
                  
                } catch (uploadError) {
                  console.error('Minio upload error:', uploadError);
                  context.status = 500;
                  context.body = JSON.stringify({ 
                    error: 'Upload failed',
                    details: uploadError.message 
                  });
                }
                
                resolve();
              });
              
              context.req.pipe(bb);
              
            } catch (error) {
              console.error('File upload processing error:', error);
              context.status = 500;
              context.body = JSON.stringify({ 
                error: 'Upload processing failed',
                details: error.message 
              });
              resolve();
            }
          });
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
                fs.writeFileSync(
                  path.resolve(`./demo/data/flows/${uuid}.json`),
                  JSON.stringify({ definition: JSON.parse(body) }, null, 2)
                );
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