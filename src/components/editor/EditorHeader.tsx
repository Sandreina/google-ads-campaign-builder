import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Cloud,
  Loader2,
  PackageCheck,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tooltip } from '@/components/ui/Tooltip';
import { useStore } from '@/store/CampaignStore';
import { formatRelativeTime } from '@/lib/utils';
import { computeCampaignProgress } from '@/lib/review';

export function EditorHeader({
  onImport,
  onExport,
  onCreatePackage,
  onValidate,
  onSearch,
}: {
  onImport: () => void;
  onExport: () => void;
  onCreatePackage: () => void;
  onValidate: () => void;
  onSearch: () => void;
}) {
  const { campaign, review, saveStatus, lastSavedAt } = useStore();
  const navigate = useNavigate();
  if (!campaign || !review) return null;

  const progress = computeCampaignProgress(campaign, review);

  return (
    <div className="flex flex-col gap-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold leading-tight">{campaign.campaignName}</h1>
              <Badge tone="primary" className="shrink-0">
                <ShieldCheck className="h-3 w-3" /> Editor Mode
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {campaign.clientName} · v{campaign.version}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          <Button variant="outline" size="sm" onClick={onSearch} aria-label="Search campaign" title="Search (⌘K)">
            <Search className="h-3.5 w-3.5" /> Search
          </Button>
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={onValidate}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Validate
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/review')}>
            <Eye className="h-3.5 w-3.5" /> Preview Client
          </Button>
          <Button size="sm" onClick={onCreatePackage}>
            <PackageCheck className="h-3.5 w-3.5" /> Create Review
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={progress.percent} className="max-w-xs" />
        <span className="text-xs text-muted-foreground">
          Client review {progress.percent}% · {progress.completedItems}/{progress.totalItems} items
        </span>
      </div>
    </div>
  );
}

function SaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: string | null }) {
  return (
    <Tooltip content={lastSavedAt ? `Last saved ${formatRelativeTime(lastSavedAt)}` : 'Autosave on'}>
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === 'saving' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Cloud className="h-3.5 w-3.5 text-success" />
        )}
        <span className="hidden sm:inline">
          {status === 'saving' ? 'Saving…' : `Saved ${formatRelativeTime(lastSavedAt ?? undefined)}`}
        </span>
      </span>
    </Tooltip>
  );
}
