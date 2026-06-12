import { useMemo, useState } from 'react';
import { Plus, Trash2, Search, ClipboardPaste, Ban } from 'lucide-react';
import type { AdGroup, Keyword, MatchType } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/primitives';
import { BulkKeywordDialog } from './BulkKeywordDialog';
import { createKeyword } from '@/lib/campaign-ops';
import { formatKeyword } from '@/lib/parsing';
import { findDuplicateTexts } from '@/lib/validation';
import { cn } from '@/lib/utils';

export function KeywordManager({ adGroup }: { adGroup: AdGroup }) {
  const { mutateAdGroup } = useStore();
  const toast = useToast();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [negBulkOpen, setNegBulkOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterMatch, setFilterMatch] = useState<'all' | MatchType>('all');
  const [newText, setNewText] = useState('');
  const [newMatch, setNewMatch] = useState<MatchType>('broad');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const dupes = useMemo(
    () => findDuplicateTexts(adGroup.keywords.map((k) => ({ text: `${k.text}::${k.matchType}` }))),
    [adGroup.keywords],
  );

  const filtered = useMemo(() => {
    return adGroup.keywords.filter((k) => {
      if (filterMatch !== 'all' && k.matchType !== filterMatch) return false;
      if (query && !k.text.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [adGroup.keywords, filterMatch, query]);

  function setKeywords(updater: (kws: Keyword[]) => Keyword[], field: 'keywords' | 'negativeKeywords' = 'keywords') {
    mutateAdGroup(adGroup.id, 'canEditKeywords', (ag) => ({ ...ag, [field]: updater(ag[field]) }));
  }

  function addKeyword() {
    if (!newText.trim()) return;
    setKeywords((kws) => [...kws, createKeyword(newText, newMatch)]);
    setNewText('');
  }

  function importKeywords(items: { text: string; matchType: MatchType }[], mode: 'append' | 'replace') {
    const created = items.map((i) => createKeyword(i.text, i.matchType));
    setKeywords((kws) => (mode === 'replace' ? created : [...kws, ...created]));
    toast(`${created.length} keywords ${mode === 'replace' ? 'replaced' : 'added'}`);
  }

  function applyMatchToSelected(matchType: MatchType) {
    setKeywords((kws) => kws.map((k) => (selected.has(k.id) ? { ...k, matchType } : k)));
    toast(`Applied ${matchType} match to ${selected.size} keywords`);
    setSelected(new Set());
  }

  function dupKey(k: Keyword) {
    return `${k.text}::${k.matchType}`.trim().toLowerCase();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords…"
            className="pl-8"
            aria-label="Search keywords"
          />
        </div>
        <Select value={filterMatch} onChange={(e) => setFilterMatch(e.target.value as 'all' | MatchType)} className="w-auto">
          <option value="all">All match types</option>
          <option value="broad">Broad</option>
          <option value="phrase">Phrase</option>
          <option value="exact">Exact</option>
        </Select>
        <Button variant="outline" size="md" onClick={() => setBulkOpen(true)}>
          <ClipboardPaste className="h-4 w-4" /> Paste Keywords
        </Button>
      </div>

      {/* Quick add */}
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-secondary/30 p-3">
        <div className="flex-1 min-w-[180px]">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Add a single keyword…"
            aria-label="New keyword text"
          />
        </div>
        <Select value={newMatch} onChange={(e) => setNewMatch(e.target.value as MatchType)} className="w-auto">
          <option value="broad">Broad</option>
          <option value="phrase">Phrase</option>
          <option value="exact">Exact</option>
        </Select>
        <Button onClick={addKeyword} disabled={!newText.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-accent/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected — apply match type:</span>
          {(['broad', 'phrase', 'exact'] as MatchType[]).map((mt) => (
            <Button key={mt} variant="ghost" size="sm" className="capitalize" onClick={() => applyMatchToSelected(mt)}>
              {mt}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setKeywords((kws) => kws.filter((k) => !selected.has(k.id)));
              setSelected(new Set());
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}

      {/* Keyword table */}
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-2 py-2">Keyword</th>
              <th className="px-2 py-2">Match type</th>
              <th className="px-2 py-2">Active</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  {adGroup.keywords.length === 0 ? 'No keywords yet — paste or add some.' : 'No keywords match your filters.'}
                </td>
              </tr>
            )}
            {filtered.map((k) => {
              const isDup = dupes.has(dupKey(k));
              return (
                <tr key={k.id} className={cn('hover:bg-secondary/40', !k.active && 'opacity-50')}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${k.text}`}
                      checked={selected.has(k.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(k.id)) next.delete(k.id);
                        else next.add(k.id);
                        setSelected(next);
                      }}
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={k.text}
                      onChange={(e) =>
                        setKeywords((kws) => kws.map((x) => (x.id === k.id ? { ...x, text: e.target.value } : x)))
                      }
                      className="w-full bg-transparent font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
                      aria-label="Keyword text"
                    />
                    <span className="block px-1 text-[11px] text-muted-foreground">
                      {formatKeyword(k.text, k.matchType)}
                      {isDup && <span className="ml-1 text-amber-600">· duplicate</span>}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <Select
                      value={k.matchType}
                      onChange={(e) =>
                        setKeywords((kws) =>
                          kws.map((x) => (x.id === k.id ? { ...x, matchType: e.target.value as MatchType } : x)),
                        )
                      }
                      className="h-8 w-28 text-xs"
                      aria-label="Match type"
                    >
                      <option value="broad">Broad</option>
                      <option value="phrase">Phrase</option>
                      <option value="exact">Exact</option>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() =>
                        setKeywords((kws) => kws.map((x) => (x.id === k.id ? { ...x, active: !x.active } : x)))
                      }
                      aria-label={k.active ? 'Deactivate keyword' : 'Activate keyword'}
                    >
                      <Badge tone={k.active ? 'success' : 'neutral'}>{k.active ? 'Active' : 'Paused'}</Badge>
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      aria-label="Delete keyword"
                      onClick={() => setKeywords((kws) => kws.filter((x) => x.id !== k.id))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Negative keywords */}
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Ban className="h-4 w-4 text-muted-foreground" /> Negative keywords
            <Badge tone="neutral">{adGroup.negativeKeywords.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setNegBulkOpen(true)}>
            <ClipboardPaste className="h-3.5 w-3.5" /> Paste negatives
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {adGroup.negativeKeywords.length === 0 && (
            <span className="text-xs text-muted-foreground">None added.</span>
          )}
          {adGroup.negativeKeywords.map((nk) => (
            <Badge key={nk.id} tone="neutral" className="gap-1">
              {nk.text}
              <button
                aria-label={`Remove negative ${nk.text}`}
                onClick={() => setKeywords((kws) => kws.filter((x) => x.id !== nk.id), 'negativeKeywords')}
                className="ml-0.5 text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <BulkKeywordDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onImport={importKeywords} />
      <BulkKeywordDialog
        open={negBulkOpen}
        onClose={() => setNegBulkOpen(false)}
        negative
        onImport={(items, _mode) => {
          const created = items.map((i) => createKeyword(i.text, i.matchType));
          setKeywords((kws) => [...kws, ...created], 'negativeKeywords');
          toast(`${created.length} negative keywords added`);
        }}
      />
    </div>
  );
}
