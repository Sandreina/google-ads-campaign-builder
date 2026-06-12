import { Target, Search, Globe, KeyRound, Type, AlignLeft, Eye, ListChecks, CheckSquare } from 'lucide-react';
import type { AdGroup, ReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { GoogleSearchAdPreview } from '@/components/shared/GoogleSearchAdPreview';
import { AssetReviewCard } from './AssetReviewCard';
import { KeywordReview } from './KeywordReview';
import { AdGroupChecklist } from './Checklists';
import { ApprovalControls } from './ApprovalControls';
import { ClientCommentField } from './ClientCommentField';
import { ReviewStatusBadge } from '@/components/shared/ReviewStatusBadge';
import { computeAdGroupProgress, isAdGroupFullyApproved } from '@/lib/review';
import { Progress } from '@/components/ui/Progress';

function SectionHeader({ icon: Icon, title, children }: { icon: typeof Target; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="ml-auto">{children}</div>
    </div>
  );
}

export function ClientAdGroupReview({ adGroup }: { adGroup: AdGroup }) {
  const { review, updateReview, isLocked } = useStore();
  if (!review) return null;

  const agReview = review.adGroupReviews[adGroup.id];
  const progress = computeAdGroupProgress(adGroup, review);
  const fullyApproved = isAdGroupFullyApproved(adGroup, review);

  const activeHeadlines = adGroup.headlines.filter((h) => h.active).sort((a, b) => a.order - b.order);
  const activeDescriptions = adGroup.descriptions.filter((d) => d.active).sort((a, b) => a.order - b.order);

  function setOverall(status: ReviewStatus) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: { ...r.adGroupReviews, [adGroup.id]: { ...r.adGroupReviews[adGroup.id], overallStatus: status } },
    }));
  }
  function setGeneralComment(comment: string) {
    updateReview((r) => ({
      ...r,
      adGroupReviews: { ...r.adGroupReviews, [adGroup.id]: { ...r.adGroupReviews[adGroup.id], generalComment: comment } },
    }));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{adGroup.name}</h2>
          <ReviewStatusBadge status={agReview.overallStatus} />
        </div>
        {adGroup.theme && <p className="mt-1 text-muted-foreground">{adGroup.theme}</p>}
        <div className="mt-3 flex items-center gap-3">
          <Progress value={progress.percent} className="max-w-xs" tone={progress.percent === 100 ? 'success' : 'primary'} />
          <span className="text-sm text-muted-foreground">{progress.percent}% reviewed</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          {/* Overview / intent / landing */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              {adGroup.clientFacingContext && (
                <div>
                  <SectionHeader icon={Target} title="About this ad group" />
                  <p className="mt-2 text-sm text-muted-foreground">{adGroup.clientFacingContext}</p>
                </div>
              )}
              {adGroup.searchIntent && (
                <div>
                  <SectionHeader icon={Search} title="Search intent" />
                  <p className="mt-2 text-sm text-muted-foreground">{adGroup.searchIntent}</p>
                </div>
              )}
              <div>
                <SectionHeader icon={Globe} title="Landing page" />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <a
                    href={adGroup.finalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {adGroup.finalUrl}
                  </a>
                  {(adGroup.path1 || adGroup.path2) && (
                    <Badge tone="neutral">
                      /{[adGroup.path1, adGroup.path2].filter(Boolean).join('/')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <SectionHeader icon={KeyRound} title="Keywords" />
            </CardHeader>
            <CardContent>
              <KeywordReview adGroup={adGroup} />
            </CardContent>
          </Card>

          {/* Headlines */}
          <Card>
            <CardHeader>
              <SectionHeader icon={Type} title="Headlines">
                <Badge tone="neutral">
                  {progress.headlines.approved}/{progress.headlines.total} approved
                </Badge>
              </SectionHeader>
              <CardDescription>Approve or request changes to each headline, and add comments.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activeHeadlines.map((h, i) => (
                <AssetReviewCard key={h.id} adGroupId={adGroup.id} asset={h} type="headline" number={i + 1} />
              ))}
            </CardContent>
          </Card>

          {/* Descriptions */}
          <Card>
            <CardHeader>
              <SectionHeader icon={AlignLeft} title="Descriptions">
                <Badge tone="neutral">
                  {progress.descriptions.approved}/{progress.descriptions.total} approved
                </Badge>
              </SectionHeader>
              <CardDescription>Approve or request changes to each description, and add comments.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activeDescriptions.map((d, i) => (
                <AssetReviewCard key={d.id} adGroupId={adGroup.id} asset={d} type="description" number={i + 1} />
              ))}
            </CardContent>
          </Card>

          {/* Mobile preview (sticky panel hidden on small screens) */}
          <div className="xl:hidden">
            <Card>
              <CardHeader>
                <SectionHeader icon={Eye} title="Ad preview" />
              </CardHeader>
              <CardContent>
                <GoogleSearchAdPreview adGroup={adGroup} variant="client" />
              </CardContent>
            </Card>
          </div>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <SectionHeader icon={ListChecks} title="Ad group checklist" />
            </CardHeader>
            <CardContent>
              <AdGroupChecklist adGroupId={adGroup.id} />
            </CardContent>
          </Card>

          {/* Overall approval */}
          <Card>
            <CardHeader>
              <SectionHeader icon={CheckSquare} title="Ad group approval" />
              <CardDescription>
                Approve when you're happy with the keywords, headlines, descriptions, and checklist.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {fullyApproved && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  All assets, keywords, and checklist items are approved. This ad group is fully approved.
                </div>
              )}
              <ApprovalControls status={agReview.overallStatus} onChange={setOverall} disabled={isLocked} />
              <ClientCommentField
                value={agReview.generalComment}
                onChange={setGeneralComment}
                disabled={isLocked}
                label="General note on this ad group"
                placeholder="Share any overall feedback on this ad group…"
                rows={2}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sticky preview (desktop) */}
        <div className="hidden xl:block">
          <div className="sticky top-[80px]">
            <Card>
              <CardHeader>
                <SectionHeader icon={Eye} title="Ad preview" />
                <CardDescription>How this ad may appear on Google Search.</CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleSearchAdPreview adGroup={adGroup} variant="client" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
