import { Fragment, useMemo, useState } from 'react';
import { Search, Flag } from 'lucide-react';
import type { AdGroup, MatchType, ReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { Input } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { ApprovalControls } from './ApprovalControls';
import { ClientCommentField } from './ClientCommentField';
import { formatKeyword } from '@/lib/parsing';
import { cn } from '@/lib/utils';

const MATCH_TONE: Record<MatchType, 'neutral' | 'info' | 'primary'> = {
  broad: 'neutral',
  phrase: 'info',
  exact: 'primary',
};

const MATCH_HELP: Record<MatchType, string> = {
  broad: 'Broad match: shows for related searches, including synonyms and variations.',
  phrase: 'Phrase match: shows for searches that include the meaning of the keyword.',
  exact: 'Exact match: shows for searches with the same meaning as the keyword.',
};

export function KeywordReview({ adGroup }: { adGroup: AdGroup }) {
  const { review, updateReview, isLocked } = useStore();
  const [query, setQuery] = useState('');
  if (!review) return null;

  const agReview = review.adGroupReviews[adGroup.id];
  const kf = agReview.keywordFeedback;

  const filtered = useMemo(
    () => adGroup.keywords.filter((k) => k.text.toLowerCase().includes(query.toLowerCase())),
    [adGroup.keywords, query],
  );

  function patchKeywordFeedback(patch: Partial<typeof kf>) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: {
        ...r.adGroupReviews,
        [adGroup.id]: { ...r.adGroupReviews[adGroup.id], keywordFeedback: { ...kf, ...patch } },
      },
    }));
  }

  function setStatus(status: ReviewStatus) {
    patchKeywordFeedback({ status });
  }

  function toggleFlag(keywordId: string) {
    const flagged = kf.flaggedKeywordIds.includes(keywordId)
      ? kf.flaggedKeywordIds.filter((id) => id !== keywordId)
      : [...kf.flaggedKeywordIds, keywordId];
    patchKeywordFeedback({ flaggedKeywordIds: flagged });
  }

  function setKeywordComment(keywordId: string, comment: string) {
    patchKeywordFeedback({ keywordComments: { ...kf.keywordComments, [keywordId]: comment } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Keyword strategy</h3>
          <Badge tone="neutral">{adGroup.keywords.length} keywords</Badge>
          <ReviewStatusBadge status={kf.status} />
        </div>
        <ApprovalControls status={kf.status} onChange={setStatus} disabled={isLocked} size="sm" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keywords…"
          className="pl-8"
          aria-label="Search keywords"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Keyword</th>
              <th className="px-3 py-2">Match type</th>
              <th className="w-12 px-3 py-2 text-center">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((k) => {
              const flagged = kf.flaggedKeywordIds.includes(k.id);
              return (
                <Fragment key={k.id}>
                  <tr className={cn(flagged && 'bg-amber-50/50')}>
                    <td className="px-3 py-2 font-mono">{formatKeyword(k.text, k.matchType)}</td>
                    <td className="px-3 py-2">
                      <Tooltip content={MATCH_HELP[k.matchType]}>
                        <Badge tone={MATCH_TONE[k.matchType]} className="capitalize">
                          {k.matchType}
                        </Badge>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleFlag(k.id)}
                        disabled={isLocked}
                        aria-label={flagged ? `Unflag ${k.text}` : `Flag ${k.text} for discussion`}
                        aria-pressed={flagged}
                        className={cn(
                          'rounded p-1 transition-colors disabled:opacity-50',
                          flagged ? 'text-amber-600' : 'text-muted-foreground hover:text-amber-600',
                        )}
                      >
                        <Flag className={cn('h-4 w-4', flagged && 'fill-amber-400')} />
                      </button>
                    </td>
                  </tr>
                  {flagged && (
                    <tr className="bg-amber-50/30">
                      <td colSpan={3} className="px-3 pb-2">
                        <ClientCommentField
                          value={kf.keywordComments[k.id] ?? ''}
                          onChange={(v) => setKeywordComment(k.id, v)}
                          disabled={isLocked}
                          placeholder="Why are you flagging this keyword?"
                          label="Flagged keyword note"
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  No keywords match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ClientCommentField
        value={kf.generalComment}
        onChange={(v) => patchKeywordFeedback({ generalComment: v })}
        disabled={isLocked}
        recommended={kf.status === 'changes_requested'}
        label="General note on keyword strategy"
        placeholder="Share any overall thoughts on the keyword strategy…"
        rows={2}
      />
    </div>
  );
}
