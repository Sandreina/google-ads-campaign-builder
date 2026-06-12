import { Lock } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/primitives';

/**
 * Internal note input. Only ever rendered in Editor Mode. The value lives in
 * {@link InternalEditorData} and is never included in client-facing output.
 */
export function InternalNote({
  value,
  onChange,
  label = 'Internal note',
  placeholder = 'Visible to your team only — never shown to the client.',
  rows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Lock className="h-3.5 w-3.5" /> {label} · Internal only
      </div>
      <AutoTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="border-amber-200 bg-white/70 text-sm"
      />
    </div>
  );
}
