import {
  LayoutDashboard,
  Network,
  MessageSquare,
  ClipboardCheck,
  Flag,
  Plus,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { View } from '@/app/navigation';
import { useStore } from '@/store/CampaignStore';
import { computeAdGroupProgress } from '@/lib/review';
import { adGroupAssetCounts } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import type { AppMode } from '@/types';

interface NavLink {
  view: View;
  label: string;
  icon: typeof LayoutDashboard;
}

function viewKey(v: View): string {
  return v.kind === 'adgroup' ? `adgroup:${v.id}` : v.kind;
}

export function CampaignSidebar({
  mode,
  current,
  onNavigate,
  onAddAdGroup,
  onReorder,
}: {
  mode: AppMode;
  current: View;
  onNavigate: (view: View) => void;
  onAddAdGroup?: () => void;
  onReorder?: (from: number, to: number) => void;
}) {
  const { campaign, review } = useStore();
  if (!campaign || !review) return null;

  const topLinks: NavLink[] = [
    { view: { kind: 'overview' }, label: 'Campaign Overview', icon: LayoutDashboard },
    { view: { kind: 'structure' }, label: 'Campaign Structure', icon: Network },
  ];

  const bottomLinks: NavLink[] =
    mode === 'editor'
      ? [
          { view: { kind: 'feedback' }, label: 'Client Feedback', icon: MessageSquare },
          { view: { kind: 'validation' }, label: 'Validation', icon: ShieldAlert },
          { view: { kind: 'final' }, label: 'Final Approval', icon: Flag },
        ]
      : [
          { view: { kind: 'summary' }, label: 'Review Summary', icon: ClipboardCheck },
          { view: { kind: 'final' }, label: 'Final Approval', icon: Flag },
        ];

  const activeKey = viewKey(current);

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Campaign navigation">
      {topLinks.map((link) => (
        <NavButton
          key={link.label}
          link={link}
          active={activeKey === viewKey(link.view)}
          onClick={() => onNavigate(link.view)}
        />
      ))}

      <div className="mt-4 flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ad Groups
        </span>
        {mode === 'editor' && onAddAdGroup && (
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add ad group" onClick={onAddAdGroup}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {campaign.adGroups.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No ad groups yet.</p>
        )}
        {campaign.adGroups.map((ag, index) => {
          const counts = adGroupAssetCounts(ag);
          const progress = computeAdGroupProgress(ag, review);
          const agReview = review.adGroupReviews[ag.id];
          const unresolvedComments = agReview
            ? Object.values(agReview.assetFeedback).filter(
                (f) => f.status === 'changes_requested' || f.comment.trim(),
              ).length +
              (agReview.generalComment.trim() ? 1 : 0)
            : 0;
          const active = activeKey === `adgroup:${ag.id}`;
          return (
            <div
              key={ag.id}
              className={cn(
                'group flex items-stretch gap-1 rounded-md border border-transparent pr-1 transition-colors',
                active ? 'border-border bg-accent/60' : 'hover:bg-secondary',
              )}
            >
              {mode === 'editor' && onReorder && (
                <div className="flex items-center pl-1">
                  <ReorderHandles index={index} total={campaign.adGroups.length} onReorder={onReorder} />
                </div>
              )}
              <button
                onClick={() => onNavigate({ kind: 'adgroup', id: ag.id })}
                className="flex min-w-0 flex-1 flex-col gap-1 px-1.5 py-2 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 truncate text-sm font-medium">{ag.name}</span>
                  <StatusDot status={progress.overallStatus} />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{counts.keywords} kw</span>
                  <span>·</span>
                  <span>{counts.headlines} H</span>
                  <span>·</span>
                  <span>{counts.descriptions} D</span>
                  {unresolvedComments > 0 && (
                    <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 text-red-600">
                      <MessageSquare className="h-2.5 w-2.5" /> {unresolvedComments}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{progress.percent}%</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
        {bottomLinks.map((link) => (
          <NavButton
            key={link.label}
            link={link}
            active={activeKey === viewKey(link.view)}
            onClick={() => onNavigate(link.view)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavButton({ link, active, onClick }: { link: NavLink; active: boolean; onClick: () => void }) {
  const Icon = link.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{link.label}</span>
    </button>
  );
}

function StatusDot({ status }: { status: 'pending' | 'approved' | 'changes_requested' }) {
  const color =
    status === 'approved' ? 'bg-success' : status === 'changes_requested' ? 'bg-destructive' : 'bg-amber-400';
  const label =
    status === 'approved' ? 'Approved' : status === 'changes_requested' ? 'Changes requested' : 'Pending';
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', color)} title={label} aria-label={label} />;
}

function ReorderHandles({
  index,
  total,
  onReorder,
}: {
  index: number;
  total: number;
  onReorder: (from: number, to: number) => void;
}) {
  return (
    <span className="-ml-1 flex flex-col opacity-40 group-hover:opacity-100">
      <button
        aria-label="Move ad group up"
        disabled={index === 0}
        onClick={(e) => {
          e.stopPropagation();
          onReorder(index, index - 1);
        }}
        className="leading-none text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        aria-label="Move ad group down"
        disabled={index === total - 1}
        onClick={(e) => {
          e.stopPropagation();
          onReorder(index, index + 1);
        }}
        className="leading-none text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </span>
  );
}
