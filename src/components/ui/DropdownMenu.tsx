import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

/** Simple click-triggered dropdown menu, closes on outside click / Escape. */
export function DropdownMenu({
  trigger,
  items,
  align = 'end',
  label = 'More actions',
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-card',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <div key={`${item.label}-${i}`}>
              {item.separatorBefore && <div className="my-1 h-px bg-border" />}
              <button
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors',
                  'disabled:pointer-events-none disabled:opacity-50',
                  item.destructive
                    ? 'text-destructive hover:bg-red-50'
                    : 'text-foreground hover:bg-secondary',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
