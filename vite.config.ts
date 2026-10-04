import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Dev-only login/health endpoints backed by the same identity model as server.cjs.
        name: 'dev-api-server',
        configureServer(server) {
          const { authenticate, getAuthSecret } = createRequire(import.meta.url)('./server/identity.cjs');
          const secret = getAuthSecret();
          const send = (res: ServerResponse, status: number, payload: unknown) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          };
          server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
            if (req.url === '/api/auth/login' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: Buffer) => { body += chunk; });
              req.on('end', () => {
                try {
                  const { email, password } = JSON.parse(body || '{}');
                  const result = authenticate(email, password, secret);
                  if (result) return send(res, 200, { token: result.token, user: result.user });
                  return send(res, 401, { message: 'E-posta veya şifre geçersiz.' });
                } catch {
                  return send(res, 400, { message: 'Geçersiz veri biçimi.' });
                }
              });
              return;
            }
            if (req.url === '/api/health') return send(res, 200, { status: 'ok' });
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ag-grid': ['ag-grid-community', 'ag-grid-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1400,
    },
  };
});
