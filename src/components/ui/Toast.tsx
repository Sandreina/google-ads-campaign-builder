import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-card',
                tones[t.tone],
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
                aria-label="Dismiss"
                className="ml-1 opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
