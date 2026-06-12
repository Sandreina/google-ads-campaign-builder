import { Target, DollarSign, MapPin, Languages, Calendar, Gauge, Building2, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { computeCampaignProgress, computeAdGroupProgress } from '@/lib/review';
import { adGroupAssetCounts } from '@/lib/validation';
import type { View } from '@/app/navigation';

export function ClientOverview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { campaign, review } = useStore();
  if (!campaign || !review) return null;
  const progress = computeCampaignProgress(campaign, review);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold">Campaign review</h2>
        <p className="text-muted-foreground">
          Please review the proposed campaign below. You can approve items, request changes, and leave comments. Your
          feedback saves automatically.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-3">
            <Progress value={progress.percent} className="flex-1" tone={progress.percent === 100 ? 'success' : 'primary'} />
            <span className="text-sm font-medium tabular-nums">{progress.percent}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {progress.completedItems} of {progress.totalItems} review items completed.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Campaign details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 text-sm">
            <Row icon={Building2} label="Client" value={campaign.clientName} />
            <Row icon={Target} label="Objective" value={campaign.objective ?? '—'} />
            <Row icon={Gauge} label="Campaign type" value={campaign.campaignType} />
            <Row icon={DollarSign} label="Budget" value={campaign.budget ? `$${campaign.budget} / ${campaign.budgetPeriod}` : '—'} />
            <Row icon={Gauge} label="Bidding" value={campaign.biddingStrategy ?? '—'} />
            <Row icon={MapPin} label="Locations" value={campaign.locations.join(', ') || '—'} />
            <Row icon={Languages} label="Languages" value={campaign.languages.join(', ') || '—'} />
            <Row icon={Calendar} label="Start date" value={campaign.startDate ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ad groups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {campaign.adGroups.map((ag) => {
              const counts = adGroupAssetCounts(ag);
              const agProgress = computeAdGroupProgress(ag, review);
              return (
                <button
                  key={ag.id}
                  onClick={() => onNavigate({ kind: 'adgroup', id: ag.id })}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{ag.name}</span>
                      <Badge
                        tone={
                          agProgress.overallStatus === 'approved'
                            ? 'success'
                            : agProgress.overallStatus === 'changes_requested'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {agProgress.percent}%
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {counts.activeHeadlines} headlines · {counts.activeDescriptions} descriptions · {counts.keywords} keywords
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onNavigate({ kind: 'adgroup', id: campaign.adGroups[0]?.id ?? '' })} disabled={campaign.adGroups.length === 0}>
          Start reviewing <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 break-words font-medium">{value}</span>
    </div>
  );
}
