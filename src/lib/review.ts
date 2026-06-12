import type {
  AdAsset,
  AdGroup,
  AdGroupReview,
  AssetFeedback,
  CampaignProposal,
  ClientReview,
  ReviewStatus,
} from '@/types';
import { AD_GROUP_CHECKLIST_ITEMS } from './constants';
import { generateId, nowIso } from './utils';

export function emptyAdGroupReview(adGroupId: string): AdGroupReview {
  return {
    adGroupId,
    assetFeedback: {},
    keywordFeedback: {
      status: 'pending',
      generalComment: '',
      flaggedKeywordIds: [],
      keywordComments: {},
    },
    checklist: {
      reviewedTheme: false,
      reviewedKeywords: false,
      reviewedLandingPage: false,
      reviewedHeadlines: false,
      reviewedDescriptions: false,
      reviewedPreview: false,
    },
    generalComment: '',
    overallStatus: 'pending',
  };
}

export function emptyClientReview(campaign: CampaignProposal): ClientReview {
  const adGroupReviews: Record<string, AdGroupReview> = {};
  for (const ag of campaign.adGroups) {
    adGroupReviews[ag.id] = emptyAdGroupReview(ag.id);
  }
  return {
    id: generateId('review'),
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    adGroupReviews,
    campaignChecklist: {},
    campaignStatus: 'pending',
    finalComment: '',
    updatedAt: nowIso(),
  };
}

/** Ensure a review has an entry for every current ad group (after structure changes). */
export function reconcileReview(review: ClientReview, campaign: CampaignProposal): ClientReview {
  const adGroupReviews = { ...review.adGroupReviews };
  let changed = false;
  for (const ag of campaign.adGroups) {
    if (!adGroupReviews[ag.id]) {
      adGroupReviews[ag.id] = emptyAdGroupReview(ag.id);
      changed = true;
    }
  }
  return changed ? { ...review, adGroupReviews } : review;
}

export function getAssetFeedback(review: AdGroupReview, assetId: string): AssetFeedback {
  return (
    review.assetFeedback[assetId] ?? {
      assetId,
      status: 'pending',
      comment: '',
    }
  );
}

export interface StatusCounts {
  total: number;
  approved: number;
  pending: number;
  changesRequested: number;
}

export function emptyCounts(): StatusCounts {
  return { total: 0, approved: 0, pending: 0, changesRequested: 0 };
}

function tally(counts: StatusCounts, status: ReviewStatus): void {
  counts.total += 1;
  if (status === 'approved') counts.approved += 1;
  else if (status === 'changes_requested') counts.changesRequested += 1;
  else counts.pending += 1;
}

/** Count active assets of a type by their review status. */
export function assetStatusCounts(
  assets: AdAsset[],
  agReview: AdGroupReview | undefined,
): StatusCounts {
  const counts = emptyCounts();
  for (const asset of assets) {
    if (!asset.active) continue;
    const status = agReview?.assetFeedback[asset.id]?.status ?? 'pending';
    tally(counts, status);
  }
  return counts;
}

export interface AdGroupProgress {
  headlines: StatusCounts;
  descriptions: StatusCounts;
  keywordStatus: ReviewStatus;
  checklistComplete: number;
  checklistTotal: number;
  /** Total reviewable items (assets + keyword section + checklist items). */
  totalItems: number;
  completedItems: number;
  percent: number;
  overallStatus: ReviewStatus;
}

export function computeAdGroupProgress(
  adGroup: AdGroup,
  review: ClientReview,
): AdGroupProgress {
  const agReview = review.adGroupReviews[adGroup.id];
  const headlines = assetStatusCounts(adGroup.headlines, agReview);
  const descriptions = assetStatusCounts(adGroup.descriptions, agReview);
  const keywordStatus = agReview?.keywordFeedback.status ?? 'pending';

  const checklistValues = AD_GROUP_CHECKLIST_ITEMS.map(
    (item) => agReview?.checklist[item.key] ?? false,
  );
  const checklistComplete = checklistValues.filter(Boolean).length;
  const checklistTotal = checklistValues.length;

  // Reviewable items: each active asset + keyword section + each checklist item.
  const assetItems = headlines.total + descriptions.total;
  const assetReviewed = headlines.approved + headlines.changesRequested +
    descriptions.approved + descriptions.changesRequested;
  const keywordReviewed = keywordStatus !== 'pending' ? 1 : 0;

  const totalItems = assetItems + 1 /* keyword section */ + checklistTotal;
  const completedItems = assetReviewed + keywordReviewed + checklistComplete;
  const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return {
    headlines,
    descriptions,
    keywordStatus,
    checklistComplete,
    checklistTotal,
    totalItems,
    completedItems,
    percent,
    overallStatus: agReview?.overallStatus ?? 'pending',
  };
}

/**
 * An ad group is fully approved only when: keyword section approved, all active
 * headlines approved, all active descriptions approved, all checklist items
 * complete, and the overall status is approved.
 */
export function isAdGroupFullyApproved(adGroup: AdGroup, review: ClientReview): boolean {
  const agReview = review.adGroupReviews[adGroup.id];
  if (!agReview) return false;
  if (agReview.overallStatus !== 'approved') return false;
  if (agReview.keywordFeedback.status !== 'approved') return false;

  const activeHeadlines = adGroup.headlines.filter((h) => h.active);
  const activeDescriptions = adGroup.descriptions.filter((d) => d.active);
  const allApproved = [...activeHeadlines, ...activeDescriptions].every(
    (a) => agReview.assetFeedback[a.id]?.status === 'approved',
  );
  if (!allApproved) return false;

  const checklistComplete = AD_GROUP_CHECKLIST_ITEMS.every(
    (item) => agReview.checklist[item.key],
  );
  return checklistComplete;
}

export interface CampaignProgress {
  headlines: StatusCounts;
  descriptions: StatusCounts;
  keywordSections: StatusCounts;
  adGroups: StatusCounts;
  totalItems: number;
  completedItems: number;
  percent: number;
  outstandingComments: number;
}

export function computeCampaignProgress(
  campaign: CampaignProposal,
  review: ClientReview,
): CampaignProgress {
  const headlines = emptyCounts();
  const descriptions = emptyCounts();
  const keywordSections = emptyCounts();
  const adGroups = emptyCounts();
  let outstandingComments = 0;

  for (const ag of campaign.adGroups) {
    const agReview = review.adGroupReviews[ag.id];
    const h = assetStatusCounts(ag.headlines, agReview);
    const d = assetStatusCounts(ag.descriptions, agReview);
    mergeCounts(headlines, h);
    mergeCounts(descriptions, d);
    tallyStatus(keywordSections, agReview?.keywordFeedback.status ?? 'pending');
    tallyStatus(adGroups, agReview?.overallStatus ?? 'pending');

    if (agReview) {
      if (agReview.generalComment.trim()) outstandingComments += 1;
      outstandingComments += Object.values(agReview.assetFeedback).filter((f) =>
        f.comment.trim(),
      ).length;
      if (agReview.keywordFeedback.generalComment.trim()) outstandingComments += 1;
      outstandingComments += Object.values(agReview.keywordFeedback.keywordComments).filter(
        (c) => c.trim(),
      ).length;
    }
  }

  const totalItems =
    headlines.total + descriptions.total + keywordSections.total + adGroups.total;
  const completedItems =
    headlines.approved + headlines.changesRequested +
    descriptions.approved + descriptions.changesRequested +
    keywordSections.approved + keywordSections.changesRequested +
    adGroups.approved + adGroups.changesRequested;
  const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return {
    headlines,
    descriptions,
    keywordSections,
    adGroups,
    totalItems,
    completedItems,
    percent,
    outstandingComments,
  };
}

function mergeCounts(target: StatusCounts, source: StatusCounts): void {
  target.total += source.total;
  target.approved += source.approved;
  target.pending += source.pending;
  target.changesRequested += source.changesRequested;
}

function tallyStatus(counts: StatusCounts, status: ReviewStatus): void {
  tally(counts, status);
}

/** Count unresolved change requests across the whole campaign. */
export function countUnresolvedChangeRequests(
  campaign: CampaignProposal,
  review: ClientReview,
  resolved: Record<string, boolean>,
): number {
  let count = 0;
  for (const ag of campaign.adGroups) {
    const agReview = review.adGroupReviews[ag.id];
    if (!agReview) continue;
    for (const f of Object.values(agReview.assetFeedback)) {
      if (f.status === 'changes_requested' && !resolved[f.assetId]) count += 1;
    }
    if (
      agReview.keywordFeedback.status === 'changes_requested' &&
      !resolved[`kw-${ag.id}`]
    ) {
      count += 1;
    }
  }
  return count;
}
