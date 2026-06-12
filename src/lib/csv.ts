import type { CampaignProposal, ClientReview } from '@/types';
import { formatKeyword } from './parsing';
import { maxCharsFor } from './validation';
import { getAssetFeedback } from './review';

/** Escape a value for CSV (RFC 4180). */
export function csvCell(value: string | number | boolean | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: (string | number | boolean | undefined | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Minimal CSV parser supporting quoted fields and embedded commas/newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export const CAMPAIGN_CSV_HEADERS = [
  'Campaign',
  'Ad Group',
  'Asset Type',
  'Asset Number',
  'Text',
  'Match Type',
  'Final URL',
  'Path 1',
  'Path 2',
  'Pin Position',
  'Active',
] as const;

/** Export the full campaign structure to CSV. */
export function campaignToCsv(campaign: CampaignProposal): string {
  const rows: (string | number | boolean)[][] = [[...CAMPAIGN_CSV_HEADERS]];
  for (const ag of campaign.adGroups) {
    ag.keywords.forEach((kw, i) =>
      rows.push([
        campaign.campaignName,
        ag.name,
        'Keyword',
        i + 1,
        formatKeyword(kw.text, kw.matchType),
        kw.matchType,
        ag.finalUrl,
        ag.path1 ?? '',
        ag.path2 ?? '',
        '',
        kw.active,
      ]),
    );
    ag.negativeKeywords.forEach((kw, i) =>
      rows.push([
        campaign.campaignName,
        ag.name,
        'Negative Keyword',
        i + 1,
        kw.text,
        kw.matchType,
        ag.finalUrl,
        ag.path1 ?? '',
        ag.path2 ?? '',
        '',
        kw.active,
      ]),
    );
    ag.headlines.forEach((h, i) =>
      rows.push([
        campaign.campaignName,
        ag.name,
        'Headline',
        i + 1,
        h.text,
        '',
        ag.finalUrl,
        ag.path1 ?? '',
        ag.path2 ?? '',
        h.pinPosition ?? '',
        h.active,
      ]),
    );
    ag.descriptions.forEach((d, i) =>
      rows.push([
        campaign.campaignName,
        ag.name,
        'Description',
        i + 1,
        d.text,
        '',
        ag.finalUrl,
        ag.path1 ?? '',
        ag.path2 ?? '',
        d.pinPosition ?? '',
        d.active,
      ]),
    );
  }
  return toCsv(rows);
}

export interface CsvImportPreview {
  campaigns: Set<string>;
  adGroups: Set<string>;
  keywordCount: number;
  headlineCount: number;
  descriptionCount: number;
  duplicateRows: number;
  invalidRows: number;
  charLimitIssues: number;
  parsedRows: ParsedCsvRow[];
}

export interface ParsedCsvRow {
  adGroup: string;
  assetType: string;
  text: string;
  matchType: string;
  finalUrl: string;
  path1: string;
  path2: string;
  pinPosition: string;
  active: string;
  invalid: boolean;
  duplicate: boolean;
  overLimit: boolean;
}

/** Build an import preview from a CSV body (with header row). */
export function previewCsvImport(text: string): CsvImportPreview {
  const rows = parseCsv(text);
  const preview: CsvImportPreview = {
    campaigns: new Set(),
    adGroups: new Set(),
    keywordCount: 0,
    headlineCount: 0,
    descriptionCount: 0,
    duplicateRows: 0,
    invalidRows: 0,
    charLimitIssues: 0,
    parsedRows: [],
  };
  if (rows.length <= 1) return preview;

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h === name.toLowerCase());
  const idx = {
    campaign: col('campaign'),
    adGroup: col('ad group'),
    type: col('asset type'),
    text: col('text'),
    match: col('match type'),
    url: col('final url'),
    path1: col('path 1'),
    path2: col('path 2'),
    pin: col('pin position'),
    active: col('active'),
  };

  const seen = new Set<string>();
  for (const row of rows.slice(1)) {
    const get = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');
    const assetType = get(idx.type);
    const text = get(idx.text);
    const adGroup = get(idx.adGroup);
    const typeNorm = assetType.toLowerCase();

    const invalid = !text || !adGroup || !assetType;
    const key = `${adGroup}::${typeNorm}::${text.toLowerCase()}`;
    const duplicate = !invalid && seen.has(key);
    if (!invalid) seen.add(key);

    let overLimit = false;
    if (typeNorm === 'headline') overLimit = text.length > maxCharsFor('headline');
    if (typeNorm === 'description') overLimit = text.length > maxCharsFor('description');

    if (get(idx.campaign)) preview.campaigns.add(get(idx.campaign));
    if (adGroup) preview.adGroups.add(adGroup);
    if (!invalid) {
      if (typeNorm.includes('keyword')) preview.keywordCount += 1;
      else if (typeNorm === 'headline') preview.headlineCount += 1;
      else if (typeNorm === 'description') preview.descriptionCount += 1;
    }

    if (invalid) preview.invalidRows += 1;
    if (duplicate) preview.duplicateRows += 1;
    if (overLimit) preview.charLimitIssues += 1;

    preview.parsedRows.push({
      adGroup,
      assetType,
      text,
      matchType: get(idx.match),
      finalUrl: get(idx.url),
      path1: get(idx.path1),
      path2: get(idx.path2),
      pinPosition: get(idx.pin),
      active: get(idx.active),
      invalid,
      duplicate,
      overLimit,
    });
  }
  return preview;
}

/** Export client feedback to CSV. Never includes internal notes. */
export function feedbackToCsv(campaign: CampaignProposal, review: ClientReview): string {
  const rows: (string | number | boolean)[][] = [
    ['Ad Group', 'Asset Type', 'Asset Number', 'Text', 'Status', 'Client Comment', 'Reviewer'],
  ];
  const reviewer = review.reviewer?.name ?? '';
  for (const ag of campaign.adGroups) {
    const agReview = review.adGroupReviews[ag.id];
    ag.headlines.forEach((h, i) => {
      const f = getAssetFeedback(agReview ?? emptyAg(ag.id), h.id);
      rows.push([ag.name, 'Headline', i + 1, h.text, f.status, f.comment, reviewer]);
    });
    ag.descriptions.forEach((d, i) => {
      const f = getAssetFeedback(agReview ?? emptyAg(ag.id), d.id);
      rows.push([ag.name, 'Description', i + 1, d.text, f.status, f.comment, reviewer]);
    });
    if (agReview) {
      rows.push([
        ag.name,
        'Keyword Section',
        '',
        `${ag.keywords.length} keywords`,
        agReview.keywordFeedback.status,
        agReview.keywordFeedback.generalComment,
        reviewer,
      ]);
      rows.push([
        ag.name,
        'Ad Group Note',
        '',
        '',
        agReview.overallStatus,
        agReview.generalComment,
        reviewer,
      ]);
    }
  }
  rows.push(['Campaign', 'Final Status', '', '', review.campaignStatus, review.finalComment, reviewer]);
  return toCsv(rows);
}

function emptyAg(adGroupId: string) {
  return {
    adGroupId,
    assetFeedback: {},
    keywordFeedback: { status: 'pending' as const, generalComment: '', flaggedKeywordIds: [], keywordComments: {} },
    checklist: {
      reviewedTheme: false,
      reviewedKeywords: false,
      reviewedLandingPage: false,
      reviewedHeadlines: false,
      reviewedDescriptions: false,
      reviewedPreview: false,
    },
    generalComment: '',
    overallStatus: 'pending' as const,
  };
}
