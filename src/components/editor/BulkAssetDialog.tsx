import { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, Copy, ArrowRight, Table2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea, Select, Field } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { CharCount } from '@/components/shared/CharCount';
import {
  parseAssetLines,
  parseSpreadsheet,
  applyColumnMapping,
  type ParsedAssetLine,
  type ColumnRole,
} from '@/lib/parsing';
import { maxCharsFor } from '@/lib/validation';
import type { AssetType } from '@/types';
import { cn } from '@/lib/utils';

type Mode = 'append' | 'replace';

const HEADLINE_SAMPLE = `Clinical Trial Imaging Solutions
Improve Imaging Study Oversight
Centralize Your Imaging Data
Built for Complex Clinical Trials
Explore Imaging Technology
Streamline Trial Workflows`;

const DESCRIPTION_SAMPLE = `Centralize clinical trial imaging workflows and improve visibility across your studies.
Support complex imaging studies with technology designed for clinical trial teams.
Connect imaging data, workflows, and oversight in one centralized platform.
Explore solutions designed to support efficient and consistent imaging trial execution.`;

export function BulkAssetDialog({
  open,
  onClose,
  type,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  type: AssetType;
  /** Receives parsed lines (text + pin) and the chosen append/replace mode. */
  onImport: (items: { text: string; pinPosition?: number | null }[], mode: Mode) => void;
}) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<Mode>('append');
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [columnMapping, setColumnMapping] = useState<ColumnRole[]>([]);

  const spreadsheet = useMemo(() => parseSpreadsheet(raw), [raw]);
  const isTabular = spreadsheet.isTabular;

  // Default column mapping: first text-like column → text, a "pin" header → pin.
  const effectiveMapping = useMemo<ColumnRole[]>(() => {
    if (!isTabular) return [];
    if (columnMapping.length === spreadsheet.columnCount) return columnMapping;
    return spreadsheet.headers.map((h): ColumnRole => {
      const lower = h.toLowerCase();
      if (lower.includes('pin')) return 'pin';
      if (lower.includes('note')) return 'note';
      if (lower.includes('active')) return 'active';
      if (lower.includes('number') || lower === '#') return 'number';
      if (lower.includes('headline') || lower.includes('description') || lower.includes('text'))
        return 'text';
      return 'ignore';
    });
  }, [isTabular, columnMapping, spreadsheet]);

  // Ensure exactly one text column has a default if none detected.
  const mappingWithText = useMemo<ColumnRole[]>(() => {
    if (!isTabular) return effectiveMapping;
    if (effectiveMapping.includes('text')) return effectiveMapping;
    const copy = [...effectiveMapping];
    const firstNonNumber = copy.findIndex((r) => r !== 'number');
    copy[firstNonNumber >= 0 ? firstNonNumber : 0] = 'text';
    return copy;
  }, [effectiveMapping, isTabular]);

  const parsedLines: ParsedAssetLine[] = useMemo(() => {
    if (isTabular) {
      const mapped = applyColumnMapping(spreadsheet.rows, mappingWithText);
      const max = maxCharsFor(type);
      const seen = new Set<string>();
      return mapped.map((m, i) => {
        const key = m.text.toLowerCase();
        const dup = seen.has(key);
        seen.add(key);
        return {
          index: i + 1,
          text: m.text,
          charCount: m.text.length,
          maxChars: max,
          overLimit: m.text.length > max,
          duplicate: dup,
          include: true,
        };
      });
    }
    return parseAssetLines(raw, type);
  }, [raw, type, isTabular, spreadsheet.rows, mappingWithText]);

  const pinByIndex = useMemo(() => {
    if (!isTabular) return new Map<number, number | null>();
    const mapped = applyColumnMapping(spreadsheet.rows, mappingWithText);
    const m = new Map<number, number | null>();
    mapped.forEach((row, i) => m.set(i + 1, row.pinPosition ?? null));
    return m;
  }, [isTabular, spreadsheet.rows, mappingWithText]);

  const kept = parsedLines.filter((l) => !removed.has(l.index));
  const overCount = kept.filter((l) => l.overLimit).length;
  const dupCount = kept.filter((l) => l.duplicate).length;

  const label = type === 'headline' ? 'Headlines' : 'Descriptions';

  function reset() {
    setRaw('');
    setRemoved(new Set());
    setColumnMapping([]);
    setMode('append');
  }

  function handleImport() {
    const items = kept.map((l) => ({
      text: l.text,
      pinPosition: pinByIndex.get(l.index) ?? null,
    }));
    onImport(items, mode);
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={`Paste ${label}`}
      description={`Paste one ${type} per line. We'll split, number, validate, and detect duplicates automatically. Spreadsheet (tab-separated) paste is also supported.`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setRaw(type === 'headline' ? HEADLINE_SAMPLE : DESCRIPTION_SAMPLE)}>
            Insert sample
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={kept.length === 0}>
            <ArrowRight className="h-4 w-4" />
            {mode === 'replace' ? 'Replace' : 'Add'} {kept.length} {label.toLowerCase()}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Field label={`Paste ${label.toLowerCase()}`} hint="Blank lines are removed. Extra spaces are trimmed.">
            <Textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setRemoved(new Set());
              }}
              rows={12}
              placeholder={`Paste your ${type}s here, one per line…`}
              className="font-mono text-xs"
              autoFocus
            />
          </Field>

          <div className="flex items-center gap-2">
            <Field label="Import behavior" className="flex-1">
              <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="append">Append to existing {label.toLowerCase()}</option>
                <option value="replace">Replace existing {label.toLowerCase()}</option>
              </Select>
            </Field>
          </div>

          {isTabular && (
            <div className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                <Table2 className="h-3.5 w-3.5" /> Spreadsheet detected — map columns
              </div>
              <div className="flex flex-col gap-1.5">
                {spreadsheet.headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={header}>
                      {header}
                    </span>
                    <Select
                      value={mappingWithText[i] ?? 'ignore'}
                      onChange={(e) => {
                        const next = [...mappingWithText];
                        next[i] = e.target.value as ColumnRole;
                        setColumnMapping(next);
                      }}
                      className="h-8 text-xs"
                    >
                      <option value="ignore">Ignore</option>
                      <option value="text">{type} text</option>
                      <option value="pin">Pin position</option>
                      <option value="note">Note</option>
                      <option value="number">Asset number</option>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Preview</span>
            <Badge tone="neutral">{kept.length} parsed</Badge>
            {overCount > 0 && (
              <Badge tone="destructive">
                <AlertTriangle className="h-3 w-3" /> {overCount} over limit
              </Badge>
            )}
            {dupCount > 0 && (
              <Badge tone="warning">
                <Copy className="h-3 w-3" /> {dupCount} duplicate
              </Badge>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto rounded-md border border-border scrollbar-thin">
            {parsedLines.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Parsed {type}s will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {parsedLines.map((line) => {
                  const isRemoved = removed.has(line.index);
                  const pin = pinByIndex.get(line.index);
                  return (
                    <li
                      key={line.index}
                      className={cn(
                        'flex items-start gap-2 px-3 py-2 text-sm',
                        isRemoved && 'opacity-40',
                        line.overLimit && !isRemoved && 'bg-red-50/50',
                        line.duplicate && !isRemoved && !line.overLimit && 'bg-amber-50/50',
                      )}
                    >
                      <span className="mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {line.index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('break-words', isRemoved && 'line-through')}>{line.text}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <CharCount count={line.charCount} max={line.maxChars} />
                          {line.duplicate && <Badge tone="warning">Duplicate</Badge>}
                          {pin ? <Badge tone="info">Pin {pin}</Badge> : null}
                        </div>
                      </div>
                      <button
                        aria-label={isRemoved ? 'Restore line' : 'Remove line'}
                        onClick={() => {
                          const next = new Set(removed);
                          if (isRemoved) next.delete(line.index);
                          else next.add(line.index);
                          setRemoved(next);
                        }}
                        className="mt-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
