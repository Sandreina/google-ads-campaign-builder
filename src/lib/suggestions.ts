import type { AdGroup } from '@/types';
import { RSA_LIMITS } from './constants';

/**
 * Local (no-backend) ad-copy generator. Produces candidate headlines and
 * descriptions from the ad group's keywords, theme, search intent, and
 * client-facing context. All output respects RSA character limits, is
 * de-duplicated (case-insensitive) against itself and against existing assets,
 * and is deterministic so it can be unit-tested.
 */

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function sentenceCase(input: string): string {
  const t = input.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

/** Clean keyword text into a plain phrase (strip match-type punctuation). */
function cleanPhrase(text: string): string {
  return text.replace(/^[["']+|[\]"']+$/g, '').trim();
}

/** First sentence of a free-text block. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return (match ? match[0] : trimmed).trim();
}

const HEADLINE_TEMPLATES: ((kw: string) => string)[] = [
  (kw) => titleCase(kw),
  (kw) => `${titleCase(kw)} Solutions`,
  (kw) => `Explore ${titleCase(kw)}`,
  (kw) => `Trusted ${titleCase(kw)}`,
  (kw) => `${titleCase(kw)} Experts`,
  (kw) => `Built for ${titleCase(kw)}`,
];

const CTA_HEADLINES = [
  'Request a Demo Today',
  'See How It Works',
  'Book a Guided Demo',
  'Talk to Our Team',
  'Get Started Today',
  'Learn More Today',
];

const DESCRIPTION_CTAS = [
  'Request a demo today.',
  'See how it works.',
  'Talk to our team to learn more.',
  'Get started today.',
];

function dedupePush(list: string[], seen: Set<string>, value: string, max: number) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return;
  if (trimmed.length > max) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push(trimmed);
}

export interface SuggestionInput {
  keywords: string[];
  theme?: string;
  searchIntent?: string;
  context?: string;
}

/** Build the seed phrase list from an ad group's signals. */
function buildSeeds(input: SuggestionInput): string[] {
  const seeds: string[] = [];
  for (const kw of input.keywords) {
    const phrase = cleanPhrase(kw);
    if (phrase) seeds.push(phrase);
  }
  if (input.theme?.trim()) seeds.push(input.theme.trim());
  // De-duplicate seeds while preserving order.
  const seen = new Set<string>();
  return seeds.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function generateHeadlineSuggestions(
  input: SuggestionInput,
  existing: string[] = [],
  limit = 15,
): string[] {
  const max = RSA_LIMITS.headlineMaxChars;
  const out: string[] = [];
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const seeds = buildSeeds(input);

  // Pass 1: the plain title-cased phrase for each seed (most relevant first).
  for (const seed of seeds) dedupePush(out, seen, titleCase(seed), max);

  // Pass 2: templated variations, cycling templates across seeds.
  for (let t = 1; t < HEADLINE_TEMPLATES.length && out.length < limit; t++) {
    for (const seed of seeds) {
      if (out.length >= limit) break;
      dedupePush(out, seen, HEADLINE_TEMPLATES[t](seed), max);
    }
  }

  // Pass 3: generic CTAs to round out the set.
  for (const cta of CTA_HEADLINES) {
    if (out.length >= limit) break;
    dedupePush(out, seen, cta, max);
  }

  return out.slice(0, limit);
}

export function generateDescriptionSuggestions(
  input: SuggestionInput,
  existing: string[] = [],
  limit = 4,
): string[] {
  const max = RSA_LIMITS.descriptionMaxChars;
  const out: string[] = [];
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const seeds = buildSeeds(input);
  const topic = seeds[0] ? seeds[0].toLowerCase() : 'your goals';
  const intent = input.searchIntent?.trim();
  const contextSentence = input.context ? firstSentence(input.context) : '';

  // Build candidate sentences, longest-signal first.
  const candidates: string[] = [];

  if (contextSentence) candidates.push(sentenceCase(contextSentence));

  if (intent) {
    candidates.push(sentenceCase(`${intent}. ${DESCRIPTION_CTAS[0]}`));
  }

  // Keyword/theme driven sentences with a CTA appended where it fits.
  seeds.slice(0, 4).forEach((seed, i) => {
    const phrase = seed.toLowerCase();
    const cta = DESCRIPTION_CTAS[(i + 1) % DESCRIPTION_CTAS.length];
    candidates.push(sentenceCase(`Discover ${phrase} built for your team. ${cta}`));
    candidates.push(sentenceCase(`Streamline ${phrase} and improve results across your work. ${cta}`));
  });

  candidates.push(sentenceCase(`Explore solutions designed around ${topic}. ${DESCRIPTION_CTAS[1]}`));
  candidates.push(`Connect your workflows, data, and oversight in one centralized platform.`);

  for (const c of candidates) {
    if (out.length >= limit) break;
    dedupePush(out, seen, c, max);
  }

  return out.slice(0, limit);
}

/** Convenience: derive the {@link SuggestionInput} from an ad group. */
export function suggestionInputFromAdGroup(adGroup: AdGroup): SuggestionInput {
  return {
    keywords: adGroup.keywords.filter((k) => k.active).map((k) => k.text),
    theme: adGroup.theme,
    searchIntent: adGroup.searchIntent,
    context: adGroup.clientFacingContext,
  };
}
