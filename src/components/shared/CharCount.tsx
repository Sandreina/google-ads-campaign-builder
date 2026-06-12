import { cn } from '@/lib/utils';
import { NEAR_LIMIT_THRESHOLD } from '@/lib/constants';

/** Live character count with color states: valid / near limit / over limit. */
export function CharCount({ count, max, className }: { count: number; max: number; className?: string }) {
  const over = count > max;
  const near = !over && count > max - NEAR_LIMIT_THRESHOLD;
  return (
    <span
      className={cn(
        'tabular-nums text-xs font-medium',
        over ? 'text-destructive' : near ? 'text-amber-600' : 'text-muted-foreground',
        className,
      )}
      aria-label={`${count} of ${max} characters${over ? ', over limit' : ''}`}
    >
      {count} / {max}
    </span>
  );
}
