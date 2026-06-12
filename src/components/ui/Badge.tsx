import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground border-border',
  primary: 'bg-accent text-accent-foreground border-accent',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  destructive: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
