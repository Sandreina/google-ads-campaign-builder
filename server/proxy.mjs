// Zero-dependency production server: serves the built SPA from dist/ and
// exposes POST /api/llm/chat so the LLM API key stays server-side.
//
// Usage:
//   npm run build
//   ANTHROPIC_API_KEY=sk-ant-... node server/proxy.mjs        # or PORT=8080 ...
//
// Provider selection and env vars are documented in server/llm-handler.mjs.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { handleLlmChat, parseDotEnv } from './llm-handler.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;

// Merge .env.local (if present) into the environment for convenience.
const env = { ...process.env };
try {
  const local = await readFile(join(ROOT, '.env.local'), 'utf8');
  Object.assign(env, parseDotEnv(local), process.env); // real env wins over file
} catch {
  /* no .env.local — fine */
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(req, res) {
  // Prevent path traversal; default to index.html for SPA routes.
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (rel === '/' || rel === '') rel = '/index.html';
  let filePath = join(DIST, rel);
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && (req.url || '').startsWith('/api/llm/chat')) {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const { status, json } = await handleLlmChat(body, env);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(json));
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body.' }));
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, () => {
  const provider = env.ANTHROPIC_API_KEY
    ? 'Anthropic'
    : env.OPENAI_API_KEY
      ? 'OpenAI'
      : env.LLM_API_KEY && env.LLM_BASE_URL
        ? 'OpenAI-compatible'
        : 'none (set ANTHROPIC_API_KEY / OPENAI_API_KEY / LLM_API_KEY+LLM_BASE_URL)';
  // eslint-disable-next-line no-console
  console.log(`Google Ads Campaign Builder running at http://localhost:${PORT}  ·  LLM proxy: ${provider}`);
});
