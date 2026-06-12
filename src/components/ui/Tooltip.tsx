import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Lightweight accessible tooltip (hover + focus). */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
