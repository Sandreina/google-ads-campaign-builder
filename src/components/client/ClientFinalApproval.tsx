import { useState } from 'react';
import { Flag, CheckCircle2, MessageSquareWarning, XCircle, Lock, RotateCcw } from 'lucide-react';
import type { CampaignReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle, Field, Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { CampaignChecklist } from './Checklists';
import { ClientCommentField } from './ClientCommentField';
import { CampaignStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { computeCampaignProgress } from '@/lib/review';
import { CAMPAIGN_CHECKLIST_ITEMS } from '@/lib/constants';
import { formatDateTime, nowIso } from '@/lib/utils';

const SUBMISSION_NOTICE =
  'By submitting this review, the reviewer confirms that the proposed campaign structure, keywords, headlines, descriptions, and landing page direction have been reviewed.';

export function ClientFinalApproval() {
  const { campaign, review, updateReview, isLocked, reopenReview } = useStore();
  const toast = useToast();
  const [pendingStatus, setPendingStatus] = useState<CampaignReviewStatus | null>(null);
  if (!campaign || !review) return null;

  const progress = computeCampaignProgress(campaign, review);
  const checklistDone = CAMPAIGN_CHECKLIST_ITEMS.filter((i) => review.campaignChecklist[i.key]).length;

  function setReviewerField(field: 'name' | 'title' | 'email', value: string) {
    updateReview((r) => ({ ...r, reviewer: { ...(r.reviewer ?? { name: '' }), [field]: value } }));
  }

  function submit(status: CampaignReviewStatus) {
    updateReview((r) => ({ ...r, campaignStatus: status, submittedAt: nowIso() }));
    toast('Review submitted — thank you!');
    setPendingStatus(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Final approval</h2>
          <p className="text-muted-foreground">Complete the checklist and submit your overall review.</p>
        </div>
        <CampaignStatusBadge status={review.campaignStatus} />
      </div>

      {isLocked && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Lock className="h-4 w-4" /> You submitted this review on {formatDateTime(review.submittedAt)}.
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => { reopenReview(); toast('Review reopened'); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reopen to make changes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryStat label="Approved headlines" value={progress.headlines.approved} total={progress.headlines.total} />
          <SummaryStat label="Pending headlines" value={progress.headlines.pending} total={progress.headlines.total} />
          <SummaryStat label="Headlines needing changes" value={progress.headlines.changesRequested} total={progress.headlines.total} />
          <SummaryStat label="Approved descriptions" value={progress.descriptions.approved} total={progress.descriptions.total} />
          <SummaryStat label="Pending descriptions" value={progress.descriptions.pending} total={progress.descriptions.total} />
          <SummaryStat label="Descriptions needing changes" value={progress.descriptions.changesRequested} total={progress.descriptions.total} />
          <SummaryStat label="Keyword sections approved" value={progress.keywordSections.approved} total={progress.keywordSections.total} />
          <SummaryStat label="Ad groups approved" value={progress.adGroups.approved} total={progress.adGroups.total} />
          <SummaryStat label="Outstanding comments" value={progress.outstandingComments} />
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Campaign checklist
            <Badge tone={checklistDone === CAMPAIGN_CHECKLIST_ITEMS.length ? 'success' : 'neutral'}>
              {checklistDone}/{CAMPAIGN_CHECKLIST_ITEMS.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignChecklist />
        </CardContent>
      </Card>

      {/* Reviewer info */}
      <Card>
        <CardHeader>
          <CardTitle>Reviewer information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Reviewer name">
            <Input value={review.reviewer?.name ?? ''} disabled={isLocked} onChange={(e) => setReviewerField('name', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Title (optional)">
            <Input value={review.reviewer?.title ?? ''} disabled={isLocked} onChange={(e) => setReviewerField('title', e.target.value)} placeholder="e.g. Marketing Director" />
          </Field>
          <Field label="Email (optional)">
            <Input value={review.reviewer?.email ?? ''} disabled={isLocked} onChange={(e) => setReviewerField('email', e.target.value)} placeholder="you@example.com" type="email" />
          </Field>
          <div className="sm:col-span-3">
            <ClientCommentField
              value={review.finalComment}
              onChange={(v) => updateReview((r) => ({ ...r, finalComment: v }))}
              disabled={isLocked}
              label="Final note"
              placeholder="Any final thoughts on the campaign as a whole…"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Final actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Submit your review
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{SUBMISSION_NOTICE}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="success" disabled={isLocked} onClick={() => setPendingStatus('approved')}>
              <CheckCircle2 className="h-4 w-4" /> Approve campaign
            </Button>
            <Button variant="outline" disabled={isLocked} onClick={() => setPendingStatus('approved_with_comments')}>
              <MessageSquareWarning className="h-4 w-4" /> Approve with comments
            </Button>
            <Button variant="destructive" disabled={isLocked} onClick={() => setPendingStatus('changes_requested')}>
              <XCircle className="h-4 w-4" /> Request changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={pendingStatus !== null}
        onClose={() => setPendingStatus(null)}
        title="Confirm submission"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>
              Cancel
            </Button>
            <Button onClick={() => pendingStatus && submit(pendingStatus)}>Submit review</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p>{SUBMISSION_NOTICE}</p>
          <p className="text-muted-foreground">
            You're about to submit:{' '}
            <strong>
              {pendingStatus === 'approved'
                ? 'Approve campaign'
                : pendingStatus === 'approved_with_comments'
                  ? 'Approve with comments'
                  : 'Request changes'}
            </strong>
            . You can reopen the review afterwards if you need to make changes.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryStat({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xl font-semibold leading-none">
        {value}
        {total !== undefined && <span className="text-sm font-normal text-muted-foreground"> / {total}</span>}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
