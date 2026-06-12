import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/CampaignStore';
import { searchCampaign, type SearchResult, type SearchKind } from '@/lib/search';
import { cn } from '@/lib/utils';
import type { View } from '@/app/navigation';

const KIND_TONE: Record<SearchKind, 'neutral' | 'info' | 'primary' | 'warning'> = {
  'Ad group': 'primary',
  Keyword: 'neutral',
  Headline: 'info',
  Description: 'info',
  'Client comment': 'warning',
  'Internal note': 'warning',
};

/** Command-palette style global search across the campaign (Editor Mode). */
export function GlobalSearchDialog({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  const { campaign, review, internal } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    if (!campaign) return [];
    return searchCampaign(campaign, review, internal, query, { includeInternal: true });
  }, [campaign, review, internal, query]);

  useEffect(() => setActive(0), [query]);

  function go(result: SearchResult) {
    if (result.adGroupId) onNavigate({ kind: 'adgroup', id: result.adGroupId });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Search campaign" size="lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ad groups, keywords, headlines, descriptions, comments…"
            className="h-11 pl-9 text-base"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          {query.trim() === '' ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type to search across the whole campaign.
            </p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No matches for “{query}”.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                      i === active ? 'bg-accent/70' : 'hover:bg-secondary',
                    )}
                  >
                    <Badge tone={KIND_TONE[r.kind]} className="shrink-0">
                      {r.kind}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      {r.subtitle && <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                    </span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>esc to close</span>
          {results.length > 0 && <span className="ml-auto">{results.length} results</span>}
        </div>
      </div>
    </Dialog>
  );
}
