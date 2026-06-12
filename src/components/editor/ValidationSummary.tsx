import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { Card, CardContent } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { buildValidationSummary, groupIssuesByCategory } from '@/lib/validation';
import { countUnresolvedChangeRequests } from '@/lib/review';
import type { View } from '@/app/navigation';

export function ValidationSummary({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { campaign, review, internal } = useStore();

  const issues = useMemo(() => {
    if (!campaign || !review) return [];
    const unresolved = countUnresolvedChangeRequests(campaign, review, internal?.resolvedFeedback ?? {});
    return buildValidationSummary(campaign, unresolved);
  }, [campaign, review, internal]);

  if (!campaign || !review) return null;
  const grouped = groupIssuesByCategory(issues);
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Campaign Validation</h2>
        <p className="text-sm text-muted-foreground">Resolve issues before sending the campaign for review.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge tone={errors > 0 ? 'destructive' : 'success'}>
          <XCircle className="h-3.5 w-3.5" /> {errors} errors
        </Badge>
        <Badge tone={warnings > 0 ? 'warning' : 'success'}>
          <AlertTriangle className="h-3.5 w-3.5" /> {warnings} warnings
        </Badge>
      </div>

      {issues.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Everything looks good" description="No validation issues detected. The campaign is ready to share." />
      ) : (
        Object.entries(grouped).map(([category, categoryIssues]) => (
          <Card key={category}>
            <CardContent className="p-4">
              <h3 className="mb-2 text-sm font-semibold">{category}</h3>
              <ul className="flex flex-col gap-1.5">
                {categoryIssues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2 text-sm">
                    {issue.severity === 'error' ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <span className="flex-1">{issue.message}</span>
                    {issue.adGroupId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate({ kind: 'adgroup', id: issue.adGroupId! })}
                      >
                        Fix
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
