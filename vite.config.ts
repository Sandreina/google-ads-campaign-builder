import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// @ts-expect-error — plain .mjs handler shared with the production server
import { handleLlmChat } from './server/llm-handler.mjs';

/**
 * Dev/preview middleware that exposes POST /api/llm/chat, mirroring the
 * production server (server/proxy.mjs). Keeps the LLM API key server-side
 * (read from .env.local) so the browser's "Server proxy" provider never holds
 * a key.
 */
function llmProxyPlugin(env: Record<string, string>): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api/llm/chat', (req, res, next) => {
      if (req.method !== 'POST') return next();
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const { status, json } = await handleLlmChat(body, env);
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(json));
        } catch {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid request body.' }));
        }
      });
    });
  };
  return {
    name: 'llm-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode }) => {
  // Load all env vars (not just VITE_*) from .env / .env.local for the proxy.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), llmProxyPlugin(env)],
    server: {
      port: 5174,
      strictPort: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Vitest reads this `test` block at runtime.
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  };
});
