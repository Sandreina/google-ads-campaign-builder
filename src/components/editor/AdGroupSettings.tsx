import type { AdGroup } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { Field, Input, Textarea } from '@/components/ui/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { InternalNote } from './InternalNote';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';
import { validatePath, isValidUrl } from '@/lib/validation';

export function AdGroupSettings({ adGroup }: { adGroup: AdGroup }) {
  const { mutateAdGroup, internal, updateInternal } = useStore();

  const patch = (fields: Partial<AdGroup>) =>
    mutateAdGroup(adGroup.id, 'canEditAdGroups', (ag) => ({ ...ag, ...fields }));

  const path1Err = validatePath(adGroup.path1);
  const path2Err = validatePath(adGroup.path2);
  const urlValid = isValidUrl(adGroup.finalUrl);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ad group details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Ad group name">
            <Input value={adGroup.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Theme" hint="Short description of what this ad group covers.">
            <Input value={adGroup.theme ?? ''} onChange={(e) => patch({ theme: e.target.value })} />
          </Field>
          <Field label="Search intent">
            <Textarea
              value={adGroup.searchIntent ?? ''}
              onChange={(e) => patch({ searchIntent: e.target.value })}
              rows={2}
            />
          </Field>
          <Field label="Client-facing context" hint="Shown to the client to explain this ad group.">
            <Textarea
              value={adGroup.clientFacingContext ?? ''}
              onChange={(e) => patch({ clientFacingContext: e.target.value })}
              rows={2}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Landing page & display path
              <Tooltip content="The Final URL is where clicks land. Display paths are the optional /path1/path2 shown in the ad.">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Final URL" error={!urlValid ? 'Enter a valid http(s) URL' : undefined}>
              <Input
                value={adGroup.finalUrl}
                onChange={(e) => patch({ finalUrl: e.target.value })}
                placeholder="https://example.com/landing"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Display path 1" error={path1Err.valid ? undefined : path1Err.message}>
                <Input value={adGroup.path1 ?? ''} onChange={(e) => patch({ path1: e.target.value })} placeholder="imaging" />
              </Field>
              <Field label="Display path 2" error={path2Err.valid ? undefined : path2Err.message}>
                <Input value={adGroup.path2 ?? ''} onChange={(e) => patch({ path2: e.target.value })} placeholder="trials" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <InternalNote
          label="Ad group note"
          value={internal?.adGroupNotes[adGroup.id] ?? ''}
          onChange={(value) =>
            updateInternal((data) => ({
              ...data,
              adGroupNotes: { ...data.adGroupNotes, [adGroup.id]: value },
            }))
          }
        />
      </div>
    </div>
  );
}
