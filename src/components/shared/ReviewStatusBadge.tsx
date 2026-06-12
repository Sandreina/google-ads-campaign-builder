import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { CampaignReviewStatus, ReviewStatus } from '@/types';

const STATUS_META: Record<ReviewStatus, { label: string; tone: 'success' | 'warning' | 'destructive'; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  pending: { label: 'Pending review', tone: 'warning', icon: Clock },
  changes_requested: { label: 'Changes requested', tone: 'destructive', icon: AlertCircle },
};

const CAMPAIGN_STATUS_META: Record<
  CampaignReviewStatus,
  { label: string; tone: 'success' | 'warning' | 'destructive' | 'info' }
> = {
  approved: { label: 'Approved', tone: 'success' },
  approved_with_comments: { label: 'Approved with comments', tone: 'info' },
  changes_requested: { label: 'Changes requested', tone: 'destructive' },
  pending: { label: 'Pending review', tone: 'warning' },
};

export function ReviewStatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone} className={className}>
      <Icon className="h-3 w-3" aria-hidden />
      <span>{meta.label}</span>
    </Badge>
  );
}

export function CampaignStatusBadge({ status }: { status: CampaignReviewStatus }) {
  const meta = CAMPAIGN_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function statusLabel(status: ReviewStatus): string {
  return STATUS_META[status].label;
}
