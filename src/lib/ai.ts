import type { AssetType } from '@/types';
import type { SuggestionInput } from './suggestions';
import { maxCharsFor } from './validation';

/**
 * Real LLM-backed ad-copy generation. The app has no backend, so the call is
 * made directly from the browser against a provider the user configures (key
 * stored only in their browser). Anthropic, OpenAI, and any OpenAI-compatible
 * gateway endpoint are supported. Falls back to the local template generator
 * (src/lib/suggestions.ts) when no provider is configured.
 */

export type AiProvider = 'proxy' | 'anthropic' | 'openai' | 'compatible';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
  /**
   * For 'compatible': the provider base URL.
   * For 'proxy': the proxy endpoint path (defaults to /api/llm/chat).
   */
  baseUrl?: string;
}

export function isAiConfigured(settings: AiSettings | null | undefined): settings is AiSettings {
  if (!settings) return false;
  // The server proxy holds the key, so the browser needs no key/model.
  if (settings.provider === 'proxy') return true;
  return !!settings.apiKey.trim() && !!settings.model.trim();
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  proxy: '',
  // Per Anthropic guidance, default to the most capable current model.
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o-mini',
  compatible: '',
};

export const DEFAULT_PROXY_PATH = '/api/llm/chat';

/** Build the instruction prompt for a given asset type. */
export function buildPrompt(input: SuggestionInput, type: AssetType, count: number): string {
  const max = maxCharsFor(type);
  const label = type === 'headline' ? 'headlines' : 'descriptions';
  const lines: string[] = [];
  lines.push(
    `You are an expert Google Ads copywriter. Write ${count} distinct, compelling Responsive Search Ad ${label} for the ad group described below.`,
  );
  lines.push('');
  lines.push('Rules:');
  lines.push(`- Each ${type} MUST be ${max} characters or fewer (this is a hard Google Ads limit).`);
  if (type === 'headline') {
    lines.push('- Headlines are short and punchy; use title case where natural.');
    lines.push('- Include clear value propositions and calls to action across the set.');
  } else {
    lines.push('- Descriptions are full sentences that expand on the value proposition.');
    lines.push('- End most descriptions with a clear call to action.');
  }
  lines.push('- Make each one meaningfully different — vary angle, benefit, and phrasing.');
  lines.push('- Stay truthful to the context; do not invent unsupported claims.');
  lines.push('- Do not use emoji or exclamation-mark spam.');
  lines.push('');
  lines.push('Ad group context:');
  if (input.theme?.trim()) lines.push(`- Theme: ${input.theme.trim()}`);
  if (input.searchIntent?.trim()) lines.push(`- Search intent: ${input.searchIntent.trim()}`);
  if (input.context?.trim()) lines.push(`- Additional context: ${input.context.trim()}`);
  if (input.keywords.length) {
    lines.push(`- Target keywords: ${input.keywords.slice(0, 20).join(', ')}`);
  }
  if (!input.theme && !input.searchIntent && !input.context && input.keywords.length === 0) {
    lines.push('- (No specific context provided — write strong general B2B search ad copy.)');
  }
  lines.push('');
  lines.push(
    `Return ONLY a JSON object of the form {"items": ["...", "..."]} containing the ${label}. No commentary.`,
  );
  return lines.join('\n');
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'string' } },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

/**
 * Parse the model's response into a list of strings. Tolerant of: a JSON
 * object with an `items` array, a bare JSON array, JSON wrapped in prose or
 * code fences, or a newline-delimited fallback.
 */
export function parseItems(raw: string): string[] {
  const text = raw.trim();

  const tryParse = (candidate: string): string[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) {
        return ((parsed as { items: unknown[] }).items).map(String);
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  // 1. Whole response as JSON.
  const whole = tryParse(text);
  if (whole) return clean(whole);

  // 2. Extract the first {...} or [...] block.
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const fromObj = tryParse(objMatch[0]);
    if (fromObj) return clean(fromObj);
  }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const fromArr = tryParse(arrMatch[0]);
    if (fromArr) return clean(fromArr);
  }

  // 3. Newline fallback: strip bullets/numbering/quotes.
  return clean(
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["']|["']$/g, '').trim())
      .filter(Boolean),
  );
}

function clean(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim().replace(/\s+/g, ' ');
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export class AiError extends Error {}

interface GenerateOptions {
  input: SuggestionInput;
  type: AssetType;
  count: number;
  settings: AiSettings;
  signal?: AbortSignal;
}

/**
 * Generate ad copy with the configured LLM provider. Returns items already
 * trimmed and de-duplicated; the caller filters by character limit and against
 * existing assets.
 */
export async function generateCopyWithAI(opts: GenerateOptions): Promise<string[]> {
  const { input, type, count, settings, signal } = opts;
  const prompt = buildPrompt(input, type, count);
  let raw: string;
  if (settings.provider === 'proxy') raw = await callProxy(prompt, settings, signal);
  else if (settings.provider === 'anthropic') raw = await callAnthropic(prompt, settings, signal);
  else raw = await callOpenAICompatible(prompt, settings, signal);
  return parseItems(raw);
}

async function callProxy(prompt: string, settings: AiSettings, signal?: AbortSignal): Promise<string> {
  const endpoint = (settings.baseUrl?.trim() || DEFAULT_PROXY_PATH).replace(/\/+$/, '');
  const res = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, model: settings.model.trim() || undefined }),
  });
  if (!res.ok) throw new AiError(await readError(res));
  const data = await res.json();
  const text = data?.text ?? '';
  if (!text) throw new AiError('The proxy returned an empty response.');
  return text;
}

async function callAnthropic(prompt: string, settings: AiSettings, signal?: AbortSignal): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      // Required to allow calling the Anthropic API directly from a browser.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2048,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new AiError(await readError(res));
  const data = await res.json();
  const block = Array.isArray(data?.content)
    ? data.content.find((b: { type?: string }) => b.type === 'text')
    : null;
  const text = block?.text ?? '';
  if (!text) throw new AiError('The model returned an empty response.');
  return text;
}

async function callOpenAICompatible(
  prompt: string,
  settings: AiSettings,
  signal?: AbortSignal,
): Promise<string> {
  const base = (settings.provider === 'openai'
    ? 'https://api.openai.com/v1'
    : (settings.baseUrl ?? '').replace(/\/+$/, '')
  ).trim();
  if (!base) throw new AiError('A base URL is required for an OpenAI-compatible provider.');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Google Ads copywriter. Respond only with the requested JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new AiError(await readError(res));
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new AiError('The model returned an empty response.');
  return text;
}

async function readError(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? body?.error?.type ?? JSON.stringify(body).slice(0, 200);
  } catch {
    detail = await res.text().catch(() => '');
  }
  if (res.status === 401) return 'Authentication failed — check your API key.';
  if (res.status === 429) return 'Rate limited by the provider — try again shortly.';
  return `Request failed (${res.status})${detail ? `: ${detail}` : ''}.`;
}

/** Filter AI output to valid, non-duplicate items within the char limit. */
export function filterValidItems(items: string[], type: AssetType, existing: string[]): string[] {
  const max = maxCharsFor(type);
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || t.length > max) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
