import { useState } from 'react';
import { Monitor, Smartphone, Shuffle, RotateCcw, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { AdGroup } from '@/types';
import { generateCombination, combinationCount } from '@/lib/preview';

const DISCLAIMER =
  'Preview for visualization purposes. Actual asset combinations and formatting may vary.';

function displayUrl(finalUrl: string, path1?: string, path2?: string): string {
  let host = finalUrl;
  try {
    host = new URL(finalUrl).host.replace(/^www\./, '');
  } catch {
    host = finalUrl.replace(/^https?:\/\//, '').split('/')[0];
  }
  const parts = [host, path1, path2].filter(Boolean);
  return parts.join('/');
}

export function GoogleSearchAdPreview({
  adGroup,
  /** Editors get shuffle controls; clients get a reduced control set. */
  variant = 'editor',
  className,
}: {
  adGroup: AdGroup;
  variant?: 'editor' | 'client';
  className?: string;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [offset, setOffset] = useState(0);

  const total = combinationCount(adGroup);
  const combo = generateCombination(adGroup, offset);
  const headlineText = combo.headlines.map((h) => h.text).join(' | ');
  const isMobile = device === 'mobile';
  const isRecommended = offset === 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border bg-secondary/60 p-0.5">
          <DeviceButton active={!isMobile} onClick={() => setDevice('desktop')} icon={Monitor} label="Desktop" />
          <DeviceButton active={isMobile} onClick={() => setDevice('mobile')} icon={Smartphone} label="Mobile" />
        </div>
        <div className="flex items-center gap-1.5">
          {!isRecommended && (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              <RotateCcw className="h-3.5 w-3.5" /> Recommended
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => (o + 1) % total)}>
            <ChevronRight className="h-3.5 w-3.5" /> Next example
          </Button>
          {variant === 'editor' && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Shuffle combination"
              onClick={() => setOffset((o) => (o + 2) % Math.max(total, 1))}
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'rounded-xl border border-border bg-white p-4 shadow-sm',
          isMobile ? 'mx-auto max-w-[360px]' : 'w-full',
        )}
      >
        {isRecommended && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Recommended example
          </div>
        )}
        {combo.headlines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add active headlines and descriptions to generate a preview.
          </p>
        ) : (
          <div className="font-[arial,sans-serif]">
            <div className="flex items-center gap-1.5">
              <span className="rounded-sm border border-gray-300 px-1 text-[11px] font-bold text-gray-700">
                Ad
              </span>
              <span className="text-xs text-gray-700">·</span>
              <span className="truncate text-xs text-gray-800">
                {displayUrl(adGroup.finalUrl, adGroup.path1, adGroup.path2)}
              </span>
            </div>
            <h3
              className={cn(
                'mt-1 cursor-default font-normal leading-snug text-[#1a0dab] hover:underline',
                isMobile ? 'text-lg' : 'text-xl',
              )}
            >
              {headlineText}
            </h3>
            <p className={cn('mt-1 leading-snug text-[#4d5156]', isMobile ? 'text-sm' : 'text-sm')}>
              {combo.descriptions.map((d) => d.text).join(' ')}
            </p>
            {/* Illustrative sitelinks */}
            <div
              className={cn(
                'mt-2 gap-x-6 gap-y-1 text-sm text-[#1a0dab]',
                isMobile ? 'flex flex-wrap' : 'grid grid-cols-2',
              )}
            >
              <span className="hover:underline">Request a Demo</span>
              <span className="hover:underline">How It Works</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] italic text-muted-foreground">{DISCLAIMER}</p>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Monitor;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
