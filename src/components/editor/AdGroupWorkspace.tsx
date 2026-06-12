import { useState } from 'react';
import {
  Copy,
  Trash2,
  Type,
  AlignLeft,
  ClipboardPaste,
  KeyRound,
  Eye,
  MessageSquare,
  LayoutDashboard,
} from 'lucide-react';
import type { AdGroup } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationDialog } from '@/components/ui/Dialog';
import { AssetManager } from './AssetManager';
import { KeywordManager } from './KeywordManager';
import { AdGroupSettings } from './AdGroupSettings';
import { BulkAssetDialog } from './BulkAssetDialog';
import { InternalNote } from './InternalNote';
import { GoogleSearchAdPreview } from '@/components/shared/GoogleSearchAdPreview';
import { EditorFeedbackPanel } from './EditorFeedbackPanel';
import { createAsset } from '@/lib/campaign-ops';
import { adGroupAssetCounts } from '@/lib/validation';

export function AdGroupWorkspace({ adGroup }: { adGroup: AdGroup }) {
  const { mutateAdGroup, removeAdGroup, duplicateAdGroupById, internal, updateInternal } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [pasteType, setPasteType] = useState<'headline' | 'description' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const counts = adGroupAssetCounts(adGroup);

  function importAssets(
    type: 'headline' | 'description',
    items: { text: string; pinPosition?: number | null }[],
    mode: 'append' | 'replace',
  ) {
    mutateAdGroup(adGroup.id, 'canEditAssets', (ag) => {
      const existing = type === 'headline' ? ag.headlines : ag.descriptions;
      const base = mode === 'replace' ? [] : existing;
      const created = items.map((item, i) => {
        const asset = createAsset(type, item.text, base.length + i);
        asset.pinPosition = item.pinPosition ?? null;
        return asset;
      });
      const next = [...base, ...created].map((a, i) => ({ ...a, order: i }));
      return type === 'headline' ? { ...ag, headlines: next } : { ...ag, descriptions: next };
    });
    toast(`${items.length} ${type}s ${mode === 'replace' ? 'replaced' : 'added'}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Ad group header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{adGroup.name}</h2>
            <Badge tone="neutral">{counts.activeKeywords} active kw</Badge>
          </div>
          {adGroup.theme && <p className="mt-0.5 text-sm text-muted-foreground">{adGroup.theme}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => duplicateAdGroupById(adGroup.id)}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="keywords" count={counts.keywords}>
            <KeyRound className="h-3.5 w-3.5" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="copy" count={counts.headlines + counts.descriptions}>
            <Type className="h-3.5 w-3.5" /> Ad Copy
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-3.5 w-3.5" /> Preview
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="h-3.5 w-3.5" /> Client Feedback
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview">
            <AdGroupSettings adGroup={adGroup} />
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordManager adGroup={adGroup} />
          </TabsContent>

          <TabsContent value="copy">
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-1.5">
                        <Type className="h-4 w-4" /> Headlines
                      </CardTitle>
                      <CardDescription>Drag to reorder · pin · activate · edit inline</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setPasteType('headline')}>
                      <ClipboardPaste className="h-3.5 w-3.5" /> Paste Headlines
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <AssetManager adGroup={adGroup} type="headline" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-1.5">
                        <AlignLeft className="h-4 w-4" /> Descriptions
                      </CardTitle>
                      <CardDescription>Drag to reorder · pin · activate · edit inline</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setPasteType('description')}>
                      <ClipboardPaste className="h-3.5 w-3.5" /> Paste Descriptions
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <AssetManager adGroup={adGroup} type="description" />
                  </CardContent>
                </Card>
              </div>

              {/* Sticky preview panel */}
              <div className="hidden xl:block">
                <div className="sticky top-[80px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ad preview</CardTitle>
                      <CardDescription>How this ad may appear on Google Search.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GoogleSearchAdPreview adGroup={adGroup} variant="editor" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Google Search ad preview</CardTitle>
                <CardDescription>
                  Step through valid combinations. Pinned assets stay in position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleSearchAdPreview adGroup={adGroup} variant="editor" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <div className="flex flex-col gap-4">
              <EditorFeedbackPanel adGroup={adGroup} />
              <InternalNote
                label="Internal resolution note"
                value={internal?.adGroupNotes[adGroup.id] ?? ''}
                placeholder="Track how you're resolving client feedback for this ad group…"
                onChange={(value) =>
                  updateInternal((data) => ({
                    ...data,
                    adGroupNotes: { ...data.adGroupNotes, [adGroup.id]: value },
                  }))
                }
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <BulkAssetDialog
        open={pasteType !== null}
        onClose={() => setPasteType(null)}
        type={pasteType ?? 'headline'}
        onImport={(items, mode) => pasteType && importAssets(pasteType, items, mode)}
      />

      <ConfirmationDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeAdGroup(adGroup.id);
          toast('Ad group deleted');
        }}
        title={`Delete "${adGroup.name}"?`}
        message="This removes the ad group and all of its keywords, headlines, and descriptions."
        confirmLabel="Delete ad group"
        destructive
      />
    </div>
  );
}
