import { describe, it, expect } from 'vitest';
import {
  parseAssetLines,
  parseKeywordLines,
  detectKeyword,
  parseSpreadsheet,
  applyColumnMapping,
  formatKeyword,
} from './parsing';

describe('parseAssetLines (headlines)', () => {
  it('splits multiple lines into separate headlines', () => {
    const result = parseAssetLines(
      'Clinical Trial Imaging\nImprove Imaging Study Oversight\nCentralize Your Imaging Data',
      'headline',
    );
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.text)).toEqual([
      'Clinical Trial Imaging',
      'Improve Imaging Study Oversight',
      'Centralize Your Imaging Data',
    ]);
  });

  it('trims whitespace and removes blank lines', () => {
    const result = parseAssetLines('  Headline A  \n\n\n   \nHeadline B', 'headline');
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Headline A');
    expect(result[1].text).toBe('Headline B');
  });

  it('preserves original order with 1-based index', () => {
    const result = parseAssetLines('One\nTwo\nThree', 'headline');
    expect(result.map((r) => r.index)).toEqual([1, 2, 3]);
  });

  it('flags headlines over the 30 char limit', () => {
    const long = 'This headline is definitely longer than thirty characters';
    const result = parseAssetLines(`Short\n${long}`, 'headline');
    expect(result[0].overLimit).toBe(false);
    expect(result[1].overLimit).toBe(true);
    expect(result[1].charCount).toBe(long.length);
  });

  it('detects duplicates (case-insensitive)', () => {
    const result = parseAssetLines('Imaging\nimaging\nDifferent', 'headline');
    expect(result[0].duplicate).toBe(false);
    expect(result[1].duplicate).toBe(true);
    expect(result[2].duplicate).toBe(false);
  });
});

describe('parseAssetLines (descriptions)', () => {
  it('uses the 90 char limit', () => {
    const result = parseAssetLines('Short description', 'description');
    expect(result[0].maxChars).toBe(90);
  });

  it('flags descriptions over the limit', () => {
    const long = 'x'.repeat(95);
    const result = parseAssetLines(long, 'description');
    expect(result[0].overLimit).toBe(true);
  });
});

describe('detectKeyword', () => {
  it('detects broad match from plain text', () => {
    expect(detectKeyword('clinical trial imaging')).toEqual({
      text: 'clinical trial imaging',
      matchType: 'broad',
    });
  });
  it('detects phrase match from quotes', () => {
    expect(detectKeyword('"clinical trial imaging software"')).toEqual({
      text: 'clinical trial imaging software',
      matchType: 'phrase',
    });
  });
  it('detects exact match from brackets', () => {
    expect(detectKeyword('[oncology trial imaging]')).toEqual({
      text: 'oncology trial imaging',
      matchType: 'exact',
    });
  });
});

describe('parseKeywordLines', () => {
  it('parses a mixed list and infers match types', () => {
    const result = parseKeywordLines(
      'clinical trial imaging\n"clinical trial imaging software"\n[oncology trial imaging]\nclinical imaging platform',
    );
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.matchType)).toEqual(['broad', 'phrase', 'exact', 'broad']);
    expect(result[1].text).toBe('clinical trial imaging software');
  });

  it('detects duplicate keywords with the same match type', () => {
    const result = parseKeywordLines('imaging\nimaging\n"imaging"');
    expect(result[0].duplicate).toBe(false);
    expect(result[1].duplicate).toBe(true);
    expect(result[2].duplicate).toBe(false); // different match type
  });
});

describe('formatKeyword', () => {
  it('formats by match type', () => {
    expect(formatKeyword('imaging', 'broad')).toBe('imaging');
    expect(formatKeyword('imaging', 'phrase')).toBe('"imaging"');
    expect(formatKeyword('imaging', 'exact')).toBe('[imaging]');
  });
});

describe('parseSpreadsheet', () => {
  it('detects tabular data with a header row', () => {
    const raw = 'Asset Number\tHeadline\tPin Position\n1\tClinical Trial Imaging\t1\n2\tCentralize Data\t';
    const result = parseSpreadsheet(raw);
    expect(result.isTabular).toBe(true);
    expect(result.hasHeaderRow).toBe(true);
    expect(result.headers).toEqual(['Asset Number', 'Headline', 'Pin Position']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['1', 'Clinical Trial Imaging', '1']);
  });

  it('handles empty cells by padding rows', () => {
    const raw = 'Headline\tNote\nA\nB\tnote b';
    const result = parseSpreadsheet(raw);
    expect(result.rows[0]).toEqual(['A', '']);
    expect(result.rows[1]).toEqual(['B', 'note b']);
  });

  it('treats single-column paste as non-tabular', () => {
    const result = parseSpreadsheet('Headline A\nHeadline B');
    expect(result.isTabular).toBe(false);
    expect(result.columnCount).toBe(1);
  });
});

describe('applyColumnMapping', () => {
  it('maps columns to roles and skips empty text rows', () => {
    const rows = [
      ['1', 'Clinical Trial Imaging', '1', 'good'],
      ['2', '', '', 'skip me'],
      ['3', 'Centralize Data', '', ''],
    ];
    const mapped = applyColumnMapping(rows, ['number', 'text', 'pin', 'note']);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({ text: 'Clinical Trial Imaging', pinPosition: 1, note: 'good' });
    expect(mapped[1]).toMatchObject({ text: 'Centralize Data', pinPosition: null });
  });
});
