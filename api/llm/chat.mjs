// Vercel serverless function — mirrors the dev middleware and the standalone
// server, so the LLM API key stays server-side on Vercel too. Configure one of
// ANTHROPIC_API_KEY / OPENAI_API_KEY / (LLM_API_KEY + LLM_BASE_URL) in the
// Vercel project's Environment Variables.
import { handleLlmChat } from '../../server/llm-handler.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { status, json } = await handleLlmChat(body, process.env);
    res.status(status).json(json);
  } catch {
    res.status(400).json({ error: 'Invalid request body.' });
  }
}
