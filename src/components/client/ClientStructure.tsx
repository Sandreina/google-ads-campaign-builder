import { Network, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { adGroupAssetCounts } from '@/lib/validation';
import { computeAdGroupProgress } from '@/lib/review';
import type { View } from '@/app/navigation';

export function ClientStructure({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { campaign, review } = useStore();
  if (!campaign || !review) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Campaign structure</h2>
        <p className="text-muted-foreground">The proposed campaign is organized into the ad groups below.</p>
      </div>

      {campaign.adGroups.length === 0 ? (
        <EmptyState icon={Network} title="No ad groups" description="This campaign has no ad groups yet." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {campaign.adGroups.map((ag) => {
            const counts = adGroupAssetCounts(ag);
            const progress = computeAdGroupProgress(ag, review);
            return (
              <Card key={ag.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{ag.name}</h3>
                      <ReviewStatusBadge status={progress.overallStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {ag.theme || 'Ad group'} · {counts.activeHeadlines} headlines · {counts.activeDescriptions} descriptions ·{' '}
                      {counts.keywords} keywords
                    </p>
                  </div>
                  <Badge tone="neutral">{progress.percent}% reviewed</Badge>
                  <Button variant="outline" size="sm" onClick={() => onNavigate({ kind: 'adgroup', id: ag.id })}>
                    Review <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
