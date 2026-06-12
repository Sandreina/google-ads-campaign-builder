import { RSA_LIMITS, NEAR_LIMIT_THRESHOLD } from './constants';
import type { AdAsset, AdGroup, AssetType, CampaignProposal } from '@/types';

export type AssetValidationState =
  | 'valid'
  | 'near_limit'
  | 'over_limit'
  | 'duplicate'
  | 'empty'
  | 'inactive';

export interface AssetValidation {
  state: AssetValidationState;
  charCount: number;
  maxChars: number;
  /** True when text exceeds the character limit. */
  overLimit: boolean;
  message: string;
}

export function maxCharsFor(type: AssetType): number {
  return type === 'headline' ? RSA_LIMITS.headlineMaxChars : RSA_LIMITS.descriptionMaxChars;
}

/**
 * Validate a single asset. `duplicate` is supplied by the caller because it
 * requires comparison against sibling assets.
 */
export function validateAsset(asset: AdAsset, opts?: { duplicate?: boolean }): AssetValidation {
  const maxChars = maxCharsFor(asset.type);
  const charCount = asset.text.trim().length;

  if (charCount === 0) {
    return { state: 'empty', charCount, maxChars, overLimit: false, message: 'Empty asset' };
  }
  if (charCount > maxChars) {
    return {
      state: 'over_limit',
      charCount,
      maxChars,
      overLimit: true,
      message: `${charCount} / ${maxChars} — over limit`,
    };
  }
  if (opts?.duplicate) {
    return { state: 'duplicate', charCount, maxChars, overLimit: false, message: 'Duplicate text' };
  }
  if (!asset.active) {
    return { state: 'inactive', charCount, maxChars, overLimit: false, message: 'Inactive' };
  }
  if (charCount > maxChars - NEAR_LIMIT_THRESHOLD) {
    return {
      state: 'near_limit',
      charCount,
      maxChars,
      overLimit: false,
      message: `${charCount} / ${maxChars} — near limit`,
    };
  }
  return { state: 'valid', charCount, maxChars, overLimit: false, message: `${charCount} / ${maxChars}` };
}

/** Returns the set of normalized text values that appear more than once. */
export function findDuplicateTexts(assets: Pick<AdAsset, 'text'>[]): Set<string> {
  const counts = new Map<string, number>();
  for (const a of assets) {
    const key = a.text.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) dupes.add(key);
  }
  return dupes;
}

export function isDuplicateText(text: string, dupeSet: Set<string>): boolean {
  return dupeSet.has(text.trim().toLowerCase());
}

export function validatePath(path: string | undefined): { valid: boolean; message: string } {
  const value = (path ?? '').trim();
  if (!value) return { valid: true, message: '' };
  if (value.length > RSA_LIMITS.pathMaxChars) {
    return { valid: false, message: `Path exceeds ${RSA_LIMITS.pathMaxChars} characters` };
  }
  if (/[\s/]/.test(value)) {
    return { valid: false, message: 'Paths cannot contain spaces or slashes' };
  }
  return { valid: true, message: '' };
}

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  category: string;
  adGroupId?: string;
  adGroupName?: string;
  message: string;
}

/** Detects pin conflicts: more than one active headline pinned to the same slot. */
export function findPinConflicts(assets: AdAsset[]): number[] {
  const counts = new Map<number, number>();
  for (const a of assets) {
    if (a.active && a.pinPosition) {
      counts.set(a.pinPosition, (counts.get(a.pinPosition) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([pos]) => pos);
}

/** Build a campaign-wide validation summary. */
export function buildValidationSummary(
  campaign: CampaignProposal,
  unresolvedChangeRequests: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const ag of campaign.adGroups) {
    const ctx = { adGroupId: ag.id, adGroupName: ag.name };

    if (!isValidUrl(ag.finalUrl)) {
      issues.push({
        id: `${ag.id}-url`,
        severity: 'error',
        category: 'Invalid URLs',
        ...ctx,
        message: `"${ag.name}" has an invalid final URL`,
      });
    }
    for (const p of [ag.path1, ag.path2]) {
      const pv = validatePath(p);
      if (!pv.valid) {
        issues.push({
          id: `${ag.id}-path-${p}`,
          severity: 'warning',
          category: 'Invalid URLs',
          ...ctx,
          message: `"${ag.name}": ${pv.message}`,
        });
      }
    }

    const activeHeadlines = ag.headlines.filter((h) => h.active);
    const activeDescriptions = ag.descriptions.filter((d) => d.active);

    if (activeHeadlines.length < RSA_LIMITS.minHeadlines) {
      issues.push({
        id: `${ag.id}-few-headlines`,
        severity: 'warning',
        category: 'Ad groups with too few assets',
        ...ctx,
        message: `"${ag.name}" has only ${activeHeadlines.length} active headlines (recommended ${RSA_LIMITS.minHeadlines}+)`,
      });
    }
    if (activeDescriptions.length < RSA_LIMITS.minDescriptions) {
      issues.push({
        id: `${ag.id}-few-descriptions`,
        severity: 'warning',
        category: 'Ad groups with too few assets',
        ...ctx,
        message: `"${ag.name}" has only ${activeDescriptions.length} active descriptions (recommended ${RSA_LIMITS.minDescriptions}+)`,
      });
    }
    if (ag.headlines.length === 0 || ag.descriptions.length === 0) {
      issues.push({
        id: `${ag.id}-missing`,
        severity: 'error',
        category: 'Missing assets',
        ...ctx,
        message: `"${ag.name}" is missing ${ag.headlines.length === 0 ? 'headlines' : 'descriptions'}`,
      });
    }

    for (const asset of [...ag.headlines, ...ag.descriptions]) {
      const v = validateAsset(asset);
      if (v.overLimit) {
        issues.push({
          id: `${asset.id}-over`,
          severity: 'error',
          category: 'Assets over character limits',
          ...ctx,
          message: `"${ag.name}" ${asset.type} ${v.charCount}/${v.maxChars} characters`,
        });
      }
    }

    const headlineDupes = findDuplicateTexts(ag.headlines);
    const descDupes = findDuplicateTexts(ag.descriptions);
    if (headlineDupes.size > 0 || descDupes.size > 0) {
      issues.push({
        id: `${ag.id}-dupes`,
        severity: 'warning',
        category: 'Duplicate assets',
        ...ctx,
        message: `"${ag.name}" has duplicate ${headlineDupes.size > 0 ? 'headlines' : 'descriptions'}`,
      });
    }

    const hConflicts = findPinConflicts(ag.headlines);
    const dConflicts = findPinConflicts(ag.descriptions);
    if (hConflicts.length > 0 || dConflicts.length > 0) {
      issues.push({
        id: `${ag.id}-pins`,
        severity: 'warning',
        category: 'Conflicting pins',
        ...ctx,
        message: `"${ag.name}" has multiple assets pinned to the same position`,
      });
    }
  }

  if (unresolvedChangeRequests > 0) {
    issues.push({
      id: 'unresolved-requests',
      severity: 'warning',
      category: 'Unresolved client revision requests',
      message: `${unresolvedChangeRequests} client change requests are unresolved`,
    });
  }

  return issues;
}

/** Group issues by their category for display. */
export function groupIssuesByCategory(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  const grouped: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    (grouped[issue.category] ??= []).push(issue);
  }
  return grouped;
}

/** Used by the preview generator and ad-group completion checks. */
export function activeValidAssets(assets: AdAsset[]): AdAsset[] {
  const dupes = findDuplicateTexts(assets);
  return assets
    .filter((a) => a.active)
    .filter((a) => a.text.trim().length > 0)
    .filter((a) => a.text.trim().length <= maxCharsFor(a.type))
    .filter((a) => !isDuplicateText(a.text, dupes) || sameTextFirstOccurrence(a, assets, dupes))
    .sort((a, b) => a.order - b.order);
}

/** Keep only the first occurrence of a duplicated text so previews never repeat. */
function sameTextFirstOccurrence(asset: AdAsset, all: AdAsset[], dupes: Set<string>): boolean {
  const key = asset.text.trim().toLowerCase();
  if (!dupes.has(key)) return true;
  const first = all
    .filter((a) => a.text.trim().toLowerCase() === key)
    .sort((a, b) => a.order - b.order)[0];
  return first?.id === asset.id;
}

export function adGroupAssetCounts(ag: AdGroup) {
  return {
    keywords: ag.keywords.length,
    activeKeywords: ag.keywords.filter((k) => k.active).length,
    headlines: ag.headlines.length,
    activeHeadlines: ag.headlines.filter((h) => h.active).length,
    descriptions: ag.descriptions.length,
    activeDescriptions: ag.descriptions.filter((d) => d.active).length,
  };
}
