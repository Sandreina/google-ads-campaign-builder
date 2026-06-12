import { describe, it, expect } from 'vitest';
import {
  campaignToEditorAdsTsv,
  campaignToEditorKeywordsTsv,
  campaignToEditorNegativesTsv,
} from './google-ads-editor';
import { buildDemoCampaign } from '@/data/demo';
import { RSA_LIMITS } from './constants';

function parseTsv(tsv: string): string[][] {
  return tsv.split('\r\n').map((line) => line.split('\t'));
}

describe('campaignToEditorAdsTsv', () => {
  const campaign = buildDemoCampaign();
  const rows = parseTsv(campaignToEditorAdsTsv(campaign));
  const header = rows[0];

  it('has the Google Ads Editor RSA columns', () => {
    expect(header.slice(0, 5)).toEqual(['Campaign', 'Ad Group', 'Final URL', 'Path 1', 'Path 2']);
    expect(header).toContain('Headline 1');
    expect(header).toContain('Headline 15');
    expect(header).toContain('Headline 1 position');
    expect(header).toContain('Description 4');
    expect(header).toContain('Description 1 position');
  });

  it('emits one ad row per ad group with campaign/ad-group names', () => {
    expect(rows.length - 1).toBe(campaign.adGroups.length);
    expect(rows[1][0]).toBe(campaign.campaignName);
    expect(rows[1][1]).toBe(campaign.adGroups[0].name);
  });

  it('places the pinned headline position in its position column', () => {
    // Demo imaging ad group pins headline 1 (Clinical Trial Imaging) to position 1.
    const h1Idx = header.indexOf('Headline 1');
    const h1PosIdx = header.indexOf('Headline 1 position');
    expect(rows[1][h1Idx]).toBe('Clinical Trial Imaging');
    expect(rows[1][h1PosIdx]).toBe('1');
  });

  it('never exceeds the RSA asset limits and excludes over-limit assets', () => {
    const headlineCols = header.filter((h) => /^Headline \d+$/.test(h)).length;
    expect(headlineCols).toBe(RSA_LIMITS.maxHeadlines);
    // The demo oncology group has an intentionally over-limit headline — it must not appear.
    const tsv = campaignToEditorAdsTsv(campaign);
    expect(tsv).not.toContain('This Headline Is Far Too Long To Fit The Limit');
  });
});

describe('campaignToEditorKeywordsTsv', () => {
  it('emits one row per keyword with capitalized match types and status', () => {
    const campaign = buildDemoCampaign();
    const rows = parseTsv(campaignToEditorKeywordsTsv(campaign));
    expect(rows[0]).toEqual(['Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Final URL', 'Status']);
    const totalKw = campaign.adGroups.reduce((n, ag) => n + ag.keywords.length, 0);
    expect(rows.length - 1).toBe(totalKw);
    // Match types are Title Case and keywords are bare (no [] or "").
    expect(rows.some((r) => ['Broad', 'Phrase', 'Exact'].includes(r[3]))).toBe(true);
    expect(rows.slice(1).every((r) => !/[[\]"]/.test(r[2]))).toBe(true);
  });
});

describe('campaignToEditorNegativesTsv', () => {
  it('emits negative keywords with Editor columns', () => {
    const campaign = buildDemoCampaign();
    const rows = parseTsv(campaignToEditorNegativesTsv(campaign));
    expect(rows[0]).toEqual(['Campaign', 'Ad Group', 'Keyword', 'Match Type']);
    const totalNeg = campaign.adGroups.reduce((n, ag) => n + ag.negativeKeywords.length, 0);
    expect(rows.length - 1).toBe(totalNeg);
  });
});
