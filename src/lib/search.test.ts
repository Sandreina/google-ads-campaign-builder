import { describe, it, expect } from 'vitest';
import { searchCampaign } from './search';
import { buildDemoProject } from '@/data/demo';

describe('searchCampaign', () => {
  const { campaign, review, internal } = buildDemoProject();

  it('returns nothing for an empty query', () => {
    expect(searchCampaign(campaign, review, internal, '   ')).toEqual([]);
  });

  it('finds headlines by text', () => {
    const results = searchCampaign(campaign, review, internal, 'Centralize');
    expect(results.some((r) => r.kind === 'Headline')).toBe(true);
  });

  it('finds keywords and ad groups', () => {
    const results = searchCampaign(campaign, review, internal, 'oncology');
    expect(results.some((r) => r.kind === 'Ad group' || r.kind === 'Keyword')).toBe(true);
  });

  it('finds client comments', () => {
    const results = searchCampaign(campaign, review, internal, 'oncology studies');
    expect(results.some((r) => r.kind === 'Client comment')).toBe(true);
  });

  it('excludes internal notes unless includeInternal is set', () => {
    // The demo campaign note mentions "conservative".
    const withoutInternal = searchCampaign(campaign, review, internal, 'conservative', { includeInternal: false });
    expect(withoutInternal.some((r) => r.kind === 'Internal note')).toBe(false);

    const withInternal = searchCampaign(campaign, review, internal, 'conservative', { includeInternal: true });
    expect(withInternal.some((r) => r.kind === 'Internal note')).toBe(true);
  });

  it('respects the result limit', () => {
    const results = searchCampaign(campaign, review, internal, 'imaging', { includeInternal: true, limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
