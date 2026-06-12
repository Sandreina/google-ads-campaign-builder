/**
 * Core domain types for the Google Ads Campaign Review application.
 *
 * Three categories of data are kept strictly separate (see {@link CampaignProposal},
 * {@link ClientReview}, {@link InternalEditorData}). Client Review Mode may only ever
 * mutate {@link ClientReview}.
 */

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested';

export type CampaignReviewStatus =
  | 'pending'
  | 'approved'
  | 'approved_with_comments'
  | 'changes_requested';

export type MatchType = 'broad' | 'phrase' | 'exact';

export type AssetType = 'headline' | 'description';

/** A previous version of an asset, preserved when an asset is revised after review. */
export interface AssetRevision {
  text: string;
  pinPosition?: number | null;
  active: boolean;
  revisedAt: string;
  /** Review status the asset held at the time of this revision. */
  previousStatus?: ReviewStatus;
}

export interface AdAsset {
  id: string;
  type: AssetType;
  text: string;
  order: number;
  /** 1 | 2 | 3 for headlines, 1 | 2 for descriptions; null/undefined = unpinned. */
  pinPosition?: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** True when the asset was edited after a client had already reviewed it. */
  revisedAfterReview?: boolean;
  /** Prior versions, newest last. */
  revisionHistory?: AssetRevision[];
}

export interface Keyword {
  id: string;
  text: string;
  matchType: MatchType;
  active: boolean;
  label?: string;
}

export interface AdGroup {
  id: string;
  name: string;
  theme?: string;
  searchIntent?: string;
  finalUrl: string;
  path1?: string;
  path2?: string;
  clientFacingContext?: string;
  keywords: Keyword[];
  negativeKeywords: Keyword[];
  headlines: AdAsset[];
  descriptions: AdAsset[];
}

export type BudgetPeriod = 'daily' | 'monthly';

export interface CampaignProposal {
  id: string;
  version: number;
  clientName: string;
  accountName?: string;
  campaignName: string;
  objective?: string;
  campaignType: string;
  budget?: number;
  budgetPeriod?: BudgetPeriod;
  biddingStrategy?: string;
  locations: string[];
  languages: string[];
  startDate?: string;
  adGroups: AdGroup[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Client review data — the ONLY data Client Review Mode may mutate.  */
/* ------------------------------------------------------------------ */

export interface AssetFeedback {
  assetId: string;
  status: ReviewStatus;
  comment: string;
  reviewerName?: string;
  updatedAt?: string;
}

export interface KeywordSectionFeedback {
  status: ReviewStatus;
  generalComment: string;
  flaggedKeywordIds: string[];
  keywordComments: Record<string, string>;
}

export interface AdGroupChecklist {
  reviewedTheme: boolean;
  reviewedKeywords: boolean;
  reviewedLandingPage: boolean;
  reviewedHeadlines: boolean;
  reviewedDescriptions: boolean;
  reviewedPreview: boolean;
}

export interface AdGroupReview {
  adGroupId: string;
  assetFeedback: Record<string, AssetFeedback>;
  keywordFeedback: KeywordSectionFeedback;
  checklist: AdGroupChecklist;
  generalComment: string;
  overallStatus: ReviewStatus;
}

export interface ReviewerInfo {
  name: string;
  title?: string;
  email?: string;
}

export interface ClientReview {
  id: string;
  campaignId: string;
  campaignVersion: number;
  reviewer?: ReviewerInfo;
  adGroupReviews: Record<string, AdGroupReview>;
  campaignChecklist: Record<string, boolean>;
  campaignStatus: CampaignReviewStatus;
  finalComment: string;
  submittedAt?: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Internal editor data — NEVER exposed to the client.               */
/* ------------------------------------------------------------------ */

export interface InternalEditorData {
  campaignId: string;
  campaignNote?: string;
  adGroupNotes: Record<string, string>;
  keywordNotes: Record<string, string>;
  assetNotes: Record<string, string>;
  /** Keyed by `${assetId}` — editor's resolution note for a feedback item. */
  resolutionNotes: Record<string, string>;
  /** Feedback items the editor has marked resolved (asset ids / section keys). */
  resolvedFeedback: Record<string, boolean>;
}

/* ------------------------------------------------------------------ */
/* App-level types                                                    */
/* ------------------------------------------------------------------ */

export type AppMode = 'editor' | 'client';

export interface AppPermissions {
  canEditCampaign: boolean;
  canEditAdGroups: boolean;
  canEditKeywords: boolean;
  canEditAssets: boolean;
  canEditUrls: boolean;
  canReorderAssets: boolean;
  canManageInternalNotes: boolean;
  canImportData: boolean;
  canDeleteContent: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
  canAddClientComments: boolean;
  canSubmitReview: boolean;
}

/** Everything persisted for a single campaign project. */
export interface ProjectBundle {
  campaign: CampaignProposal;
  review: ClientReview;
  internal: InternalEditorData;
}

/** The sanitized package handed to a client. Contains no internal data. */
export interface ClientReviewPackage {
  kind: 'client-review-package';
  schemaVersion: number;
  generatedAt: string;
  campaign: CampaignProposal;
  review: ClientReview;
}
