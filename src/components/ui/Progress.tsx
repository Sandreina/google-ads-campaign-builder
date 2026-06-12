import { cn } from '@/lib/utils';

type Tone = 'primary' | 'success' | 'warning';

const tones: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
};

export function Progress({
  value,
  className,
  tone = 'primary',
  label,
}: {
  value: number;
  className?: string;
  tone?: Tone;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% complete`}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
