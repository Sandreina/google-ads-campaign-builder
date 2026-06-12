import type { CampaignProposal } from '@/types';
import { RSA_LIMITS } from './constants';
import { activeValidAssets } from './validation';

/**
 * Export helpers that produce tab-separated blocks ready to paste into
 * Google Ads Editor's "Make multiple changes / paste" grids. Google Ads
 * Editor matches pasted columns by header name and shows a mapping step, so
 * these standard headers import cleanly.
 *
 * Tab-separated (not comma) because Editor's paste grid is tab-delimited —
 * the same format you get copying a range out of a spreadsheet.
 */

/** Escape a cell for TSV: strip tabs/newlines that would break the grid. */
function tsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\t\r\n]+/g, ' ').trim();
}

function toTsv(rows: (string | number | undefined | null)[][]): string {
  return rows.map((row) => row.map(tsvCell).join('\t')).join('\r\n');
}

/**
 * One Responsive Search Ad per ad group. Active, valid assets (within limits,
 * de-duplicated) are placed in order into Headline 1..15 / Description 1..4.
 * Pins ride in the matching "Headline N position" / "Description N position"
 * columns (the value is the pinned position Google Ads uses).
 */
export function campaignToEditorAdsTsv(campaign: CampaignProposal): string {
  const header: string[] = ['Campaign', 'Ad Group', 'Final URL', 'Path 1', 'Path 2'];
  for (let i = 1; i <= RSA_LIMITS.maxHeadlines; i++) header.push(`Headline ${i}`, `Headline ${i} position`);
  for (let i = 1; i <= RSA_LIMITS.maxDescriptions; i++) header.push(`Description ${i}`, `Description ${i} position`);

  const rows: (string | number)[][] = [header];

  for (const ag of campaign.adGroups) {
    const headlines = activeValidAssets(ag.headlines).slice(0, RSA_LIMITS.maxHeadlines);
    const descriptions = activeValidAssets(ag.descriptions).slice(0, RSA_LIMITS.maxDescriptions);
    if (headlines.length === 0 && descriptions.length === 0) continue;

    const row: (string | number)[] = [
      campaign.campaignName,
      ag.name,
      ag.finalUrl,
      ag.path1 ?? '',
      ag.path2 ?? '',
    ];
    for (let i = 0; i < RSA_LIMITS.maxHeadlines; i++) {
      const h = headlines[i];
      row.push(h ? h.text : '', h?.pinPosition ? h.pinPosition : '');
    }
    for (let i = 0; i < RSA_LIMITS.maxDescriptions; i++) {
      const d = descriptions[i];
      row.push(d ? d.text : '', d?.pinPosition ? d.pinPosition : '');
    }
    rows.push(row);
  }
  return toTsv(rows);
}

const MATCH_LABEL: Record<string, string> = { broad: 'Broad', phrase: 'Phrase', exact: 'Exact' };

/** One row per keyword, with Editor's standard columns (Status included). */
export function campaignToEditorKeywordsTsv(campaign: CampaignProposal): string {
  const rows: (string | number)[][] = [
    ['Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Final URL', 'Status'],
  ];
  for (const ag of campaign.adGroups) {
    for (const kw of ag.keywords) {
      // Google Ads Editor expects the bare term + a Match Type column (not bracketed).
      rows.push([campaign.campaignName, ag.name, kw.text, MATCH_LABEL[kw.matchType] ?? 'Broad', ag.finalUrl, kw.active ? 'Enabled' : 'Paused']);
    }
  }
  return toTsv(rows);
}

/** Negative keywords for Editor's negative-keywords paste grid. */
export function campaignToEditorNegativesTsv(campaign: CampaignProposal): string {
  const rows: (string | number)[][] = [['Campaign', 'Ad Group', 'Keyword', 'Match Type']];
  for (const ag of campaign.adGroups) {
    for (const kw of ag.negativeKeywords) {
      rows.push([campaign.campaignName, ag.name, kw.text, MATCH_LABEL[kw.matchType] ?? 'Broad']);
    }
  }
  return toTsv(rows);
}

export function hasNegatives(campaign: CampaignProposal): boolean {
  return campaign.adGroups.some((ag) => ag.negativeKeywords.length > 0);
}
