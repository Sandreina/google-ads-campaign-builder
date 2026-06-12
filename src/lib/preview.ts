import type { AdAsset, AdGroup } from '@/types';
import { activeValidAssets } from './validation';

export interface AdCombination {
  headlines: AdAsset[];
  descriptions: AdAsset[];
}

/**
 * Pick assets honoring pin positions. Pinned assets are placed in their slot;
 * remaining slots are filled in order. Avoids empty, duplicate, inactive, and
 * over-limit assets (filtered by {@link activeValidAssets}).
 *
 * `offset` rotates the unpinned pool so callers can step through combinations.
 */
function pickForSlots(assets: AdAsset[], slots: number, offset: number): AdAsset[] {
  const valid = activeValidAssets(assets);
  const result: (AdAsset | null)[] = new Array(slots).fill(null);

  // Place pinned assets first. A pin to slot N (1-based) claims index N-1.
  const pinned = valid.filter((a) => a.pinPosition && a.pinPosition >= 1 && a.pinPosition <= slots);
  const usedIds = new Set<string>();
  for (const asset of pinned) {
    const idx = (asset.pinPosition as number) - 1;
    if (!result[idx]) {
      result[idx] = asset;
      usedIds.add(asset.id);
    }
  }

  // Fill remaining slots from the unpinned pool, rotated by offset.
  const pool = valid.filter((a) => !usedIds.has(a.id));
  if (pool.length > 0) {
    let poolCursor = offset % pool.length;
    for (let i = 0; i < slots; i++) {
      if (result[i]) continue;
      // find next unused pool asset
      let guard = 0;
      while (guard < pool.length) {
        const candidate = pool[poolCursor % pool.length];
        poolCursor += 1;
        guard += 1;
        if (!usedIds.has(candidate.id)) {
          result[i] = candidate;
          usedIds.add(candidate.id);
          break;
        }
      }
    }
  }

  return result.filter((a): a is AdAsset => a !== null);
}

/**
 * Generate a single ad combination. RSA previews show up to 3 headlines and 2
 * descriptions. `offset` lets the caller cycle to the "next" combination.
 */
export function generateCombination(adGroup: AdGroup, offset = 0): AdCombination {
  return {
    headlines: pickForSlots(adGroup.headlines, 3, offset),
    descriptions: pickForSlots(adGroup.descriptions, 2, offset),
  };
}

/** The recommended combination is simply offset 0 (pins respected, asset order). */
export function recommendedCombination(adGroup: AdGroup): AdCombination {
  return generateCombination(adGroup, 0);
}

/**
 * How many distinct combinations are meaningfully available. Bounded by the
 * size of the larger unpinned pool so the "next" control eventually loops.
 */
export function combinationCount(adGroup: AdGroup): number {
  const validH = activeValidAssets(adGroup.headlines).length;
  const validD = activeValidAssets(adGroup.descriptions).length;
  return Math.max(1, Math.max(validH, validD));
}
