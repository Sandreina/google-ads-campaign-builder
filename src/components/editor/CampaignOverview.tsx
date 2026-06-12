import { Target, DollarSign, MapPin, Languages, Calendar, Gauge } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { InternalNote } from './InternalNote';
import { computeCampaignProgress } from '@/lib/review';
import { adGroupAssetCounts } from '@/lib/validation';
import { Progress } from '@/components/ui/Progress';

export function CampaignOverview() {
  const { campaign, review, patchCampaign, internal, updateInternal } = useStore();
  if (!campaign || !review) return null;

  const progress = computeCampaignProgress(campaign, review);
  const totals = campaign.adGroups.reduce(
    (acc, ag) => {
      const c = adGroupAssetCounts(ag);
      acc.keywords += c.keywords;
      acc.headlines += c.headlines;
      acc.descriptions += c.descriptions;
      return acc;
    },
    { keywords: 0, headlines: 0, descriptions: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Campaign Overview</h2>
        <p className="text-sm text-muted-foreground">Edit campaign settings and review progress at a glance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ad groups" value={campaign.adGroups.length} icon={Target} />
        <StatCard label="Keywords" value={totals.keywords} icon={Gauge} />
        <StatCard label="Headlines" value={totals.headlines} icon={Target} />
        <StatCard label="Descriptions" value={totals.descriptions} icon={Target} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client review progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Progress value={progress.percent} className="flex-1" />
            <span className="text-sm font-medium tabular-nums">{progress.percent}%</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Headlines: {progress.headlines.approved}/{progress.headlines.total} approved</span>
            <span>Descriptions: {progress.descriptions.approved}/{progress.descriptions.total} approved</span>
            <span>Ad groups approved: {progress.adGroups.approved}/{progress.adGroups.total}</span>
            <span>{progress.outstandingComments} comments</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Campaign name">
              <Input value={campaign.campaignName} onChange={(e) => patchCampaign({ campaignName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client name">
                <Input value={campaign.clientName} onChange={(e) => patchCampaign({ clientName: e.target.value })} />
              </Field>
              <Field label="Account name">
                <Input value={campaign.accountName ?? ''} onChange={(e) => patchCampaign({ accountName: e.target.value })} />
              </Field>
            </div>
            <Field label="Objective">
              <Textarea value={campaign.objective ?? ''} onChange={(e) => patchCampaign({ objective: e.target.value })} rows={2} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Campaign type">
                <Input value={campaign.campaignType} onChange={(e) => patchCampaign({ campaignType: e.target.value })} />
              </Field>
              <Field label="Bidding strategy">
                <Input value={campaign.biddingStrategy ?? ''} onChange={(e) => patchCampaign({ biddingStrategy: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget">
                <Input
                  type="number"
                  value={campaign.budget ?? ''}
                  onChange={(e) => patchCampaign({ budget: e.target.value ? Number(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Budget period">
                <Select
                  value={campaign.budgetPeriod ?? 'daily'}
                  onChange={(e) => patchCampaign({ budgetPeriod: e.target.value as 'daily' | 'monthly' })}
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Locations" hint="Comma-separated">
                <Input
                  value={campaign.locations.join(', ')}
                  onChange={(e) => patchCampaign({ locations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
              <Field label="Languages" hint="Comma-separated">
                <Input
                  value={campaign.languages.join(', ')}
                  onChange={(e) => patchCampaign({ languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
            </div>
            <Field label="Start date">
              <Input type="date" value={campaign.startDate ?? ''} onChange={(e) => patchCampaign({ startDate: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              <SummaryRow icon={Target} label="Objective" value={campaign.objective ?? '—'} />
              <SummaryRow icon={DollarSign} label="Budget" value={campaign.budget ? `$${campaign.budget} / ${campaign.budgetPeriod}` : '—'} />
              <SummaryRow icon={Gauge} label="Bidding" value={campaign.biddingStrategy ?? '—'} />
              <SummaryRow icon={MapPin} label="Locations" value={campaign.locations.join(', ') || '—'} />
              <SummaryRow icon={Languages} label="Languages" value={campaign.languages.join(', ') || '—'} />
              <SummaryRow icon={Calendar} label="Start date" value={campaign.startDate ?? '—'} />
            </CardContent>
          </Card>

          <InternalNote
            label="Campaign note"
            value={internal?.campaignNote ?? ''}
            onChange={(value) => updateInternal((data) => ({ ...data, campaignNote: value }))}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Target }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
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

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 break-words font-medium">{value}</span>
    </div>
  );
}
