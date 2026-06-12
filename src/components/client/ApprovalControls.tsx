import { Check, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReviewStatus } from '@/types';

/**
 * Approve / Request changes / Return to pending control group. Status is also
 * conveyed by the {@link ReviewStatusBadge} shown alongside — never by color
 * alone.
 */
export function ApprovalControls({
  status,
  onChange,
  disabled,
  size = 'md',
}: {
  status: ReviewStatus;
  onChange: (status: ReviewStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm';
  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label="Approval controls">
      <button
        disabled={disabled}
        onClick={() => onChange('approved')}
        aria-pressed={status === 'approved'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:opacity-50',
          dims,
          status === 'approved'
            ? 'border-success bg-success text-success-foreground'
            : 'border-border bg-card text-foreground hover:border-success hover:text-success',
        )}
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        disabled={disabled}
        onClick={() => onChange('changes_requested')}
        aria-pressed={status === 'changes_requested'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:opacity-50',
          dims,
          status === 'changes_requested'
            ? 'border-destructive bg-destructive text-destructive-foreground'
            : 'border-border bg-card text-foreground hover:border-destructive hover:text-destructive',
        )}
      >
        <X className="h-3.5 w-3.5" /> Request changes
      </button>
      {status !== 'pending' && !disabled && (
        <button
          onClick={() => onChange('pending')}
          className={cn('inline-flex items-center gap-1 rounded-md px-2 text-muted-foreground hover:text-foreground', dims)}
          aria-label="Return to pending"
          title="Return to pending"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
