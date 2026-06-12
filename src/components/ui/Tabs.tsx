import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}
const Ctx = createContext<TabsCtx | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  return (
    <Ctx.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-secondary/60 p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  count,
}: {
  value: string;
  children: ReactNode;
  count?: number;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`${ctx.baseId}-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            active ? 'bg-secondary text-secondary-foreground' : 'bg-border text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
