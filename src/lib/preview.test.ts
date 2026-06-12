import { describe, it, expect } from 'vitest';
import { generateCombination, recommendedCombination, combinationCount } from './preview';
import { createAdGroup, createAsset } from './campaign-ops';
import type { AdGroup } from '@/types';

function buildGroup(): AdGroup {
  const ag = createAdGroup('Group');
  ag.headlines = [
    createAsset('headline', 'H1', 0),
    createAsset('headline', 'H2', 1),
    createAsset('headline', 'H3', 2),
    createAsset('headline', 'H4', 3),
    createAsset('headline', 'H5', 4),
  ];
  ag.descriptions = [
    createAsset('description', 'D1', 0),
    createAsset('description', 'D2', 1),
    createAsset('description', 'D3', 2),
  ];
  return ag;
}

describe('generateCombination', () => {
  it('returns up to 3 headlines and 2 descriptions', () => {
    const combo = generateCombination(buildGroup(), 0);
    expect(combo.headlines).toHaveLength(3);
    expect(combo.descriptions).toHaveLength(2);
  });

  it('never includes inactive assets', () => {
    const ag = buildGroup();
    ag.headlines[0].active = false;
    const combo = generateCombination(ag, 0);
    expect(combo.headlines.some((h) => h.text === 'H1')).toBe(false);
  });

  it('never includes over-limit assets', () => {
    const ag = buildGroup();
    ag.headlines[1].text = 'x'.repeat(50);
    const combo = generateCombination(ag, 0);
    expect(combo.headlines.some((h) => h.text.length > 30)).toBe(false);
  });

  it('never repeats the same asset within a combination', () => {
    const combo = generateCombination(buildGroup(), 2);
    const ids = combo.headlines.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('respects pinned positions', () => {
    const ag = buildGroup();
    ag.headlines[4].pinPosition = 1; // H5 pinned to position 1
    const combo = generateCombination(ag, 0);
    expect(combo.headlines[0].text).toBe('H5');
  });

  it('places a pin to position 2 in the second slot', () => {
    const ag = buildGroup();
    ag.headlines[3].pinPosition = 2; // H4 pinned to slot 2
    const combo = generateCombination(ag, 0);
    expect(combo.headlines[1].text).toBe('H4');
  });
});

describe('recommendedCombination', () => {
  it('is deterministic (offset 0)', () => {
    const ag = buildGroup();
    const a = recommendedCombination(ag);
    const b = recommendedCombination(ag);
    expect(a.headlines.map((h) => h.id)).toEqual(b.headlines.map((h) => h.id));
  });
});

describe('combinationCount', () => {
  it('reflects the larger valid pool', () => {
    expect(combinationCount(buildGroup())).toBe(5);
  });
});
