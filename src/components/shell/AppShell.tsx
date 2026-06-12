import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

/**
 * Application shell: sticky header, collapsible left navigation (drawer on
 * mobile/tablet), and a scrollable main workspace.
 */
export function AppShell({
  header,
  sidebar,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-[var(--header-h,57px)] hidden h-[calc(100vh-57px)] w-72 shrink-0 overflow-y-auto border-r border-border bg-card/50 scrollbar-thin lg:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card shadow-card scrollbar-thin">
              <div onClick={() => setMobileOpen(false)}>{sidebar}</div>
            </aside>
          </div>
        )}

        <main className={cn('min-w-0 flex-1')}>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
