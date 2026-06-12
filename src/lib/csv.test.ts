import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv, previewCsvImport, campaignToCsv, feedbackToCsv, adGroupsFromCsv } from './csv';
import { projectBundleSchema, clientReviewPackageSchema } from './schemas';
import { buildDemoProject } from '@/data/demo';
import { buildClientReviewPackage } from './sanitize';

describe('CSV round-trip', () => {
  it('escapes and parses quoted fields', () => {
    const csv = toCsv([
      ['Name', 'Comment'],
      ['Imaging', 'Make it "specific", please'],
      ['Multi', 'line\nbreak'],
    ]);
    const parsed = parseCsv(csv);
    expect(parsed[1][1]).toBe('Make it "specific", please');
    expect(parsed[2][1]).toBe('line\nbreak');
  });
});

describe('previewCsvImport', () => {
  it('summarizes campaigns, ad groups, and asset counts', () => {
    const csv = toCsv([
      ['Campaign', 'Ad Group', 'Asset Type', 'Asset Number', 'Text', 'Match Type'],
      ['Camp', 'AG1', 'Headline', '1', 'Clinical Trial Imaging', ''],
      ['Camp', 'AG1', 'Headline', '2', 'Clinical Trial Imaging', ''], // duplicate
      ['Camp', 'AG1', 'Description', '1', 'A description here', ''],
      ['Camp', 'AG1', 'Keyword', '1', 'imaging', 'broad'],
      ['Camp', 'AG1', 'Headline', '3', 'x'.repeat(40), ''], // over limit
      ['Camp', '', 'Headline', '4', '', ''], // invalid
    ]);
    const preview = previewCsvImport(csv);
    expect(preview.campaigns.has('Camp')).toBe(true);
    expect(preview.adGroups.has('AG1')).toBe(true);
    expect(preview.headlineCount).toBe(3);
    expect(preview.descriptionCount).toBe(1);
    expect(preview.keywordCount).toBe(1);
    expect(preview.duplicateRows).toBe(1);
    expect(preview.charLimitIssues).toBe(1);
    expect(preview.invalidRows).toBe(1);
  });
});

describe('campaignToCsv and feedbackToCsv', () => {
  it('produces parseable output with headers', () => {
    const { campaign, review } = buildDemoProject();
    const campaignCsv = parseCsv(campaignToCsv(campaign));
    expect(campaignCsv[0]).toContain('Campaign');
    expect(campaignCsv.length).toBeGreaterThan(1);

    const feedbackCsv = parseCsv(feedbackToCsv(campaign, review));
    expect(feedbackCsv[0]).toContain('Status');
  });
});

describe('adGroupsFromCsv', () => {
  it('builds ad groups with keywords, headlines, descriptions, urls, pins, and stable ids', () => {
    const csv = toCsv([
      ['Campaign', 'Ad Group', 'Asset Type', 'Asset Number', 'Text', 'Match Type', 'Final URL', 'Path 1', 'Path 2', 'Pin Position', 'Active'],
      ['Camp', 'Imaging', 'Keyword', '1', 'clinical imaging', 'phrase', 'https://x.com/imaging', 'imaging', 'trials', '', 'true'],
      ['Camp', 'Imaging', 'Negative Keyword', '1', 'free', 'broad', '', '', '', '', 'true'],
      ['Camp', 'Imaging', 'Headline', '1', 'Clinical Trial Imaging', '', '', '', '', '1', 'true'],
      ['Camp', 'Imaging', 'Headline', '2', 'Centralize Data', '', '', '', '', '', 'false'],
      ['Camp', 'Imaging', 'Description', '1', 'A solid description for the ad.', '', '', '', '', '', 'true'],
      ['Camp', 'Oncology', 'Headline', '1', 'Oncology Imaging', '', 'https://x.com/onc', '', '', '', 'true'],
      ['Camp', '', 'Headline', '1', '', '', '', '', '', '', ''], // invalid — skipped
    ]);
    const rows = previewCsvImport(csv).parsedRows;
    const groups = adGroupsFromCsv(rows);

    expect(groups).toHaveLength(2);
    const imaging = groups.find((g) => g.name === 'Imaging')!;
    expect(imaging.finalUrl).toBe('https://x.com/imaging');
    expect(imaging.path1).toBe('imaging');
    expect(imaging.keywords).toHaveLength(1);
    expect(imaging.keywords[0].matchType).toBe('phrase');
    expect(imaging.negativeKeywords).toHaveLength(1);
    expect(imaging.headlines).toHaveLength(2);
    expect(imaging.headlines[0].pinPosition).toBe(1);
    expect(imaging.headlines[1].active).toBe(false);
    expect(imaging.headlines[0].order).toBe(0);
    expect(imaging.headlines[1].order).toBe(1);
    expect(imaging.descriptions).toHaveLength(1);

    // stable, unique ids
    const ids = groups.flatMap((g) => [g.id, ...g.headlines.map((h) => h.id), ...g.keywords.map((k) => k.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('import validation with Zod', () => {
  it('validates a real project bundle', () => {
    const project = buildDemoProject();
    const result = projectBundleSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid bundle', () => {
    const result = projectBundleSchema.safeParse({ campaign: {}, review: {}, internal: {} });
    expect(result.success).toBe(false);
  });

  it('validates a client review package', () => {
    const { campaign, review } = buildDemoProject();
    const pkg = buildClientReviewPackage(campaign, review);
    expect(clientReviewPackageSchema.safeParse(pkg).success).toBe(true);
  });
});
