import { forwardRef } from 'react';
import { AutoTextarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * Auto-expanding comment field with autosave-on-change. Used for every level of
 * client note (asset, keyword, ad group, campaign).
 */
export const ClientCommentField = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    recommended?: boolean;
    label?: string;
    rows?: number;
  }
>(({ value, onChange, placeholder = 'Add a comment…', disabled, recommended, label, rows = 1 }, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <AutoTextarea
        ref={ref}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('text-sm', recommended && !value.trim() && 'border-amber-300 bg-amber-50/40')}
        aria-label={label ?? 'Comment'}
      />
      {recommended && !value.trim() && (
        <span className="text-xs text-amber-600">A comment is recommended when requesting changes.</span>
      )}
    </div>
  );
});
ClientCommentField.displayName = 'ClientCommentField';
