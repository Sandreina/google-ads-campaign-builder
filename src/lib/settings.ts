import { z } from 'zod';
import { STORAGE_KEYS } from './constants';
import type { AiSettings } from './ai';

export const aiSettingsSchema = z.object({
  provider: z.enum(['proxy', 'anthropic', 'openai', 'compatible']),
  apiKey: z.string(),
  model: z.string(),
  baseUrl: z.string().optional(),
});

const appSettingsSchema = z.object({
  ai: aiSettingsSchema.optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

/**
 * App settings persistence (localStorage). Kept separate from campaign data.
 * The AI API key lives here — in the user's browser only — and is never
 * included in any campaign export or client-facing output.
 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return {};
    const parsed = appSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function saveAiSettings(ai: AiSettings | null): void {
  const current = loadSettings();
  const next: AppSettings = { ...current, ai: ai ?? undefined };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
}

export function loadAiSettings(): AiSettings | null {
  return loadSettings().ai ?? null;
}
