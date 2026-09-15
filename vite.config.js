import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/allrates' || url === '/api/coach') {
          // Load env vars into process.env for local dev
          const env = loadEnv(server.config.mode, process.cwd(), '');
          Object.assign(process.env, env);

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              let parsedBody = {};
              if (body) {
                try {
                  parsedBody = JSON.parse(body);
                } catch (e) {}
              }

              const mockReq = {
                method: req.method,
                body: parsedBody,
                query: req.query || {},
                headers: req.headers,
              };

              const mockRes = {
                statusCode: 200,
                status(code) {
                  this.statusCode = code;
                  return this;
                },
                json(payload) {
                  res.statusCode = this.statusCode;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(payload));
                },
              };

              if (url === '/api/allrates') {
                const handler = (await import('./api/allrates.js')).default;
                await handler(mockReq, mockRes);
              } else if (url === '/api/coach') {
                const handler = (await import('./api/coach.js')).default;
                await handler(mockReq, mockRes);
              }
            } catch (err) {
              console.error('Dev API Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message, status: 500 }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  server: {
    port: 5173,
    open: false,
  },
});

