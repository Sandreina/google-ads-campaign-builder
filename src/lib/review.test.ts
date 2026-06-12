import { describe, it, expect } from 'vitest';
import {
  emptyClientReview,
  computeAdGroupProgress,
  isAdGroupFullyApproved,
  computeCampaignProgress,
  reconcileReview,
} from './review';
import { buildDemoCampaign } from '@/data/demo';
import { AD_GROUP_CHECKLIST_ITEMS } from './constants';
import type { ClientReview } from '@/types';

function approveEverything(campaign = buildDemoCampaign()): { campaign: ReturnType<typeof buildDemoCampaign>; review: ClientReview } {
  const review = emptyClientReview(campaign);
  for (const ag of campaign.adGroups) {
    const agReview = review.adGroupReviews[ag.id];
    for (const asset of [...ag.headlines, ...ag.descriptions]) {
      if (!asset.active) continue;
      agReview.assetFeedback[asset.id] = { assetId: asset.id, status: 'approved', comment: '' };
    }
    agReview.keywordFeedback.status = 'approved';
    for (const item of AD_GROUP_CHECKLIST_ITEMS) {
      agReview.checklist[item.key] = true;
    }
    agReview.overallStatus = 'approved';
  }
  return { campaign, review };
}

describe('computeAdGroupProgress', () => {
  it('reports 0% for an untouched review', () => {
    const campaign = buildDemoCampaign();
    const review = emptyClientReview(campaign);
    const progress = computeAdGroupProgress(campaign.adGroups[0], review);
    expect(progress.percent).toBe(0);
    expect(progress.completedItems).toBe(0);
  });

  it('reports 100% when fully approved with checklist complete', () => {
    const { campaign, review } = approveEverything();
    const progress = computeAdGroupProgress(campaign.adGroups[0], review);
    expect(progress.percent).toBe(100);
  });

  it('counts approved and changes_requested as reviewed', () => {
    const campaign = buildDemoCampaign();
    const review = emptyClientReview(campaign);
    const ag = campaign.adGroups[0];
    const agReview = review.adGroupReviews[ag.id];
    agReview.assetFeedback[ag.headlines[0].id] = {
      assetId: ag.headlines[0].id,
      status: 'changes_requested',
      comment: 'fix',
    };
    const progress = computeAdGroupProgress(ag, review);
    expect(progress.headlines.changesRequested).toBe(1);
    expect(progress.completedItems).toBeGreaterThan(0);
  });
});

describe('isAdGroupFullyApproved', () => {
  it('is false when not everything is approved', () => {
    const campaign = buildDemoCampaign();
    const review = emptyClientReview(campaign);
    expect(isAdGroupFullyApproved(campaign.adGroups[0], review)).toBe(false);
  });

  it('is true only when assets, keywords, checklist, and overall status are approved', () => {
    const { campaign, review } = approveEverything();
    expect(isAdGroupFullyApproved(campaign.adGroups[0], review)).toBe(true);
  });

  it('is false if a single checklist item is incomplete', () => {
    const { campaign, review } = approveEverything();
    const agReview = review.adGroupReviews[campaign.adGroups[0].id];
    agReview.checklist.reviewedPreview = false;
    expect(isAdGroupFullyApproved(campaign.adGroups[0], review)).toBe(false);
  });

  it('is false if overall status is not approved even when assets are', () => {
    const { campaign, review } = approveEverything();
    const agReview = review.adGroupReviews[campaign.adGroups[0].id];
    agReview.overallStatus = 'pending';
    expect(isAdGroupFullyApproved(campaign.adGroups[0], review)).toBe(false);
  });
});

describe('computeCampaignProgress', () => {
  it('aggregates across all ad groups', () => {
    const { campaign, review } = approveEverything();
    const progress = computeCampaignProgress(campaign, review);
    expect(progress.percent).toBe(100);
    expect(progress.headlines.approved).toBeGreaterThan(0);
    expect(progress.adGroups.approved).toBe(campaign.adGroups.length);
  });

  it('counts outstanding comments', () => {
    const campaign = buildDemoCampaign();
    const review = emptyClientReview(campaign);
    const ag = campaign.adGroups[0];
    review.adGroupReviews[ag.id].generalComment = 'A note';
    review.adGroupReviews[ag.id].assetFeedback[ag.headlines[0].id] = {
      assetId: ag.headlines[0].id,
      status: 'changes_requested',
      comment: 'please revise',
    };
    const progress = computeCampaignProgress(campaign, review);
    expect(progress.outstandingComments).toBe(2);
  });
});

describe('reconcileReview', () => {
  it('adds review entries for new ad groups', () => {
    const campaign = buildDemoCampaign();
    const review = emptyClientReview(campaign);
    delete review.adGroupReviews[campaign.adGroups[1].id];
    const reconciled = reconcileReview(review, campaign);
    expect(reconciled.adGroupReviews[campaign.adGroups[1].id]).toBeDefined();
  });
});
