import { MessageSquare, CheckCircle2 } from 'lucide-react';
import type { AdGroup, ReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { AutoTextarea } from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/primitives';
import { EmptyState } from '@/components/shared/EmptyState';
import { getAssetFeedback } from '@/lib/review';

/** Editor-facing view of client feedback for a single ad group. */
export function EditorFeedbackPanel({ adGroup }: { adGroup: AdGroup }) {
  const { review, internal, updateInternal } = useStore();
  if (!review) return null;
  const agReview = review.adGroupReviews[adGroup.id];

  const items: {
    id: string;
    type: string;
    number: number;
    text: string;
    status: ReviewStatus;
    comment: string;
  }[] = [];

  adGroup.headlines.forEach((h, i) => {
    const f = agReview ? getAssetFeedback(agReview, h.id) : null;
    if (f && (f.status !== 'pending' || f.comment.trim())) {
      items.push({ id: h.id, type: 'Headline', number: i + 1, text: h.text, status: f.status, comment: f.comment });
    }
  });
  adGroup.descriptions.forEach((d, i) => {
    const f = agReview ? getAssetFeedback(agReview, d.id) : null;
    if (f && (f.status !== 'pending' || f.comment.trim())) {
      items.push({ id: d.id, type: 'Description', number: i + 1, text: d.text, status: f.status, comment: f.comment });
    }
  });

  const keywordFeedback = agReview?.keywordFeedback;
  const generalComment = agReview?.generalComment?.trim();

  const hasAny = items.length > 0 || (keywordFeedback && (keywordFeedback.status !== 'pending' || keywordFeedback.generalComment.trim())) || generalComment;

  if (!hasAny) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No client feedback yet"
        description="When the client reviews this ad group, their approvals and comments will appear here."
      />
    );
  }

  const setResolution = (assetId: string, note: string) =>
    updateInternal((data) => ({ ...data, resolutionNotes: { ...data.resolutionNotes, [assetId]: note } }));
  const toggleResolved = (assetId: string, resolved: boolean) =>
    updateInternal((data) => ({ ...data, resolvedFeedback: { ...data.resolvedFeedback, [assetId]: resolved } }));

  return (
    <div className="flex flex-col gap-3">
      {generalComment && (
        <div className="rounded-md border border-border bg-secondary/30 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Ad group note from client</p>
          <p className="mt-1 text-sm">{generalComment}</p>
        </div>
      )}

      {keywordFeedback && (keywordFeedback.status !== 'pending' || keywordFeedback.generalComment.trim()) && (
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Keyword section</span>
            <ReviewStatusBadge status={keywordFeedback.status} />
          </div>
          {keywordFeedback.generalComment.trim() && (
            <p className="mt-1.5 text-sm text-muted-foreground">{keywordFeedback.generalComment}</p>
          )}
          {keywordFeedback.flaggedKeywordIds.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-600">
              {keywordFeedback.flaggedKeywordIds.length} keyword(s) flagged for discussion
            </p>
          )}
        </div>
      )}

      {items.map((item) => {
        const resolved = internal?.resolvedFeedback[item.id] ?? false;
        return (
          <div key={item.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {item.type} {item.number}
              </span>
              <ReviewStatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">“{item.text}”</p>
            {item.comment && (
              <div className="mt-2 flex items-start gap-1.5 rounded bg-secondary/40 p-2 text-sm">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item.comment}</span>
              </div>
            )}
            {(item.status === 'changes_requested' || item.comment) && (
              <div className="mt-2 flex flex-col gap-1.5">
                <AutoTextarea
                  value={internal?.resolutionNotes[item.id] ?? ''}
                  onChange={(e) => setResolution(item.id, e.target.value)}
                  placeholder="Internal resolution note (never shown to the client)…"
                  rows={1}
                  className="text-sm"
                />
                <Checkbox
                  id={`resolved-${item.id}`}
                  checked={resolved}
                  onCheckedChange={(c) => toggleResolved(item.id, c)}
                  label={
                    <span className="inline-flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Mark resolved
                    </span>
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
