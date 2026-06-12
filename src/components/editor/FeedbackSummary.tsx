import { useMemo, useState } from 'react';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Filter, ArrowRight, CheckCheck } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent, Checkbox } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ReviewStatusBadge, CampaignStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { computeCampaignProgress, getAssetFeedback } from '@/lib/review';
import { formatRelativeTime } from '@/lib/utils';
import type { ReviewStatus } from '@/types';
import type { View } from '@/app/navigation';

interface FeedbackItem {
  key: string;
  assetId?: string;
  adGroupId: string;
  adGroupName: string;
  assetType: 'Headline' | 'Description' | 'Keyword section' | 'Ad group';
  number?: number;
  text: string;
  status: ReviewStatus;
  comment: string;
  reviewer?: string;
  updatedAt?: string;
}

export function FeedbackSummary({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { campaign, review, internal, updateInternal } = useStore();
  const [onlyAction, setOnlyAction] = useState(false);

  const items = useMemo<FeedbackItem[]>(() => {
    if (!campaign || !review) return [];
    const result: FeedbackItem[] = [];
    for (const ag of campaign.adGroups) {
      const agReview = review.adGroupReviews[ag.id];
      if (!agReview) continue;
      ag.headlines.forEach((h, i) => {
        const f = getAssetFeedback(agReview, h.id);
        if (f.status !== 'pending' || f.comment.trim())
          result.push({
            key: h.id,
            assetId: h.id,
            adGroupId: ag.id,
            adGroupName: ag.name,
            assetType: 'Headline',
            number: i + 1,
            text: h.text,
            status: f.status,
            comment: f.comment,
            reviewer: f.reviewerName ?? review.reviewer?.name,
            updatedAt: f.updatedAt,
          });
      });
      ag.descriptions.forEach((d, i) => {
        const f = getAssetFeedback(agReview, d.id);
        if (f.status !== 'pending' || f.comment.trim())
          result.push({
            key: d.id,
            assetId: d.id,
            adGroupId: ag.id,
            adGroupName: ag.name,
            assetType: 'Description',
            number: i + 1,
            text: d.text,
            status: f.status,
            comment: f.comment,
            reviewer: f.reviewerName ?? review.reviewer?.name,
            updatedAt: f.updatedAt,
          });
      });
      if (agReview.keywordFeedback.status !== 'pending' || agReview.keywordFeedback.generalComment.trim()) {
        result.push({
          key: `kw-${ag.id}`,
          adGroupId: ag.id,
          adGroupName: ag.name,
          assetType: 'Keyword section',
          text: agReview.keywordFeedback.generalComment || `${ag.keywords.length} keywords`,
          status: agReview.keywordFeedback.status,
          comment: agReview.keywordFeedback.generalComment,
          reviewer: review.reviewer?.name,
        });
      }
      if (agReview.overallStatus !== 'pending' || agReview.generalComment.trim()) {
        result.push({
          key: `ag-${ag.id}`,
          adGroupId: ag.id,
          adGroupName: ag.name,
          assetType: 'Ad group',
          text: agReview.generalComment || 'Overall ad group status',
          status: agReview.overallStatus,
          comment: agReview.generalComment,
          reviewer: review.reviewer?.name,
        });
      }
    }
    return result;
  }, [campaign, review]);

  if (!campaign || !review) return null;
  const progress = computeCampaignProgress(campaign, review);

  const isResolved = (key: string) => internal?.resolvedFeedback[key] ?? false;
  const needsAction = (it: FeedbackItem) => it.status === 'changes_requested' && !isResolved(it.key);

  const visible = onlyAction ? items.filter(needsAction) : items;

  // Group by ad group
  const grouped = visible.reduce<Record<string, FeedbackItem[]>>((acc, it) => {
    (acc[it.adGroupName] ??= []).push(it);
    return acc;
  }, {});

  const setResolution = (key: string, note: string) =>
    updateInternal((data) => ({ ...data, resolutionNotes: { ...data.resolutionNotes, [key]: note } }));
  const toggleResolved = (key: string, resolved: boolean) =>
    updateInternal((data) => ({ ...data, resolvedFeedback: { ...data.resolvedFeedback, [key]: resolved } }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Client Feedback</h2>
          <p className="text-sm text-muted-foreground">All approvals and comments in one place.</p>
        </div>
        <CampaignStatusBadge status={review.campaignStatus} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={MessageSquare} label="Total comments" value={progress.outstandingComments} tone="info" />
        <SummaryCard icon={CheckCircle2} label="Approved assets" value={progress.headlines.approved + progress.descriptions.approved} tone="success" />
        <SummaryCard icon={Clock} label="Pending assets" value={progress.headlines.pending + progress.descriptions.pending} tone="warning" />
        <SummaryCard icon={AlertCircle} label="Changes requested" value={progress.headlines.changesRequested + progress.descriptions.changesRequested} tone="destructive" />
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          id="only-action"
          checked={onlyAction}
          onCheckedChange={setOnlyAction}
          label={
            <span className="inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Show only items requiring action
            </span>
          }
        />
        <span className="text-sm text-muted-foreground">{visible.length} items</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title={onlyAction ? 'Nothing needs action' : 'No client feedback yet'}
          description={
            onlyAction
              ? 'There are no unresolved change requests right now.'
              : 'Client approvals and comments will appear here as the review progresses.'
          }
        />
      ) : (
        Object.entries(grouped).map(([groupName, groupItems]) => (
          <div key={groupName} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{groupName}</h3>
            {groupItems.map((it) => {
              const resolved = isResolved(it.key);
              return (
                <Card key={it.key}>
                  <CardContent className="flex flex-col gap-2 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">
                        {it.assetType}
                        {it.number ? ` ${it.number}` : ''}
                      </Badge>
                      <ReviewStatusBadge status={it.status} />
                      {resolved && (
                        <Badge tone="success">
                          <CheckCheck className="h-3 w-3" /> Resolved
                        </Badge>
                      )}
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate({ kind: 'adgroup', id: it.adGroupId })}
                      >
                        Go to asset <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">“{it.text}”</p>
                    {it.comment && (
                      <div className="flex items-start gap-1.5 rounded bg-secondary/40 p-2 text-sm">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{it.comment}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {it.reviewer && <span>Reviewer: {it.reviewer}</span>}
                      {it.updatedAt && <span>· Updated {formatRelativeTime(it.updatedAt)}</span>}
                    </div>
                    {(it.status === 'changes_requested' || it.comment) && (
                      <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                        <input
                          value={internal?.resolutionNotes[it.key] ?? ''}
                          onChange={(e) => setResolution(it.key, e.target.value)}
                          placeholder="Internal resolution note…"
                          className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <Checkbox
                          id={`res-${it.key}`}
                          checked={resolved}
                          onCheckedChange={(c) => toggleResolved(it.key, c)}
                          label={<span className="text-xs">Mark resolved</span>}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: number;
  tone: 'info' | 'success' | 'warning' | 'destructive';
}) {
  const colors = {
    info: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    destructive: 'bg-red-50 text-red-600',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
