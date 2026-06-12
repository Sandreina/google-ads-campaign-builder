import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv, previewCsvImport, campaignToCsv, feedbackToCsv } from './csv';
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
