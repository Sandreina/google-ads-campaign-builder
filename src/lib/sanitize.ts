import type {
  CampaignProposal,
  ClientReview,
  ClientReviewPackage,
  InternalEditorData,
} from '@/types';
import { SCHEMA_VERSION } from './constants';
import { nowIso } from './utils';

/**
 * Produce a deep copy of a campaign proposal stripped of anything that could
 * leak internal data. The campaign proposal type itself holds no internal
 * notes (those live in {@link InternalEditorData}), but this clone guarantees
 * the client receives an isolated object and serves as the single sanitization
 * choke point.
 */
export function sanitizeCampaign(campaign: CampaignProposal): CampaignProposal {
  return {
    ...campaign,
    locations: [...campaign.locations],
    languages: [...campaign.languages],
    adGroups: campaign.adGroups.map((ag) => ({
      ...ag,
      keywords: ag.keywords.map((k) => ({ ...k })),
      negativeKeywords: ag.negativeKeywords.map((k) => ({ ...k })),
      headlines: ag.headlines.map((h) => ({
        ...h,
        revisionHistory: h.revisionHistory ? h.revisionHistory.map((r) => ({ ...r })) : undefined,
      })),
      descriptions: ag.descriptions.map((d) => ({
        ...d,
        revisionHistory: d.revisionHistory ? d.revisionHistory.map((r) => ({ ...r })) : undefined,
      })),
    })),
  };
}

/**
 * Build the sanitized client review package. Contains ONLY the campaign
 * proposal and the client review state — never {@link InternalEditorData}.
 */
export function buildClientReviewPackage(
  campaign: CampaignProposal,
  review: ClientReview,
): ClientReviewPackage {
  return {
    kind: 'client-review-package',
    schemaVersion: SCHEMA_VERSION,
    generatedAt: nowIso(),
    campaign: sanitizeCampaign(campaign),
    review: structuredCloneSafe(review),
  };
}

/**
 * Recursively scans an arbitrary object and asserts that no key associated with
 * internal data is present. Used by tests to guarantee sanitization.
 */
const FORBIDDEN_KEYS = [
  'campaignNote',
  'adGroupNotes',
  'keywordNotes',
  'assetNotes',
  'resolutionNotes',
  'resolvedFeedback',
  'internalNote',
  'internal',
];

export function containsInternalData(value: unknown): boolean {
  const seen = new Set<unknown>();
  function walk(node: unknown): boolean {
    if (node === null || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);
    if (Array.isArray(node)) return node.some(walk);
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.includes(key)) return true;
      if (walk(child)) return true;
    }
    return false;
  }
  return walk(value);
}

/** Asserts (for export paths) that the payload is free of internal data. */
export function assertNoInternalData(payload: unknown): void {
  if (containsInternalData(payload)) {
    throw new Error('Sanitization failed: payload contains internal editor data.');
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export type { InternalEditorData };
