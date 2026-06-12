import { ClipboardCheck, Download, Printer, Cloud, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Input } from '@/components/ui/primitives';
import { useStore } from '@/store/CampaignStore';
import { formatRelativeTime } from '@/lib/utils';
import { computeCampaignProgress } from '@/lib/review';

export function ClientReviewHeader({ onExport }: { onExport: () => void }) {
  const { campaign, review, updateReview, saveStatus, lastSavedAt, isLocked } = useStore();
  if (!campaign || !review) return null;

  const progress = computeCampaignProgress(campaign, review);

  return (
    <div className="flex flex-col gap-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold leading-tight">{campaign.campaignName}</h1>
              <Badge tone="primary" className="shrink-0">
                Client Review
              </Badge>
              {isLocked && (
                <Badge tone="success" className="shrink-0">
                  <Lock className="h-3 w-3" /> Submitted
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Prepared for {campaign.clientName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === 'saving' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-success" />
            )}
            <span className="hidden sm:inline">
              {saveStatus === 'saving' ? 'Saving…' : `Saved ${formatRelativeTime(lastSavedAt ?? undefined)}`}
            </span>
          </span>
          <div className="hidden items-center gap-1.5 sm:flex">
            <label htmlFor="reviewer-name" className="text-xs text-muted-foreground">
              Reviewer
            </label>
            <Input
              id="reviewer-name"
              value={review.reviewer?.name ?? ''}
              disabled={isLocked}
              onChange={(e) =>
                updateReview((r) => ({
                  ...r,
                  reviewer: { ...(r.reviewer ?? { name: '' }), name: e.target.value },
                }))
              }
              placeholder="Your name"
              className="h-8 w-36 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> Export Feedback
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={progress.percent} className="max-w-xs" tone={progress.percent === 100 ? 'success' : 'primary'} />
        <span className="text-xs text-muted-foreground">
          Review {progress.percent}% complete · {progress.completedItems}/{progress.totalItems} items
        </span>
      </div>
    </div>
  );
}
