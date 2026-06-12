import { Flag, RotateCcw, GitBranch, CheckCircle2, MessageSquare } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CampaignStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { Progress } from '@/components/ui/Progress';
import { computeCampaignProgress, isAdGroupFullyApproved } from '@/lib/review';
import { formatDateTime } from '@/lib/utils';

export function EditorFinalApproval() {
  const { campaign, review, createNewVersion, reopenReview, isLocked } = useStore();
  const toast = useToast();
  if (!campaign || !review) return null;

  const progress = computeCampaignProgress(campaign, review);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Final Approval</h2>
          <p className="text-sm text-muted-foreground">The client's overall submission and version controls.</p>
        </div>
        <CampaignStatusBadge status={review.campaignStatus} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Submission status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {review.submittedAt ? (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Review submitted {formatDateTime(review.submittedAt)}</p>
                {review.reviewer && (
                  <p className="text-xs">
                    by {review.reviewer.name}
                    {review.reviewer.title ? `, ${review.reviewer.title}` : ''}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">The client has not submitted their final review yet.</p>
          )}

          {review.finalComment && (
            <div className="flex items-start gap-2 rounded-md bg-secondary/40 p-3 text-sm">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{review.finalComment}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Progress value={progress.percent} className="flex-1" />
            <span className="text-sm font-medium tabular-nums">{progress.percent}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ad group status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {campaign.adGroups.map((ag) => {
            const agReview = review.adGroupReviews[ag.id];
            const fully = isAdGroupFullyApproved(ag, review);
            return (
              <div key={ag.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="font-medium">{ag.name}</span>
                <div className="flex items-center gap-2">
                  {fully && (
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" /> Fully approved
                    </Badge>
                  )}
                  <Badge
                    tone={
                      agReview?.overallStatus === 'approved'
                        ? 'success'
                        : agReview?.overallStatus === 'changes_requested'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {agReview?.overallStatus === 'approved'
                      ? 'Approved'
                      : agReview?.overallStatus === 'changes_requested'
                        ? 'Changes requested'
                        : 'Pending'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revisions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Currently on <strong>Version {campaign.version}</strong>. Create a new version after making changes so the
            client knows to re-review. Editing an approved asset automatically resets its status to pending and marks it
            “Updated after review”.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                createNewVersion();
                toast(`Created version ${campaign.version + 1}`);
              }}
            >
              <GitBranch className="h-4 w-4" /> Create version {campaign.version + 1}
            </Button>
            {isLocked && (
              <Button
                variant="outline"
                onClick={() => {
                  reopenReview();
                  toast('Review reopened for the client');
                }}
              >
                <RotateCcw className="h-4 w-4" /> Reopen review for client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
