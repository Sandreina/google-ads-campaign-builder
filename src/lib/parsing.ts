import type { MatchType } from '@/types';
import { maxCharsFor } from './validation';

export interface ParsedAssetLine {
  /** 1-based line number, preserving original paste order. */
  index: number;
  text: string;
  charCount: number;
  maxChars: number;
  overLimit: boolean;
  duplicate: boolean;
  /** Set false by the UI to exclude a line before import. */
  include: boolean;
}

/**
 * Parse pasted text into asset lines. Splits by newline, trims whitespace,
 * removes blank lines, counts characters, flags over-limit and duplicate
 * lines, and preserves the original order.
 */
export function parseAssetLines(raw: string, type: 'headline' | 'description'): ParsedAssetLine[] {
  const maxChars = maxCharsFor(type);
  const seen = new Set<string>();
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((text, i) => {
    const key = text.toLowerCase();
    const duplicate = seen.has(key);
    seen.add(key);
    return {
      index: i + 1,
      text,
      charCount: text.length,
      maxChars,
      overLimit: text.length > maxChars,
      duplicate,
      include: true,
    };
  });
}

export interface ParsedKeyword {
  index: number;
  text: string;
  matchType: MatchType;
  duplicate: boolean;
  include: boolean;
}

/**
 * Detect match type from punctuation:
 *  - [text]   → exact
 *  - "text"   → phrase
 *  - text     → broad
 */
export function detectKeyword(raw: string): { text: string; matchType: MatchType } {
  const trimmed = raw.trim();
  if (/^\[.*\]$/.test(trimmed)) {
    return { text: trimmed.slice(1, -1).trim(), matchType: 'exact' };
  }
  if (/^".*"$/.test(trimmed)) {
    return { text: trimmed.slice(1, -1).trim(), matchType: 'phrase' };
  }
  return { text: trimmed, matchType: 'broad' };
}

export function parseKeywordLines(raw: string): ParsedKeyword[] {
  const seen = new Set<string>();
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, i) => {
    const { text, matchType } = detectKeyword(line);
    const key = `${text.toLowerCase()}::${matchType}`;
    const duplicate = seen.has(key);
    seen.add(key);
    return { index: i + 1, text, matchType, duplicate, include: text.length > 0 };
  });
}

/** Format a keyword for display per its match type. */
export function formatKeyword(text: string, matchType: MatchType): string {
  switch (matchType) {
    case 'exact':
      return `[${text}]`;
    case 'phrase':
      return `"${text}"`;
    default:
      return text;
  }
}

/* ------------------------------------------------------------------ */
/* Spreadsheet (tab-delimited) paste support                          */
/* ------------------------------------------------------------------ */

export interface SpreadsheetParseResult {
  /** True when more than one tab-delimited column was detected. */
  isTabular: boolean;
  headers: string[];
  /** Whether the first row looked like a header row. */
  hasHeaderRow: boolean;
  rows: string[][];
  columnCount: number;
}

const HEADER_HINTS = [
  'headline',
  'description',
  'keyword',
  'asset',
  'text',
  'pin',
  'note',
  'match',
  'url',
  'path',
  'number',
  '#',
  'active',
];

/**
 * Parse pasted spreadsheet content (tab-separated, as produced by Excel /
 * Google Sheets). Handles empty cells, extra spaces, and header detection.
 */
export function parseSpreadsheet(raw: string): SpreadsheetParseResult {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { isTabular: false, headers: [], hasHeaderRow: false, rows: [], columnCount: 0 };
  }

  const matrix = lines.map((line) => line.split('\t').map((cell) => cell.trim()));
  const columnCount = Math.max(...matrix.map((r) => r.length));
  const isTabular = columnCount > 1;

  // Detect header row: first row contains known header hints and no other row
  // shares its exact text shape with mostly text content.
  const firstRow = matrix[0].map((c) => c.toLowerCase());
  const hasHeaderRow =
    isTabular &&
    firstRow.some((cell) => HEADER_HINTS.some((hint) => cell.includes(hint)));

  const headers = hasHeaderRow
    ? matrix[0]
    : Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);

  const rows = hasHeaderRow ? matrix.slice(1) : matrix;

  // Normalize ragged rows to columnCount.
  const normalizedRows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < columnCount) copy.push('');
    return copy;
  });

  return { isTabular, headers, hasHeaderRow, rows: normalizedRows, columnCount };
}

export type ColumnRole = 'ignore' | 'text' | 'pin' | 'note' | 'matchType' | 'active' | 'number';

export interface MappedRow {
  text: string;
  pinPosition?: number | null;
  matchType?: MatchType;
  active?: boolean;
  note?: string;
}

/** Apply a column→role mapping to spreadsheet rows. */
export function applyColumnMapping(
  rows: string[][],
  mapping: ColumnRole[],
): MappedRow[] {
  const result: MappedRow[] = [];
  for (const row of rows) {
    const mapped: MappedRow = { text: '' };
    mapping.forEach((role, colIndex) => {
      const value = (row[colIndex] ?? '').trim();
      switch (role) {
        case 'text':
          mapped.text = value;
          break;
        case 'pin': {
          const n = parseInt(value, 10);
          mapped.pinPosition = Number.isFinite(n) && n > 0 ? n : null;
          break;
        }
        case 'note':
          mapped.note = value;
          break;
        case 'matchType':
          mapped.matchType = detectKeyword(value).matchType;
          break;
        case 'active':
          mapped.active = !/^(false|no|0|inactive|off)$/i.test(value);
          break;
        default:
          break;
      }
    });
    if (mapped.text.length > 0) result.push(mapped);
  }
  return result;
}
