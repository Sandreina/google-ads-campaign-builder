import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, RefreshCw, Info, Loader2, AlertTriangle, Settings2, Wand2, FileText } from 'lucide-react';
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
import { generateCopyWithAI, filterValidItems, isAiConfigured, AiError, type AiSettings } from '@/lib/ai';
import { loadAiSettings } from '@/lib/settings';
import { maxCharsFor } from '@/lib/validation';
import { cn } from '@/lib/utils';

type Mode = 'ai' | 'templates';

/**
 * Generates ad-copy suggestions from the ad group's keywords, theme, intent,
 * and context. Uses the configured LLM ("AI" mode) when available, and a local
 * template generator ("Built-in") otherwise — or as an explicit fallback.
 */
export function GenerateAssetsDialog({
  open,
  onClose,
  adGroup,
  type,
  onAdd,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  adGroup: AdGroup;
  type: AssetType;
  onAdd: (texts: string[]) => void;
  onOpenSettings: () => void;
}) {
  const max = maxCharsFor(type);
  const label = type === 'headline' ? 'Headlines' : 'Descriptions';
  const existing = useMemo(
    () => (type === 'headline' ? adGroup.headlines : adGroup.descriptions).map((a) => a.text),
    [adGroup, type],
  );
  const input = useMemo(() => suggestionInputFromAdGroup(adGroup), [adGroup]);

  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [mode, setMode] = useState<Mode>('templates');
  const [seed, setSeed] = useState(0);
  const [aiItems, setAiItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const targetCount = type === 'headline' ? 12 : 6;

  // Local template suggestions (used for "Built-in" mode and as fallback).
  const templateItems = useMemo(() => {
    const limit = type === 'headline' ? 15 : 6;
    const list =
      type === 'headline'
        ? generateHeadlineSuggestions(input, existing, limit)
        : generateDescriptionSuggestions(input, existing, limit);
    if (seed === 0 || list.length === 0) return list;
    const offset = seed % list.length;
    return [...list.slice(offset), ...list.slice(0, offset)];
  }, [input, existing, type, seed]);

  const runAi = useCallback(
    async (settings: AiSettings) => {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      try {
        const raw = await generateCopyWithAI({
          input,
          type,
          count: targetCount,
          settings,
          signal: controller.signal,
        });
        const valid = filterValidItems(raw, type, existing);
        setAiItems(valid);
        setSelected(new Set(valid));
        if (valid.length === 0) {
          setError('The model returned no usable items within the character limit. Try Regenerate.');
        }
      } catch (e) {
        setError(e instanceof AiError ? e.message : 'Generation failed. Check your AI settings and try again.');
        setAiItems([]);
      } finally {
        setLoading(false);
      }
    },
    [input, type, targetCount, existing],
  );

  // On open: pick mode based on configuration and kick off generation.
  useEffect(() => {
    if (!open) return;
    const settings = loadAiSettings();
    setAiSettings(settings);
    setSeed(0);
    if (isAiConfigured(settings)) {
      setMode('ai');
      void runAi(settings);
    } else {
      setMode('templates');
      setAiItems([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adGroup.id, type]);

  // Pre-select template items when in template mode.
  useEffect(() => {
    if (open && mode === 'templates') setSelected(new Set(templateItems));
  }, [open, mode, templateItems]);

  const suggestions = mode === 'ai' ? aiItems : templateItems;

  const hasSignals =
    input.keywords.length > 0 || !!input.theme?.trim() || !!input.searchIntent?.trim() || !!input.context?.trim();

  function toggle(text: string) {
    const next = new Set(selected);
    if (next.has(text)) next.delete(text);
    else next.add(text);
    setSelected(next);
  }

  function regenerate() {
    if (mode === 'ai' && isAiConfigured(aiSettings)) void runAi(aiSettings);
    else setSeed((s) => s + 1);
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
          <Button variant="ghost" onClick={regenerate} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Regenerate
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || loading}>
            <Sparkles className="h-4 w-4" /> Add {selected.size} {label.toLowerCase()}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-border bg-secondary/60 p-0.5">
            <button
              onClick={() => {
                setMode('ai');
                // Re-read in case the provider was connected while this dialog was open.
                const latest = loadAiSettings();
                setAiSettings(latest);
                if (isAiConfigured(latest) && aiItems.length === 0 && !loading) void runAi(latest);
              }}
              aria-pressed={mode === 'ai'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'ai' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Wand2 className="h-3.5 w-3.5" /> AI
            </button>
            <button
              onClick={() => setMode('templates')}
              aria-pressed={mode === 'templates'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'templates' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Built-in
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpenSettings}>
            <Settings2 className="h-3.5 w-3.5" /> AI settings
          </Button>
        </div>

        {mode === 'ai' && !isAiConfigured(aiSettings) && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/70 p-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No AI provider connected yet. <button onClick={onOpenSettings} className="font-medium underline">Connect a model</button>{' '}
              (Claude, OpenAI, or a compatible gateway) to have it write copy from your inputs — or switch to the
              built-in generator.
            </span>
          </div>
        )}

        {mode === 'templates' && !hasSignals && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Add some <strong>keywords</strong> and an ad group <strong>theme</strong>, <strong>search intent</strong>, or{' '}
              <strong>context</strong> for more relevant suggestions.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Writing {label.toLowerCase()} from your keywords and context…
          </div>
        ) : (
          <>
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
              {suggestions.length === 0 && !error && (
                <li className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No suggestions yet. Use Regenerate{mode === 'ai' ? '' : ' or add more keywords/context'}.
                </li>
              )}
            </ul>
          </>
        )}

        <Badge tone={mode === 'ai' && isAiConfigured(aiSettings) ? 'info' : 'neutral'} className="self-start">
          {mode === 'ai' && isAiConfigured(aiSettings)
            ? `AI: ${aiSettings?.model} · review before adding`
            : 'Generated locally · review before adding'}
        </Badge>
      </div>
    </Dialog>
  );
}
