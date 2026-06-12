import { describe, it, expect } from 'vitest';
import { buildClientReviewPackage, containsInternalData, assertNoInternalData } from './sanitize';
import { feedbackToCsv } from './csv';
import { buildDemoProject } from '@/data/demo';

describe('internal note sanitization', () => {
  it('client review package never contains internal data', () => {
    const { campaign, review } = buildDemoProject();
    const pkg = buildClientReviewPackage(campaign, review);
    expect(containsInternalData(pkg)).toBe(false);
  });

  it('containsInternalData detects forbidden keys', () => {
    expect(containsInternalData({ foo: { campaignNote: 'secret' } })).toBe(true);
    expect(containsInternalData({ adGroupNotes: {} })).toBe(true);
    expect(containsInternalData({ resolutionNotes: {} })).toBe(true);
    expect(containsInternalData({ safe: 'value', nested: { also: 'safe' } })).toBe(false);
  });

  it('assertNoInternalData throws when internal data is present', () => {
    expect(() => assertNoInternalData({ internal: { campaignNote: 'x' } })).toThrow();
  });

  it('the full internal bundle does contain internal data (sanity check)', () => {
    const { internal } = buildDemoProject();
    expect(containsInternalData(internal)).toBe(true);
  });

  it('feedback CSV export contains no internal notes', () => {
    const { campaign, review, internal } = buildDemoProject();
    const csv = feedbackToCsv(campaign, review);
    // none of the internal note values should appear in the export
    const internalValues = [
      internal.campaignNote ?? '',
      ...Object.values(internal.adGroupNotes),
      ...Object.values(internal.assetNotes),
    ].filter(Boolean);
    for (const value of internalValues) {
      expect(csv).not.toContain(value);
    }
  });
});
