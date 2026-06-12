import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from '@/components/ui/Toast';

// Code-split the three top-level experiences so the initial dashboard load
// stays small and the editor (dnd-kit, dialogs) loads on demand.
const Dashboard = lazy(() => import('./Dashboard').then((m) => ({ default: m.Dashboard })));
const EditorApp = lazy(() => import('./EditorApp').then((m) => ({ default: m.EditorApp })));
const ClientApp = lazy(() => import('./ClientApp').then((m) => ({ default: m.ClientApp })));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor" element={<EditorApp />} />
            <Route path="/review" element={<ClientApp />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  );
}
