import { useMemo, useState } from 'react';
import { Trash2, Copy, ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea, Select, Field } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { parseKeywordLines, formatKeyword } from '@/lib/parsing';
import type { MatchType } from '@/types';
import { cn } from '@/lib/utils';

type Mode = 'append' | 'replace';

const SAMPLE = `clinical trial imaging
"clinical trial imaging software"
[oncology trial imaging]
clinical imaging platform`;

const MATCH_TONE: Record<MatchType, 'neutral' | 'info' | 'primary'> = {
  broad: 'neutral',
  phrase: 'info',
  exact: 'primary',
};

export function BulkKeywordDialog({
  open,
  onClose,
  onImport,
  negative = false,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (items: { text: string; matchType: MatchType }[], mode: Mode) => void;
  negative?: boolean;
}) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<Mode>('append');
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const parsed = useMemo(() => parseKeywordLines(raw), [raw]);
  const kept = parsed.filter((k) => !removed.has(k.index));
  const dupCount = kept.filter((k) => k.duplicate).length;

  const label = negative ? 'Negative Keywords' : 'Keywords';

  function reset() {
    setRaw('');
    setRemoved(new Set());
    setMode('append');
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={`Paste ${label}`}
      description="Match types are detected automatically: plain text is broad, “quotes” are phrase, [brackets] are exact."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setRaw(SAMPLE)}>
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
          <Button
            disabled={kept.length === 0}
            onClick={() => {
              onImport(
                kept.map((k) => ({ text: k.text, matchType: k.matchType })),
                mode,
              );
              reset();
              onClose();
            }}
          >
            <ArrowRight className="h-4 w-4" /> {mode === 'replace' ? 'Replace' : 'Add'} {kept.length}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label={`Paste ${label.toLowerCase()}`}>
          <Textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setRemoved(new Set());
            }}
            rows={8}
            placeholder="One keyword per line…"
            className="font-mono text-xs"
            autoFocus
          />
        </Field>

        {!negative && (
          <Field label="Import behavior">
            <Select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="append">Append to existing keywords</option>
              <option value="replace">Replace existing keywords</option>
            </Select>
          </Field>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Confirm {kept.length} keywords</span>
          {dupCount > 0 && (
            <Badge tone="warning">
              <Copy className="h-3 w-3" /> {dupCount} duplicate
            </Badge>
          )}
        </div>
        <div className="max-h-[280px] overflow-y-auto rounded-md border border-border scrollbar-thin">
          {parsed.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Parsed keywords will appear here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {parsed.map((kw) => {
                const isRemoved = removed.has(kw.index);
                return (
                  <li
                    key={kw.index}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm',
                      isRemoved && 'opacity-40',
                      kw.duplicate && !isRemoved && 'bg-amber-50/50',
                    )}
                  >
                    <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{kw.index}</span>
                    <span className={cn('flex-1 font-mono', isRemoved && 'line-through')}>
                      {formatKeyword(kw.text, kw.matchType)}
                    </span>
                    <Badge tone={MATCH_TONE[kw.matchType]} className="capitalize">
                      {kw.matchType}
                    </Badge>
                    {kw.duplicate && <Badge tone="warning">Dup</Badge>}
                    <button
                      aria-label={isRemoved ? 'Restore' : 'Remove'}
                      onClick={() => {
                        const next = new Set(removed);
                        if (isRemoved) next.delete(kw.index);
                        else next.add(kw.index);
                        setRemoved(next);
                      }}
                      className="text-muted-foreground hover:text-destructive"
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
    </Dialog>
  );
}
