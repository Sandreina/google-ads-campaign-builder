import { useRef } from 'react';
import { Pin, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdAsset, AssetType, ReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { ApprovalControls } from './ApprovalControls';
import { ClientCommentField } from './ClientCommentField';
import { CharCount } from '@/components/shared/CharCount';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { maxCharsFor } from '@/lib/validation';
import { getAssetFeedback } from '@/lib/review';
import { formatRelativeTime, nowIso } from '@/lib/utils';

const STATUS_RING: Record<ReviewStatus, string> = {
  approved: 'border-l-success',
  changes_requested: 'border-l-destructive',
  pending: 'border-l-amber-400',
};

/**
 * A single read-only headline/description with its own approval + comment area.
 * The client can never edit the asset text — only review controls are editable.
 */
export function AssetReviewCard({
  adGroupId,
  asset,
  type,
  number,
}: {
  adGroupId: string;
  asset: AdAsset;
  type: AssetType;
  number: number;
}) {
  const { review, updateReview, isLocked } = useStore();
  const commentRef = useRef<HTMLTextAreaElement>(null);
  if (!review) return null;

  const agReview = review.adGroupReviews[adGroupId];
  const feedback = getAssetFeedback(agReview, asset.id);
  const label = type === 'headline' ? 'Headline' : 'Description';

  function setStatus(status: ReviewStatus) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: {
        ...r.adGroupReviews,
        [adGroupId]: {
          ...r.adGroupReviews[adGroupId],
          assetFeedback: {
            ...r.adGroupReviews[adGroupId].assetFeedback,
            [asset.id]: {
              ...getAssetFeedback(r.adGroupReviews[adGroupId], asset.id),
              status,
              reviewerName: r.reviewer?.name,
              updatedAt: nowIso(),
            },
          },
        },
      },
    }));
    if (status === 'changes_requested') {
      // Focus the comment field to encourage explaining the request.
      setTimeout(() => commentRef.current?.focus(), 50);
    }
  }

  function setComment(comment: string) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: {
        ...r.adGroupReviews,
        [adGroupId]: {
          ...r.adGroupReviews[adGroupId],
          assetFeedback: {
            ...r.adGroupReviews[adGroupId].assetFeedback,
            [asset.id]: {
              ...getAssetFeedback(r.adGroupReviews[adGroupId], asset.id),
              comment,
              reviewerName: r.reviewer?.name,
              updatedAt: nowIso(),
            },
          },
        },
      },
    }));
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 border-border bg-card p-4 shadow-soft print-break',
        STATUS_RING[feedback.status],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground">
            {number}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          {asset.pinPosition ? (
            <Tooltip content={`Pinned to ${label.toLowerCase()} position ${asset.pinPosition}`}>
              <Badge tone="info">
                <Pin className="h-3 w-3" /> Pin {asset.pinPosition}
              </Badge>
            </Tooltip>
          ) : null}
          {asset.revisedAfterReview && (
            <Tooltip content="This asset was updated since your previous review.">
              <Badge tone="primary">
                <History className="h-3 w-3" /> Updated since your previous review
              </Badge>
            </Tooltip>
          )}
        </div>
        <ReviewStatusBadge status={feedback.status} />
      </div>

      <p className="mt-2 break-words text-base font-medium leading-snug">{asset.text}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <CharCount count={asset.text.trim().length} max={maxCharsFor(type)} />
        {feedback.updatedAt && (
          <span className="text-xs text-muted-foreground">· Updated {formatRelativeTime(feedback.updatedAt)}</span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
        <ApprovalControls status={feedback.status} onChange={setStatus} disabled={isLocked} size="sm" />
        <ClientCommentField
          ref={commentRef}
          value={feedback.comment}
          onChange={setComment}
          disabled={isLocked}
          recommended={feedback.status === 'changes_requested'}
          placeholder={`Add a comment about this ${label.toLowerCase()}…`}
        />
      </div>
    </div>
  );
}
