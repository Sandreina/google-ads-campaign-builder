import type { AdAsset, CampaignProposal, InternalEditorData, Keyword, ProjectBundle } from '@/types';
import { generateId, nowIso } from './utils';
import { emptyClientReview } from './review';

export interface NewProjectFields {
  clientName: string;
  campaignName: string;
  accountName?: string;
  objective?: string;
  campaignType?: string;
  budget?: number;
  budgetPeriod?: 'daily' | 'monthly';
  biddingStrategy?: string;
  locations?: string[];
  languages?: string[];
}

/** Build an empty project (campaign with no ad groups) ready for editing. */
export function createBlankProject(fields: NewProjectFields): ProjectBundle {
  const ts = nowIso();
  const campaign: CampaignProposal = {
    id: generateId('campaign'),
    version: 1,
    clientName: fields.clientName.trim() || 'New Client',
    accountName: fields.accountName?.trim() || undefined,
    campaignName: fields.campaignName.trim() || 'New Campaign',
    objective: fields.objective?.trim() || undefined,
    campaignType: fields.campaignType?.trim() || 'Google Search',
    budget: fields.budget,
    budgetPeriod: fields.budgetPeriod ?? 'daily',
    biddingStrategy: fields.biddingStrategy?.trim() || 'Maximize Conversions',
    locations: fields.locations?.length ? fields.locations : ['United States'],
    languages: fields.languages?.length ? fields.languages : ['English'],
    adGroups: [],
    createdAt: ts,
    updatedAt: ts,
  };
  const internal: InternalEditorData = {
    campaignId: campaign.id,
    campaignNote: '',
    adGroupNotes: {},
    keywordNotes: {},
    assetNotes: {},
    resolutionNotes: {},
    resolvedFeedback: {},
  };
  return { campaign, review: emptyClientReview(campaign), internal };
}

/**
 * Deep-duplicate a campaign with brand-new stable IDs for the campaign and every
 * nested ad group, asset, and keyword. Produces a fresh empty review/internal so
 * the copy starts unreviewed.
 */
export function duplicateProject(campaign: CampaignProposal): ProjectBundle {
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

  const copy: CampaignProposal = {
    ...campaign,
    id: generateId('campaign'),
    version: 1,
    campaignName: `${campaign.campaignName} (copy)`,
    locations: [...campaign.locations],
    languages: [...campaign.languages],
    createdAt: ts,
    updatedAt: ts,
    adGroups: campaign.adGroups.map((ag) => ({
      ...ag,
      id: generateId('ag'),
      keywords: ag.keywords.map(cloneKeyword),
      negativeKeywords: ag.negativeKeywords.map(cloneKeyword),
      headlines: ag.headlines.map(cloneAsset),
      descriptions: ag.descriptions.map(cloneAsset),
    })),
  };

  const internal: InternalEditorData = {
    campaignId: copy.id,
    campaignNote: '',
    adGroupNotes: {},
    keywordNotes: {},
    assetNotes: {},
    resolutionNotes: {},
    resolvedFeedback: {},
  };
  return { campaign: copy, review: emptyClientReview(copy), internal };
}
