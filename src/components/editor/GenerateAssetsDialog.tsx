import { useEffect, useMemo, useState } from 'react';
import { Sparkles, RefreshCw, Info } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CharCount } from '@/components/shared/CharCount';
import { Checkbox } from '@/components/ui/primitives';
import type { AdGroup, AssetType } from '@/types';
import {
  generateHeadlineSuggestions,
  generateDescriptionSuggestions,
  suggestionInputFromAdGroup,
} from '@/lib/suggestions';
import { maxCharsFor } from '@/lib/validation';
import { cn } from '@/lib/utils';

/**
 * Generates ad-copy suggestions from the ad group's keywords, theme, intent,
 * and context, and lets the editor pick which to add. Generation is local
 * (no backend) and deterministic.
 */
export function GenerateAssetsDialog({
  open,
  onClose,
  adGroup,
  type,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  adGroup: AdGroup;
  type: AssetType;
  onAdd: (texts: string[]) => void;
}) {
  const max = maxCharsFor(type);
  const label = type === 'headline' ? 'Headlines' : 'Descriptions';
  const existing = useMemo(
    () => (type === 'headline' ? adGroup.headlines : adGroup.descriptions).map((a) => a.text),
    [adGroup, type],
  );
  const input = useMemo(() => suggestionInputFromAdGroup(adGroup), [adGroup]);

  // `seed` lets the editor regenerate; we vary the limit slightly to surface
  // different CTA combinations without introducing nondeterminism per render.
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => {
    const limit = type === 'headline' ? 15 : 6;
    const list =
      type === 'headline'
        ? generateHeadlineSuggestions(input, existing, limit)
        : generateDescriptionSuggestions(input, existing, limit);
    // Rotate the list based on the seed so "Regenerate" reorders/varies picks.
    if (seed === 0 || list.length === 0) return list;
    const offset = seed % list.length;
    return [...list.slice(offset), ...list.slice(0, offset)];
  }, [input, existing, type, seed]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pre-select all valid suggestions when the dialog (re)opens or regenerates.
  useEffect(() => {
    if (open) setSelected(new Set(suggestions));
  }, [open, suggestions]);

  const hasSignals =
    input.keywords.length > 0 || !!input.theme?.trim() || !!input.searchIntent?.trim() || !!input.context?.trim();

  function toggle(text: string) {
    const next = new Set(selected);
    if (next.has(text)) next.delete(text);
    else next.add(text);
    setSelected(next);
  }

  function handleAdd() {
    onAdd(suggestions.filter((s) => selected.has(s)));
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Generate ${label.toLowerCase()}`}
      description="Suggestions are generated from this ad group's keywords, theme, search intent, and context."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setSeed((s) => s + 1)}>
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            <Sparkles className="h-4 w-4" /> Add {selected.size} {label.toLowerCase()}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!hasSignals && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Add some <strong>keywords</strong> and an ad group <strong>theme</strong>, <strong>search intent</strong>, or{' '}
              <strong>context</strong> for more relevant, tailored suggestions. You can still add the generic options below.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{suggestions.length} suggestions</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(suggestions))}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {suggestions.map((text) => {
            const isSelected = selected.has(text);
            return (
              <li
                key={text}
                className={cn(
                  'flex items-start justify-between gap-3 rounded-md border p-2.5 transition-colors',
                  isSelected ? 'border-primary/40 bg-accent/40' : 'border-border',
                )}
              >
                <Checkbox
                  id={`sugg-${text}`}
                  checked={isSelected}
                  onCheckedChange={() => toggle(text)}
                  label={<span className="text-sm">{text}</span>}
                />
                <CharCount count={text.length} max={max} className="mt-0.5 shrink-0" />
              </li>
            );
          })}
          {suggestions.length === 0 && (
            <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No new suggestions — everything generated already exists in this ad group.
            </li>
          )}
        </ul>

        <Badge tone="neutral" className="self-start">
          Generated locally · review before adding
        </Badge>
      </div>
    </Dialog>
  );
}
