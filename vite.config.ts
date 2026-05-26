import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'vercel-serverless-emulation',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/generate')) {
              try {
                // Read request payload
                let body = '';
                await new Promise<void>((resolve, reject) => {
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', () => { resolve(); });
                  req.on('error', err => { reject(err); });
                });

                const parsedBody = body ? JSON.parse(body) : {};

                // Load environmental variables for local development
                const dotenv = await import('dotenv');
                dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
                dotenv.config({ path: path.resolve(process.cwd(), '.env') });

                // Dynamically compile and load TypeScript serverless function using Vite's SSR module loader
                const module = await server.ssrLoadModule('./api/generate.ts');

                const vercelReq = Object.assign(req, { body: parsedBody });
                const vercelRes = Object.assign(res, {
                  status(code: number) {
                    res.statusCode = code;
                    return vercelRes;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  }
                });

                await module.default(vercelReq, vercelRes);
              } catch (err: any) {
                console.error('Error during Vercel serverless function simulation:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  success: false, 
                  message: err.message || '本地伺服器處理 Serverless Function 失敗' 
                }));
              }
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
