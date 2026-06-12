import { describe, it, expect } from 'vitest';
import {
  validateAsset,
  findDuplicateTexts,
  validatePath,
  isValidUrl,
  buildValidationSummary,
  findPinConflicts,
  activeValidAssets,
} from './validation';
import type { AdAsset, CampaignProposal } from '@/types';

function asset(partial: Partial<AdAsset>): AdAsset {
  return {
    id: partial.id ?? 'a1',
    type: partial.type ?? 'headline',
    text: partial.text ?? 'Text',
    order: partial.order ?? 0,
    pinPosition: partial.pinPosition ?? null,
    active: partial.active ?? true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('validateAsset', () => {
  it('flags empty assets', () => {
    expect(validateAsset(asset({ text: '   ' })).state).toBe('empty');
  });
  it('flags over-limit headlines', () => {
    const v = validateAsset(asset({ text: 'x'.repeat(31) }));
    expect(v.state).toBe('over_limit');
    expect(v.overLimit).toBe(true);
  });
  it('flags near-limit headlines', () => {
    const v = validateAsset(asset({ text: 'x'.repeat(29) }));
    expect(v.state).toBe('near_limit');
  });
  it('returns valid for normal headlines', () => {
    expect(validateAsset(asset({ text: 'Clinical Trial Imaging' })).state).toBe('valid');
  });
  it('respects description limit of 90', () => {
    const v = validateAsset(asset({ type: 'description', text: 'x'.repeat(91) }));
    expect(v.state).toBe('over_limit');
  });
  it('flags inactive assets', () => {
    expect(validateAsset(asset({ active: false })).state).toBe('inactive');
  });
  it('flags duplicates when told', () => {
    expect(validateAsset(asset({}), { duplicate: true }).state).toBe('duplicate');
  });
});

describe('findDuplicateTexts', () => {
  it('finds case-insensitive duplicates', () => {
    const dupes = findDuplicateTexts([{ text: 'Imaging' }, { text: 'imaging' }, { text: 'Other' }]);
    expect(dupes.has('imaging')).toBe(true);
    expect(dupes.has('other')).toBe(false);
  });
});

describe('validatePath', () => {
  it('rejects paths over 15 chars', () => {
    expect(validatePath('x'.repeat(16)).valid).toBe(false);
  });
  it('rejects paths with spaces', () => {
    expect(validatePath('two words').valid).toBe(false);
  });
  it('allows valid short paths', () => {
    expect(validatePath('imaging').valid).toBe(true);
  });
});

describe('isValidUrl', () => {
  it('accepts https urls', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true);
  });
  it('rejects garbage', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('findPinConflicts', () => {
  it('detects two active assets pinned to the same slot', () => {
    const conflicts = findPinConflicts([
      asset({ id: 'a', pinPosition: 1 }),
      asset({ id: 'b', pinPosition: 1 }),
      asset({ id: 'c', pinPosition: 2 }),
    ]);
    expect(conflicts).toEqual([1]);
  });
  it('ignores inactive pinned assets', () => {
    const conflicts = findPinConflicts([
      asset({ id: 'a', pinPosition: 1 }),
      asset({ id: 'b', pinPosition: 1, active: false }),
    ]);
    expect(conflicts).toEqual([]);
  });
});

describe('activeValidAssets', () => {
  it('excludes inactive, empty, over-limit, and duplicate assets', () => {
    const assets = [
      asset({ id: 'a', text: 'Valid One', order: 0 }),
      asset({ id: 'b', text: '', order: 1 }),
      asset({ id: 'c', text: 'x'.repeat(40), order: 2 }),
      asset({ id: 'd', text: 'Inactive', order: 3, active: false }),
      asset({ id: 'e', text: 'Valid One', order: 4 }), // duplicate of a
      asset({ id: 'f', text: 'Valid Two', order: 5 }),
    ];
    const result = activeValidAssets(assets);
    const ids = result.map((a) => a.id);
    expect(ids).toContain('a');
    expect(ids).toContain('f');
    expect(ids).not.toContain('b');
    expect(ids).not.toContain('c');
    expect(ids).not.toContain('d');
    expect(ids).not.toContain('e'); // duplicate dropped, first kept
  });
});

describe('buildValidationSummary', () => {
  const campaign: CampaignProposal = {
    id: 'c1',
    version: 1,
    clientName: 'Client',
    campaignName: 'Campaign',
    campaignType: 'Google Search',
    locations: ['US'],
    languages: ['English'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    adGroups: [
      {
        id: 'ag1',
        name: 'Group',
        finalUrl: 'not-a-url',
        keywords: [],
        negativeKeywords: [],
        headlines: [asset({ id: 'h1', text: 'x'.repeat(40) })],
        descriptions: [],
      },
    ],
  };

  it('reports invalid urls, over-limit assets, and missing assets', () => {
    const issues = buildValidationSummary(campaign, 0);
    const categories = issues.map((i) => i.category);
    expect(categories).toContain('Invalid URLs');
    expect(categories).toContain('Assets over character limits');
    expect(categories).toContain('Missing assets');
  });

  it('includes unresolved change request issues', () => {
    const issues = buildValidationSummary(campaign, 2);
    expect(issues.some((i) => i.category === 'Unresolved client revision requests')).toBe(true);
  });
});
