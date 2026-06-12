import type { AdGroupChecklist as AdGroupChecklistType } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { Checkbox } from '@/components/ui/primitives';
import { AD_GROUP_CHECKLIST_ITEMS, CAMPAIGN_CHECKLIST_ITEMS } from '@/lib/constants';
import { Progress } from '@/components/ui/Progress';

export function AdGroupChecklist({ adGroupId }: { adGroupId: string }) {
  const { review, updateReview, isLocked } = useStore();
  if (!review) return null;
  const checklist = review.adGroupReviews[adGroupId].checklist;
  const done = AD_GROUP_CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;

  function toggle(key: keyof AdGroupChecklistType, value: boolean) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: {
        ...r.adGroupReviews,
        [adGroupId]: {
          ...r.adGroupReviews[adGroupId],
          checklist: { ...r.adGroupReviews[adGroupId].checklist, [key]: value },
        },
      },
    }));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Progress value={(done / AD_GROUP_CHECKLIST_ITEMS.length) * 100} className="flex-1" tone={done === AD_GROUP_CHECKLIST_ITEMS.length ? 'success' : 'primary'} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {done}/{AD_GROUP_CHECKLIST_ITEMS.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {AD_GROUP_CHECKLIST_ITEMS.map((item) => (
          <Checkbox
            key={item.key}
            id={`agcl-${adGroupId}-${item.key}`}
            checked={checklist[item.key]}
            onCheckedChange={(v) => toggle(item.key, v)}
            label={item.label}
            disabled={isLocked}
          />
        ))}
      </div>
    </div>
  );
}

export function CampaignChecklist() {
  const { review, updateReview, isLocked } = useStore();
  if (!review) return null;
  const checklist = review.campaignChecklist;
  const done = CAMPAIGN_CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;

  function toggle(key: string, value: boolean) {
    updateReview((r) => ({ ...r, campaignChecklist: { ...r.campaignChecklist, [key]: value } }));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Progress value={(done / CAMPAIGN_CHECKLIST_ITEMS.length) * 100} className="flex-1" tone={done === CAMPAIGN_CHECKLIST_ITEMS.length ? 'success' : 'primary'} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {done}/{CAMPAIGN_CHECKLIST_ITEMS.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {CAMPAIGN_CHECKLIST_ITEMS.map((item) => (
          <Checkbox
            key={item.key}
            id={`ccl-${item.key}`}
            checked={checklist[item.key] ?? false}
            onCheckedChange={(v) => toggle(item.key, v)}
            label={item.label}
            disabled={isLocked}
          />
        ))}
      </div>
    </div>
  );
}
