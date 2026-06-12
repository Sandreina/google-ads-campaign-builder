import { CheckCircle2, Clock, AlertCircle, MessageSquare, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { computeCampaignProgress, computeAdGroupProgress } from '@/lib/review';
import type { View } from '@/app/navigation';

export function ClientReviewSummary({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { campaign, review } = useStore();
  if (!campaign || !review) return null;
  const progress = computeCampaignProgress(campaign, review);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold">Review summary</h2>
        <p className="text-muted-foreground">Your progress across the whole campaign.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CheckCircle2} tone="success" label="Approved" value={progress.headlines.approved + progress.descriptions.approved} />
        <Stat icon={Clock} tone="warning" label="Pending" value={progress.headlines.pending + progress.descriptions.pending} />
        <Stat icon={AlertCircle} tone="destructive" label="Changes requested" value={progress.headlines.changesRequested + progress.descriptions.changesRequested} />
        <Stat icon={MessageSquare} tone="info" label="Comments" value={progress.outstandingComments} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-3">
            <Progress value={progress.percent} className="flex-1" tone={progress.percent === 100 ? 'success' : 'primary'} />
            <span className="text-sm font-medium tabular-nums">{progress.percent}%</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Headlines: {progress.headlines.approved}/{progress.headlines.total} approved</span>
            <span>Descriptions: {progress.descriptions.approved}/{progress.descriptions.total} approved</span>
            <span>Keyword sections: {progress.keywordSections.approved}/{progress.keywordSections.total} approved</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {campaign.adGroups.map((ag) => {
          const agProgress = computeAdGroupProgress(ag, review);
          return (
            <Card key={ag.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{ag.name}</span>
                    <ReviewStatusBadge status={agProgress.overallStatus} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={agProgress.percent} className="max-w-[200px]" />
                    <span className="text-xs text-muted-foreground">{agProgress.percent}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone="success">{agProgress.headlines.approved + agProgress.descriptions.approved} approved</Badge>
                  <Badge tone="warning">{agProgress.headlines.pending + agProgress.descriptions.pending} pending</Badge>
                  <Badge tone="destructive">
                    {agProgress.headlines.changesRequested + agProgress.descriptions.changesRequested} changes
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate({ kind: 'adgroup', id: ag.id })}>
                  Review <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onNavigate({ kind: 'final' })}>
          Go to final approval <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'destructive' | 'info';
}) {
  const colors = {
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    destructive: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
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
