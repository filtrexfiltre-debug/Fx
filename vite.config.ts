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
        name: 'dev-api-server',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/auth/login' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                try {
                  const { email, password } = JSON.parse(body || '{}');
                  const norm = (email || '').trim().toLowerCase();
                  const users = [
                    { email: 'patron@enterprise.com', name: 'Ahmet Yılmaz (Yönetici)', role: 'Patron', branchId: 'all' },
                    { email: 'kadikoy@enterprise.com', name: 'Burak Demir (Kadıköy Müdürü)', role: 'Şube Yöneticisi', branchId: 'b2222222-2222-2222-2222-222222222222' },
                    { email: 'merkez@enterprise.com', name: 'Selin Kaya (Merkez Sorumlusu)', role: 'Şube Yöneticisi', branchId: 'b1111111-1111-1111-1111-111111111111' },
                  ];
                  const user = users.find((u) => u.email === norm);
                  if (user && password === '123456') {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      token: `token-${user.role.toLowerCase()}-${Date.now()}`,
                      user,
                    }));
                    return;
                  }
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ message: 'E-posta veya şifre geçersiz.' }));
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ message: 'Geçersiz veri biçimi.' }));
                }
              });
              return;
            }
            if (req.url === '/api/health') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok' }));
              return;
            }
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
