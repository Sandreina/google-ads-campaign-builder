import type {
  AdAsset,
  AdGroup,
  CampaignProposal,
  ClientReview,
  InternalEditorData,
  Keyword,
  ProjectBundle,
} from '@/types';
import { generateId, nowIso } from '@/lib/utils';
import { emptyClientReview, emptyAdGroupReview } from '@/lib/review';

function mkAsset(type: 'headline' | 'description', text: string, order: number, pin?: number, active = true): AdAsset {
  const ts = nowIso();
  return {
    id: generateId('asset'),
    type,
    text,
    order,
    pinPosition: pin ?? null,
    active,
    createdAt: ts,
    updatedAt: ts,
  };
}

function mkKeyword(text: string, matchType: Keyword['matchType'], active = true): Keyword {
  return { id: generateId('kw'), text, matchType, active };
}

function buildAdGroups(): AdGroup[] {
  const imaging: AdGroup = {
    id: generateId('ag'),
    name: 'Clinical Trial Imaging',
    theme: 'Imaging data management for clinical trials',
    searchIntent: 'Research teams seeking to centralize and oversee imaging data across studies',
    finalUrl: 'https://example.com/clinical-trial-imaging',
    path1: 'imaging',
    path2: 'trials',
    clientFacingContext:
      'This ad group targets teams evaluating platforms to organize imaging data across complex studies.',
    keywords: [
      mkKeyword('clinical trial imaging', 'broad'),
      mkKeyword('clinical trial imaging software', 'phrase'),
      mkKeyword('imaging data management', 'phrase'),
      mkKeyword('clinical imaging platform', 'broad'),
      mkKeyword('trial imaging oversight', 'broad'),
      mkKeyword('medical imaging trial software', 'exact'),
      mkKeyword('centralized imaging data', 'phrase'),
      mkKeyword('imaging study management', 'broad'),
      mkKeyword('clinical imaging workflow', 'phrase'),
    ],
    negativeKeywords: [
      mkKeyword('free', 'broad'),
      mkKeyword('jobs', 'broad'),
      mkKeyword('definition', 'broad'),
    ],
    headlines: [
      mkAsset('headline', 'Clinical Trial Imaging', 0, 1),
      mkAsset('headline', 'Centralize Imaging Data', 1),
      mkAsset('headline', 'Improve Study Oversight', 2),
      mkAsset('headline', 'Built for Complex Trials', 3),
      mkAsset('headline', 'Streamline Trial Workflows', 4),
      mkAsset('headline', 'Explore Imaging Technology', 5),
      mkAsset('headline', 'One Platform for Imaging', 6),
      mkAsset('headline', 'Connect Imaging & Oversight', 7),
      mkAsset('headline', 'Request a Guided Demo', 8),
    ],
    descriptions: [
      mkAsset('description', 'Centralize clinical trial imaging workflows and improve visibility across your studies.', 0, 1),
      mkAsset('description', 'Support complex imaging studies with technology designed for clinical trial teams.', 1),
      mkAsset('description', 'Connect imaging data, workflows, and oversight in one centralized platform.', 2),
      mkAsset('description', 'Explore solutions designed to support efficient and consistent imaging trial execution.', 3),
    ],
  };

  const oncology: AdGroup = {
    id: generateId('ag'),
    name: 'Oncology Trials',
    theme: 'Imaging technology for oncology studies',
    searchIntent: 'Sponsors and CROs running oncology trials seeking specialized imaging support',
    finalUrl: 'https://example.com/oncology-trials',
    path1: 'oncology',
    path2: 'imaging',
    clientFacingContext: 'Focused on oncology study teams that need response-assessment imaging support.',
    keywords: [
      mkKeyword('oncology trial imaging', 'broad'),
      mkKeyword('oncology imaging software', 'phrase'),
      mkKeyword('oncology trial imaging', 'exact'),
      mkKeyword('tumor imaging trials', 'broad'),
      mkKeyword('cancer trial imaging', 'phrase'),
      mkKeyword('oncology study imaging', 'broad'),
      mkKeyword('response assessment imaging', 'phrase'),
      mkKeyword('oncology imaging platform', 'broad'),
      mkKeyword('imaging for cancer trials', 'broad'),
      mkKeyword('oncology trial software', 'phrase'),
    ],
    negativeKeywords: [mkKeyword('free', 'broad'), mkKeyword('symptoms', 'broad')],
    headlines: [
      mkAsset('headline', 'Oncology Trial Imaging', 0, 1),
      mkAsset('headline', 'Support Oncology Studies', 1),
      mkAsset('headline', 'Imaging Built for Oncology', 2),
      mkAsset('headline', 'Streamline Response Reviews', 3),
      mkAsset('headline', 'Consistent Imaging Workflows', 4),
      mkAsset('headline', 'Purpose-Built for Trials', 5),
      mkAsset('headline', 'Centralize Oncology Imaging', 6),
      mkAsset('headline', 'See How It Works', 7),
      mkAsset('headline', 'This Headline Is Far Too Long To Fit The Limit', 8, undefined, true),
    ],
    descriptions: [
      mkAsset('description', 'Support oncology imaging studies with workflows designed for trial teams.', 0, 1),
      mkAsset('description', 'Centralize oncology imaging data and improve consistency across review steps.', 1),
      mkAsset('description', 'Built to support response assessment workflows in oncology trials.', 2),
      mkAsset('description', 'Explore imaging technology designed for the needs of oncology study teams.', 3),
    ],
  };

  const ecoa: AdGroup = {
    id: generateId('ag'),
    name: 'Electronic Clinical Outcomes Assessments',
    theme: 'eCOA solutions for clinical trials',
    searchIntent: 'Teams capturing patient-reported and clinician-reported outcomes electronically',
    finalUrl: 'https://example.com/ecoa',
    path1: 'ecoa',
    path2: 'outcomes',
    clientFacingContext: 'Targets study teams modernizing outcomes data capture with eCOA.',
    keywords: [
      mkKeyword('electronic clinical outcomes assessment', 'broad'),
      mkKeyword('ecoa software', 'phrase'),
      mkKeyword('ecoa platform', 'broad'),
      mkKeyword('electronic outcomes assessment', 'phrase'),
      mkKeyword('eCOA clinical trials', 'exact'),
      mkKeyword('patient reported outcomes software', 'phrase'),
      mkKeyword('clinical outcomes platform', 'broad'),
      mkKeyword('epro ecoa', 'broad'),
    ],
    negativeKeywords: [mkKeyword('free', 'broad')],
    headlines: [
      mkAsset('headline', 'eCOA for Clinical Trials', 0, 1),
      mkAsset('headline', 'Capture Outcomes Digitally', 1),
      mkAsset('headline', 'Modern eCOA Workflows', 2),
      mkAsset('headline', 'Streamline Outcomes Data', 3),
      mkAsset('headline', 'Built for Study Teams', 4),
      mkAsset('headline', 'Reliable eCOA Solutions', 5),
      mkAsset('headline', 'Simplify Data Capture', 6),
      mkAsset('headline', 'Request a Demo Today', 7),
    ],
    descriptions: [
      mkAsset('description', 'Capture clinical outcomes electronically with workflows built for study teams.', 0, 1),
      mkAsset('description', 'Modernize outcomes data collection with a reliable, centralized eCOA platform.', 1),
      mkAsset('description', 'Support consistent outcomes assessment across sites and study visits.', 2),
      mkAsset('description', 'Explore eCOA technology designed to simplify clinical data capture.', 3),
    ],
  };

  return [imaging, oncology, ecoa];
}

export function buildDemoCampaign(): CampaignProposal {
  const ts = nowIso();
  return {
    id: generateId('campaign'),
    version: 1,
    clientName: 'Example Clinical Technology Company',
    accountName: 'Example Google Ads Account',
    campaignName: 'Clinical Trial Solutions Search',
    objective: 'Generate qualified demo requests',
    campaignType: 'Google Search',
    budget: 250,
    budgetPeriod: 'daily',
    biddingStrategy: 'Maximize Conversions',
    locations: ['United States'],
    languages: ['English'],
    startDate: '2026-07-01',
    adGroups: buildAdGroups(),
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Build a demo review with a mixture of statuses, comments, and a partial checklist. */
function buildDemoReview(campaign: CampaignProposal): ClientReview {
  const review = emptyClientReview(campaign);

  const [imaging, oncology] = campaign.adGroups;

  // Imaging ad group: some approvals, one change request, comments, partial checklist.
  const imagingReview = emptyAdGroupReview(imaging.id);
  imagingReview.assetFeedback[imaging.headlines[0].id] = {
    assetId: imaging.headlines[0].id,
    status: 'approved',
    comment: '',
    reviewerName: 'Jordan Ellis',
    updatedAt: nowIso(),
  };
  imagingReview.assetFeedback[imaging.headlines[2].id] = {
    assetId: imaging.headlines[2].id,
    status: 'changes_requested',
    comment: 'Can we make this more specific to oncology studies?',
    reviewerName: 'Jordan Ellis',
    updatedAt: nowIso(),
  };
  imagingReview.assetFeedback[imaging.descriptions[0].id] = {
    assetId: imaging.descriptions[0].id,
    status: 'approved',
    comment: 'Love this one.',
    reviewerName: 'Jordan Ellis',
    updatedAt: nowIso(),
  };
  imagingReview.keywordFeedback.status = 'approved';
  imagingReview.keywordFeedback.generalComment = 'Keyword themes look aligned with our priorities.';
  imagingReview.checklist.reviewedTheme = true;
  imagingReview.checklist.reviewedKeywords = true;
  imagingReview.checklist.reviewedLandingPage = true;
  imagingReview.generalComment = 'Strong start — a few headline tweaks noted below.';
  imagingReview.overallStatus = 'pending';
  review.adGroupReviews[imaging.id] = imagingReview;

  // Oncology ad group: keyword section flagged, one flagged keyword.
  const oncologyReview = emptyAdGroupReview(oncology.id);
  oncologyReview.keywordFeedback.status = 'changes_requested';
  oncologyReview.keywordFeedback.generalComment =
    'Please review the broad match terms — we want to stay tightly themed.';
  oncologyReview.keywordFeedback.flaggedKeywordIds = [oncology.keywords[3].id];
  oncologyReview.keywordFeedback.keywordComments[oncology.keywords[3].id] =
    'This term may be too broad for our budget.';
  oncologyReview.assetFeedback[oncology.headlines[0].id] = {
    assetId: oncology.headlines[0].id,
    status: 'approved',
    comment: '',
    reviewerName: 'Jordan Ellis',
    updatedAt: nowIso(),
  };
  oncologyReview.checklist.reviewedTheme = true;
  review.adGroupReviews[oncology.id] = oncologyReview;

  review.reviewer = { name: 'Jordan Ellis', title: 'Director of Marketing', email: 'jordan@example.com' };
  review.campaignStatus = 'pending';
  review.updatedAt = nowIso();
  return review;
}

function buildDemoInternal(campaign: CampaignProposal): InternalEditorData {
  const [imaging, oncology] = campaign.adGroups;
  return {
    campaignId: campaign.id,
    campaignNote: 'Client prefers conservative, specialty-focused messaging. Avoid superlatives.',
    adGroupNotes: {
      [imaging.id]: 'Lead with data centralization — that resonated most on the kickoff call.',
      [oncology.id]: 'Watch broad match spend here; client is budget sensitive.',
    },
    keywordNotes: {},
    assetNotes: {
      [imaging.headlines[2].id]: 'Awaiting client direction on oncology specificity.',
    },
    resolutionNotes: {},
    resolvedFeedback: {},
  };
}

export function buildDemoProject(): ProjectBundle {
  const campaign = buildDemoCampaign();
  return {
    campaign,
    review: buildDemoReview(campaign),
    internal: buildDemoInternal(campaign),
  };
}
