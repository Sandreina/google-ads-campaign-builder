import { describe, it, expect } from 'vitest';
import {
  generateHeadlineSuggestions,
  generateDescriptionSuggestions,
  suggestionInputFromAdGroup,
} from './suggestions';
import { RSA_LIMITS } from './constants';
import { createAdGroup, createKeyword, createAsset } from './campaign-ops';

const input = {
  keywords: ['clinical trial imaging', '"clinical trial imaging software"', '[oncology trial imaging]'],
  theme: 'Imaging data management for clinical trials',
  searchIntent: 'Teams seeking to centralize imaging data across studies',
  context: 'This ad group targets teams evaluating imaging platforms. They want oversight.',
};

describe('generateHeadlineSuggestions', () => {
  it('produces headlines, all within the 30 char limit', () => {
    const headlines = generateHeadlineSuggestions(input);
    expect(headlines.length).toBeGreaterThan(0);
    for (const h of headlines) {
      expect(h.length).toBeLessThanOrEqual(RSA_LIMITS.headlineMaxChars);
      expect(h.trim()).toBe(h);
    }
  });

  it('derives a headline from a keyword (match punctuation stripped, title-cased)', () => {
    const headlines = generateHeadlineSuggestions(input);
    expect(headlines).toContain('Clinical Trial Imaging');
    // brackets/quotes removed, not present in any output
    expect(headlines.some((h) => h.includes('[') || h.includes('"'))).toBe(false);
  });

  it('does not return duplicates (case-insensitive)', () => {
    const headlines = generateHeadlineSuggestions(input);
    const lower = headlines.map((h) => h.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('excludes suggestions that already exist', () => {
    const headlines = generateHeadlineSuggestions(input, ['Clinical Trial Imaging']);
    expect(headlines).not.toContain('Clinical Trial Imaging');
  });

  it('still produces generic CTA headlines when there are no keywords/theme', () => {
    const headlines = generateHeadlineSuggestions({ keywords: [] });
    expect(headlines.length).toBeGreaterThan(0);
    expect(headlines).toContain('Request a Demo Today');
  });

  it('respects the requested limit', () => {
    const headlines = generateHeadlineSuggestions(input, [], 3);
    expect(headlines.length).toBeLessThanOrEqual(3);
  });
});

describe('generateDescriptionSuggestions', () => {
  it('produces descriptions within the 90 char limit', () => {
    const descriptions = generateDescriptionSuggestions(input);
    expect(descriptions.length).toBeGreaterThan(0);
    for (const d of descriptions) {
      expect(d.length).toBeLessThanOrEqual(RSA_LIMITS.descriptionMaxChars);
    }
  });

  it('de-duplicates and excludes existing descriptions', () => {
    const first = generateDescriptionSuggestions(input);
    const filtered = generateDescriptionSuggestions(input, [first[0]]);
    expect(filtered).not.toContain(first[0]);
    expect(new Set(filtered.map((d) => d.toLowerCase())).size).toBe(filtered.length);
  });

  it('is deterministic (same input → same output)', () => {
    expect(generateDescriptionSuggestions(input)).toEqual(generateDescriptionSuggestions(input));
  });
});

describe('suggestionInputFromAdGroup', () => {
  it('uses only active keywords plus theme/intent/context', () => {
    const ag = createAdGroup('Group');
    ag.theme = 'A theme';
    ag.searchIntent = 'An intent';
    ag.clientFacingContext = 'Some context';
    ag.keywords = [createKeyword('active kw', 'broad'), { ...createKeyword('paused kw', 'broad'), active: false }];
    ag.headlines = [createAsset('headline', 'Existing', 0)];
    const derived = suggestionInputFromAdGroup(ag);
    expect(derived.keywords).toEqual(['active kw']);
    expect(derived.theme).toBe('A theme');
    expect(derived.searchIntent).toBe('An intent');
    expect(derived.context).toBe('Some context');
  });
});
