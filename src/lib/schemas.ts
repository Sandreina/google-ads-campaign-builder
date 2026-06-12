import { z } from 'zod';

export const matchTypeSchema = z.enum(['broad', 'phrase', 'exact']);
export const reviewStatusSchema = z.enum(['pending', 'approved', 'changes_requested']);
export const campaignReviewStatusSchema = z.enum([
  'pending',
  'approved',
  'approved_with_comments',
  'changes_requested',
]);

export const assetRevisionSchema = z.object({
  text: z.string(),
  pinPosition: z.number().nullable().optional(),
  active: z.boolean(),
  revisedAt: z.string(),
  previousStatus: reviewStatusSchema.optional(),
});

export const adAssetSchema = z.object({
  id: z.string(),
  type: z.enum(['headline', 'description']),
  text: z.string(),
  order: z.number(),
  pinPosition: z.number().nullable().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  revisedAfterReview: z.boolean().optional(),
  revisionHistory: z.array(assetRevisionSchema).optional(),
});

export const keywordSchema = z.object({
  id: z.string(),
  text: z.string(),
  matchType: matchTypeSchema,
  active: z.boolean(),
  label: z.string().optional(),
});

export const adGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Ad group name is required'),
  theme: z.string().optional(),
  searchIntent: z.string().optional(),
  finalUrl: z.string(),
  path1: z.string().optional(),
  path2: z.string().optional(),
  clientFacingContext: z.string().optional(),
  keywords: z.array(keywordSchema),
  negativeKeywords: z.array(keywordSchema),
  headlines: z.array(adAssetSchema),
  descriptions: z.array(adAssetSchema),
});

export const campaignProposalSchema = z.object({
  id: z.string(),
  version: z.number(),
  clientName: z.string(),
  accountName: z.string().optional(),
  campaignName: z.string().min(1, 'Campaign name is required'),
  objective: z.string().optional(),
  campaignType: z.string(),
  budget: z.number().optional(),
  budgetPeriod: z.enum(['daily', 'monthly']).optional(),
  biddingStrategy: z.string().optional(),
  locations: z.array(z.string()),
  languages: z.array(z.string()),
  startDate: z.string().optional(),
  adGroups: z.array(adGroupSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const assetFeedbackSchema = z.object({
  assetId: z.string(),
  status: reviewStatusSchema,
  comment: z.string(),
  reviewerName: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const keywordSectionFeedbackSchema = z.object({
  status: reviewStatusSchema,
  generalComment: z.string(),
  flaggedKeywordIds: z.array(z.string()),
  keywordComments: z.record(z.string()),
});

export const adGroupReviewSchema = z.object({
  adGroupId: z.string(),
  assetFeedback: z.record(assetFeedbackSchema),
  keywordFeedback: keywordSectionFeedbackSchema,
  checklist: z.object({
    reviewedTheme: z.boolean(),
    reviewedKeywords: z.boolean(),
    reviewedLandingPage: z.boolean(),
    reviewedHeadlines: z.boolean(),
    reviewedDescriptions: z.boolean(),
    reviewedPreview: z.boolean(),
  }),
  generalComment: z.string(),
  overallStatus: reviewStatusSchema,
});

export const clientReviewSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignVersion: z.number(),
  reviewer: z
    .object({ name: z.string(), title: z.string().optional(), email: z.string().optional() })
    .optional(),
  adGroupReviews: z.record(adGroupReviewSchema),
  campaignChecklist: z.record(z.boolean()),
  campaignStatus: campaignReviewStatusSchema,
  finalComment: z.string(),
  submittedAt: z.string().optional(),
  updatedAt: z.string(),
});

export const internalEditorDataSchema = z.object({
  campaignId: z.string(),
  campaignNote: z.string().optional(),
  adGroupNotes: z.record(z.string()),
  keywordNotes: z.record(z.string()),
  assetNotes: z.record(z.string()),
  resolutionNotes: z.record(z.string()),
  resolvedFeedback: z.record(z.boolean()),
});

export const projectBundleSchema = z.object({
  campaign: campaignProposalSchema,
  review: clientReviewSchema,
  internal: internalEditorDataSchema,
});

export const clientReviewPackageSchema = z.object({
  kind: z.literal('client-review-package'),
  schemaVersion: z.number(),
  generatedAt: z.string(),
  campaign: campaignProposalSchema,
  review: clientReviewSchema,
});

export type ProjectBundleInput = z.infer<typeof projectBundleSchema>;
