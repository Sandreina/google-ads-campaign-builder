/** Responsive Search Ad asset limits — configurable defaults. */
export const RSA_LIMITS = {
  maxHeadlines: 15,
  maxDescriptions: 4,
  headlineMaxChars: 30,
  descriptionMaxChars: 90,
  pathMaxChars: 15,
  /** Minimum recommended assets before an ad group is considered complete. */
  minHeadlines: 3,
  minDescriptions: 2,
} as const;

/** Headlines flagged "near limit" within this many characters of the max. */
export const NEAR_LIMIT_THRESHOLD = 3;

export const HEADLINE_PIN_POSITIONS = [1, 2, 3] as const;
export const DESCRIPTION_PIN_POSITIONS = [1, 2] as const;

export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  campaigns: 'gacr:campaigns',
  reviews: 'gacr:reviews',
  internal: 'gacr:internal',
  settings: 'gacr:settings',
  activeCampaign: 'gacr:active-campaign',
} as const;

export const AD_GROUP_CHECKLIST_ITEMS: { key: keyof import('@/types').AdGroupChecklist; label: string }[] = [
  { key: 'reviewedTheme', label: 'I reviewed the ad group theme' },
  { key: 'reviewedKeywords', label: 'I reviewed the keyword strategy' },
  { key: 'reviewedLandingPage', label: 'I reviewed the landing page' },
  { key: 'reviewedHeadlines', label: 'I reviewed every headline' },
  { key: 'reviewedDescriptions', label: 'I reviewed every description' },
  { key: 'reviewedPreview', label: 'I reviewed the Google Search ad preview' },
];

export const CAMPAIGN_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'reviewedStructure', label: 'I reviewed the campaign structure' },
  { key: 'reviewedAdGroups', label: 'I reviewed every ad group' },
  { key: 'reviewedKeywords', label: 'I reviewed the keyword strategy' },
  { key: 'reviewedHeadlines', label: 'I reviewed all proposed headlines' },
  { key: 'reviewedDescriptions', label: 'I reviewed all proposed descriptions' },
  { key: 'reviewedLandingPages', label: 'I reviewed the landing pages' },
  { key: 'understandRsa', label: 'I understand that Responsive Search Ads may display different combinations' },
  { key: 'reviewedComments', label: 'I reviewed all outstanding comments' },
];
