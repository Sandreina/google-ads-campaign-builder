// Shared, dependency-free LLM proxy handler used by both the Vite dev
// middleware (vite.config.ts) and the production server (server/proxy.mjs).
//
// The provider is chosen from environment variables, so the API key lives on
// the server and is never sent to the browser:
//   - ANTHROPIC_API_KEY                 → Anthropic (Claude)
//   - OPENAI_API_KEY                    → OpenAI
//   - LLM_API_KEY + LLM_BASE_URL        → any OpenAI-compatible endpoint
//                                         (e.g. an internal gateway)
// Optional: ANTHROPIC_MODEL / OPENAI_MODEL / LLM_MODEL set the default model.

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'string' } } },
  required: ['items'],
  additionalProperties: false,
};

/**
 * @param {{prompt?: string, model?: string}} body
 * @param {Record<string,string|undefined>} env
 * @returns {Promise<{status:number, json:object}>}
 */
export async function handleLlmChat(body, env) {
  const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
  if (!prompt.trim()) {
    return { status: 400, json: { error: 'Missing "prompt" in request body.' } };
  }

  try {
    if (env.ANTHROPIC_API_KEY) {
      const model = body.model || env.ANTHROPIC_MODEL || 'claude-opus-4-8';
      const text = await callAnthropic(prompt, model, env.ANTHROPIC_API_KEY);
      return { status: 200, json: { text } };
    }
    if (env.OPENAI_API_KEY) {
      const model = body.model || env.OPENAI_MODEL || 'gpt-4o-mini';
      const text = await callOpenAICompatible(prompt, model, 'https://api.openai.com/v1', env.OPENAI_API_KEY);
      return { status: 200, json: { text } };
    }
    if (env.LLM_API_KEY && env.LLM_BASE_URL) {
      const model = body.model || env.LLM_MODEL || '';
      if (!model) return { status: 400, json: { error: 'No model configured (set LLM_MODEL or pass "model").' } };
      const text = await callOpenAICompatible(prompt, model, env.LLM_BASE_URL.replace(/\/+$/, ''), env.LLM_API_KEY);
      return { status: 200, json: { text } };
    }
    return {
      status: 501,
      json: {
        error:
          'No LLM provider configured on the server. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or LLM_API_KEY + LLM_BASE_URL.',
      },
    };
  } catch (err) {
    return { status: 502, json: { error: err?.message || 'Upstream LLM request failed.' } };
  }
}

async function callAnthropic(prompt, model, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  const block = Array.isArray(data?.content) ? data.content.find((b) => b.type === 'text') : null;
  return block?.text ?? '';
}

async function callOpenAICompatible(prompt, model, base, apiKey) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert Google Ads copywriter. Respond only with the requested JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function errorText(res) {
  try {
    const body = await res.json();
    return body?.error?.message || `Upstream error ${res.status}`;
  } catch {
    return `Upstream error ${res.status}`;
  }
}

/** Minimal .env / .env.local parser (KEY=VALUE lines), no dependency. */
export function parseDotEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}
