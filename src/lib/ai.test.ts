import { describe, it, expect } from 'vitest';
import { parseItems, filterValidItems, buildPrompt, isAiConfigured } from './ai';

describe('parseItems', () => {
  it('parses a JSON object with an items array', () => {
    expect(parseItems('{"items": ["A", "B", "C"]}')).toEqual(['A', 'B', 'C']);
  });

  it('parses a bare JSON array', () => {
    expect(parseItems('["A", "B"]')).toEqual(['A', 'B']);
  });

  it('extracts JSON from surrounding prose / code fences', () => {
    const raw = 'Here you go:\n```json\n{"items": ["One", "Two"]}\n```\nHope that helps!';
    expect(parseItems(raw)).toEqual(['One', 'Two']);
  });

  it('falls back to newline parsing with bullets/numbering stripped', () => {
    const raw = '1. First headline\n2. Second headline\n- Third headline';
    expect(parseItems(raw)).toEqual(['First headline', 'Second headline', 'Third headline']);
  });

  it('de-duplicates case-insensitively and trims whitespace', () => {
    expect(parseItems('{"items": ["  Imaging ", "imaging", "Other"]}')).toEqual(['Imaging', 'Other']);
  });
});

describe('filterValidItems', () => {
  it('drops over-limit headlines and existing duplicates', () => {
    const items = ['Good Headline', 'x'.repeat(40), 'Existing One', 'Another Good One'];
    const result = filterValidItems(items, 'headline', ['Existing One']);
    expect(result).toContain('Good Headline');
    expect(result).toContain('Another Good One');
    expect(result).not.toContain('Existing One');
    expect(result.some((i) => i.length > 30)).toBe(false);
  });

  it('respects the 90-char description limit', () => {
    const items = ['Short description.', 'y'.repeat(95)];
    expect(filterValidItems(items, 'description', [])).toEqual(['Short description.']);
  });
});

describe('buildPrompt', () => {
  it('includes the char limit, count, and context signals', () => {
    const prompt = buildPrompt(
      { keywords: ['clinical imaging'], theme: 'Imaging', searchIntent: 'Centralize data', context: 'For trial teams' },
      'headline',
      8,
    );
    expect(prompt).toContain('30 characters or fewer');
    expect(prompt).toContain('8 distinct');
    expect(prompt).toContain('Imaging');
    expect(prompt).toContain('clinical imaging');
    expect(prompt).toContain('"items"');
  });
});

describe('isAiConfigured', () => {
  it('is true only with a key and model', () => {
    expect(isAiConfigured({ provider: 'anthropic', apiKey: 'sk-x', model: 'claude-opus-4-8' })).toBe(true);
    expect(isAiConfigured({ provider: 'anthropic', apiKey: '', model: 'claude-opus-4-8' })).toBe(false);
    expect(isAiConfigured(null)).toBe(false);
  });
});
