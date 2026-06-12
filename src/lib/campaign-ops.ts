import type {
  AdAsset,
  AdGroup,
  AppPermissions,
  AssetType,
  CampaignProposal,
  Keyword,
  MatchType,
  ReviewStatus,
} from '@/types';
import { assertPermission } from './permissions';
import { generateId, nowIso } from './utils';

/* ------------------------------------------------------------------ */
/* Asset helpers                                                       */
/* ------------------------------------------------------------------ */

export function createAsset(type: AssetType, text: string, order: number): AdAsset {
  const ts = nowIso();
  return {
    id: generateId('asset'),
    type,
    text: text.trim(),
    order,
    pinPosition: null,
    active: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Re-sequence the `order` field of a list so it is contiguous from 0. */
export function renumberAssets(assets: AdAsset[]): AdAsset[] {
  return [...assets]
    .sort((a, b) => a.order - b.order)
    .map((asset, index) => (asset.order === index ? asset : { ...asset, order: index }));
}

/**
 * Move an asset from one index to another and renumber. Returns a new array.
 * Asset ids are preserved (stable) — only the `order` field changes.
 */
export function reorderAssets(assets: AdAsset[], fromIndex: number, toIndex: number): AdAsset[] {
  const sorted = [...assets].sort((a, b) => a.order - b.order);
  if (fromIndex < 0 || fromIndex >= sorted.length) return sorted;
  const clampedTo = Math.max(0, Math.min(toIndex, sorted.length - 1));
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(clampedTo, 0, moved);
  return sorted.map((asset, index) => ({ ...asset, order: index }));
}

export function moveAsset(
  assets: AdAsset[],
  assetId: string,
  direction: 'up' | 'down' | 'top' | 'bottom',
): AdAsset[] {
  const sorted = [...assets].sort((a, b) => a.order - b.order);
  const from = sorted.findIndex((a) => a.id === assetId);
  if (from === -1) return sorted;
  let to = from;
  if (direction === 'up') to = from - 1;
  else if (direction === 'down') to = from + 1;
  else if (direction === 'top') to = 0;
  else if (direction === 'bottom') to = sorted.length - 1;
  return reorderAssets(sorted, from, to);
}

/**
 * Replace an asset's text. When the asset had been reviewed already
 * (revisedAfterReview semantics handled by the store), the previous version is
 * preserved in revisionHistory and the asset is flagged as revised.
 */
export function reviseAssetText(
  asset: AdAsset,
  newText: string,
  opts: { wasReviewed: boolean; previousStatus?: ReviewStatus },
): AdAsset {
  const trimmed = newText.trim();
  if (trimmed === asset.text) return asset;
  const base: AdAsset = { ...asset, text: trimmed, updatedAt: nowIso() };
  if (opts.wasReviewed) {
    base.revisedAfterReview = true;
    base.revisionHistory = [
      ...(asset.revisionHistory ?? []),
      {
        text: asset.text,
        pinPosition: asset.pinPosition,
        active: asset.active,
        revisedAt: nowIso(),
        previousStatus: opts.previousStatus,
      },
    ];
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Ad group + campaign helpers                                         */
/* ------------------------------------------------------------------ */

export function createAdGroup(name: string): AdGroup {
  return {
    id: generateId('ag'),
    name,
    theme: '',
    searchIntent: '',
    finalUrl: 'https://example.com',
    path1: '',
    path2: '',
    clientFacingContext: '',
    keywords: [],
    negativeKeywords: [],
    headlines: [],
    descriptions: [],
  };
}

/** Duplicate an ad group with brand-new stable ids for every nested asset. */
export function duplicateAdGroup(source: AdGroup): AdGroup {
  const ts = nowIso();
  const cloneAsset = (a: AdAsset): AdAsset => ({
    ...a,
    id: generateId('asset'),
    createdAt: ts,
    updatedAt: ts,
    revisedAfterReview: false,
    revisionHistory: undefined,
  });
  const cloneKeyword = (k: Keyword): Keyword => ({ ...k, id: generateId('kw') });
  return {
    ...source,
    id: generateId('ag'),
    name: `${source.name} (copy)`,
    keywords: source.keywords.map(cloneKeyword),
    negativeKeywords: source.negativeKeywords.map(cloneKeyword),
    headlines: source.headlines.map(cloneAsset),
    descriptions: source.descriptions.map(cloneAsset),
  };
}

export function createKeyword(text: string, matchType: MatchType): Keyword {
  return { id: generateId('kw'), text: text.trim(), matchType, active: true };
}

/* ------------------------------------------------------------------ */
/* Permission-checked campaign mutations                               */
/* ------------------------------------------------------------------ */

/**
 * Apply an updater to an ad group within a campaign, returning a new campaign.
 * Requires the caller to pass a permission the change needs; throws when not
 * permitted. This is the choke point every ad-group edit flows through.
 */
export function updateAdGroup(
  campaign: CampaignProposal,
  permissions: AppPermissions,
  permission: keyof AppPermissions,
  adGroupId: string,
  updater: (ag: AdGroup) => AdGroup,
): CampaignProposal {
  assertPermission(permissions, permission);
  return {
    ...campaign,
    updatedAt: nowIso(),
    adGroups: campaign.adGroups.map((ag) => (ag.id === adGroupId ? updater(ag) : ag)),
  };
}

export function updateCampaignFields(
  campaign: CampaignProposal,
  permissions: AppPermissions,
  fields: Partial<CampaignProposal>,
): CampaignProposal {
  assertPermission(permissions, 'canEditCampaign');
  return { ...campaign, ...fields, updatedAt: nowIso() };
}

export function addAdGroup(
  campaign: CampaignProposal,
  permissions: AppPermissions,
  name: string,
): { campaign: CampaignProposal; adGroup: AdGroup } {
  assertPermission(permissions, 'canEditAdGroups');
  const adGroup = createAdGroup(name);
  return {
    campaign: { ...campaign, updatedAt: nowIso(), adGroups: [...campaign.adGroups, adGroup] },
    adGroup,
  };
}

export function removeAdGroup(
  campaign: CampaignProposal,
  permissions: AppPermissions,
  adGroupId: string,
): CampaignProposal {
  assertPermission(permissions, 'canDeleteContent');
  return {
    ...campaign,
    updatedAt: nowIso(),
    adGroups: campaign.adGroups.filter((ag) => ag.id !== adGroupId),
  };
}

export function reorderAdGroups(
  campaign: CampaignProposal,
  permissions: AppPermissions,
  fromIndex: number,
  toIndex: number,
): CampaignProposal {
  assertPermission(permissions, 'canEditAdGroups');
  const next = [...campaign.adGroups];
  const clampedTo = Math.max(0, Math.min(toIndex, next.length - 1));
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return { ...campaign, updatedAt: nowIso(), adGroups: next };
}
