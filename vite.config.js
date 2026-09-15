import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import coachHandler from './api/coach.js';
import allratesHandler from './api/allrates.js';
import channelsHandler from './api/channels.js';

function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/coach' || url === '/api/allrates' || url === '/api/channels') {
          // Sync environment variables from .env files
          const env = loadEnv(server.config.mode, process.cwd(), '');
          const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
          if (geminiKey) {
            process.env.GEMINI_API_KEY = geminiKey;
            process.env.VITE_GEMINI_API_KEY = geminiKey;
          }
          const allratesKey = env.ALLRATESTODAY_API_KEY || env.VITE_ALLRATESTODAY_API_KEY;
          if (allratesKey) {
            process.env.ALLRATESTODAY_API_KEY = allratesKey;
            process.env.VITE_ALLRATESTODAY_API_KEY = allratesKey;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch {
              req.body = {};
            }

            // Decorate res with Express/Vercel compatibility helpers
            res.status = function (code) {
              this.statusCode = code;
              return this;
            };
            res.json = function (data) {
              if (!this.getHeader('Content-Type')) {
                this.setHeader('Content-Type', 'application/json');
              }
              this.end(JSON.stringify(data));
              return this;
            };

            try {
              if (url === '/api/coach') {
                await coachHandler(req, res);
              } else if (url === '/api/allrates') {
                await allratesHandler(req, res);
              } else if (url === '/api/channels') {
                await channelsHandler(req, res);
              }
            } catch (err) {
              console.error(`Dev API error on ${url}:`, err);
              if (!res.writableEnded) {
                res.status(500).json({ error: err.message || 'Internal Dev Server Error' });
              }
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  server: {
    port: 5173,
    open: false,
  },
});

