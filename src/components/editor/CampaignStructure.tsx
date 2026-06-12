import { useState } from 'react';
import { Plus, Copy, Trash2, ChevronUp, ChevronDown, ArrowRight, Network } from 'lucide-react';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, Input, Field } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, ConfirmationDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { adGroupAssetCounts } from '@/lib/validation';
import { computeAdGroupProgress } from '@/lib/review';
import type { View } from '@/app/navigation';

export function CampaignStructure({ onOpenAdGroup }: { onOpenAdGroup: (view: View) => void }) {
  const { campaign, review, addAdGroup, duplicateAdGroupById, removeAdGroup, reorderAdGroupsByIndex } = useStore();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!campaign || !review) return null;

  function create() {
    const name = newName.trim() || `Ad Group ${campaign!.adGroups.length + 1}`;
    const ag = addAdGroup(name);
    setNewName('');
    setAddOpen(false);
    if (ag) {
      toast('Ad group created');
      onOpenAdGroup({ kind: 'adgroup', id: ag.id });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campaign Structure</h2>
          <p className="text-sm text-muted-foreground">Organize, reorder, and manage your ad groups.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add ad group
        </Button>
      </div>

      {campaign.adGroups.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No ad groups yet"
          description="Create your first ad group to start adding keywords, headlines, and descriptions."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add ad group
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {campaign.adGroups.map((ag, index) => {
            const counts = adGroupAssetCounts(ag);
            const progress = computeAdGroupProgress(ag, review);
            return (
              <Card key={ag.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="flex flex-col">
                    <button
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => reorderAdGroupsByIndex(index, index - 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Move down"
                      disabled={index === campaign.adGroups.length - 1}
                      onClick={() => reorderAdGroupsByIndex(index, index + 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{ag.name}</h3>
                      <Badge
                        tone={
                          progress.overallStatus === 'approved'
                            ? 'success'
                            : progress.overallStatus === 'changes_requested'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {progress.percent}% reviewed
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {ag.theme || 'No theme set'} · {counts.keywords} keywords · {counts.headlines} headlines ·{' '}
                      {counts.descriptions} descriptions
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" aria-label="Duplicate" onClick={() => duplicateAdGroupById(ag.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      className="text-destructive"
                      onClick={() => setConfirmDelete(ag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onOpenAdGroup({ kind: 'adgroup', id: ag.id })}>
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add ad group"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create ad group</Button>
          </>
        }
      >
        <Field label="Ad group name">
          <Input
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="e.g. Clinical Trial Imaging"
          />
        </Field>
      </Dialog>

      <ConfirmationDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            removeAdGroup(confirmDelete);
            toast('Ad group deleted');
          }
        }}
        title="Delete ad group?"
        message="This removes the ad group and all of its assets. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
