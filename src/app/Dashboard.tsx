import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  FolderOpen,
  Copy,
  Trash2,
  ArrowRight,
  Upload,
  Loader2,
  Building2,
  Layers,
} from 'lucide-react';
import type { CampaignProposal, ClientReview, ProjectBundle } from '@/types';
import { repository } from '@/storage/localStorageRepository';
import { buildDemoProject } from '@/data/demo';
import { createBlankProject, duplicateProject } from '@/lib/project';
import { emptyClientReview, computeCampaignProgress } from '@/lib/review';
import { projectBundleSchema } from '@/lib/schemas';
import { STORAGE_KEYS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, Field, Input, Textarea, Select } from '@/components/ui/primitives';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Dialog, ConfirmationDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/Toast';

interface ProjectRow {
  campaign: CampaignProposal;
  review: ClientReview;
}

export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CampaignProposal | null>(null);

  const refresh = useCallback(async () => {
    const campaigns = await repository.getCampaigns();
    const withReviews = await Promise.all(
      campaigns.map(async (campaign) => ({
        campaign,
        review: (await repository.getClientReview(campaign.id)) ?? emptyClientReview(campaign),
      })),
    );
    setRows(withReviews);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openProject = useCallback(
    (id: string) => {
      localStorage.setItem(STORAGE_KEYS.activeCampaign, id);
      navigate('/editor');
    },
    [navigate],
  );

  async function saveAndOpen(bundle: ProjectBundle) {
    await repository.saveCampaign(bundle.campaign);
    await repository.saveClientReview(bundle.review);
    await repository.saveInternalData(bundle.internal);
    openProject(bundle.campaign.id);
  }

  async function loadDemo() {
    await saveAndOpen(buildDemoProject());
  }

  async function duplicate(campaign: CampaignProposal) {
    const bundle = duplicateProject(campaign);
    await repository.saveCampaign(bundle.campaign);
    await repository.saveClientReview(bundle.review);
    await repository.saveInternalData(bundle.internal);
    toast('Project duplicated');
    await refresh();
  }

  async function remove(campaign: CampaignProposal) {
    await repository.deleteCampaign(campaign.id);
    if (localStorage.getItem(STORAGE_KEYS.activeCampaign) === campaign.id) {
      localStorage.removeItem(STORAGE_KEYS.activeCampaign);
    }
    toast('Project deleted');
    await refresh();
  }

  async function handleImportFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const parsed = projectBundleSchema.safeParse(data);
      if (!parsed.success) {
        toast('That file is not a full project export (JSON).', 'error');
        return;
      }
      await saveAndOpen(parsed.data as ProjectBundle);
    } catch {
      toast('Could not read that file.', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Campaign Review</h1>
              <p className="text-xs text-muted-foreground">Google Ads approval workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportFile(f);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Import project
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Your projects</h2>
            <p className="text-muted-foreground">
              Build a Google Ads Search campaign, then share a polished client review.
            </p>
          </div>
        </div>

        {rows === null ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No projects yet"
            description="Create a new campaign project, or load the sample to explore the workflow."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4" /> New project
                </Button>
                <Button variant="outline" onClick={loadDemo}>
                  <Sparkles className="h-4 w-4" /> Load sample project
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* New project tile */}
            <button
              onClick={() => setNewOpen(true)}
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-center transition-colors hover:bg-secondary/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">New project</span>
              <span className="text-xs text-muted-foreground">Start a campaign from scratch</span>
            </button>

            {rows.map(({ campaign, review }) => {
              const progress = computeCampaignProgress(campaign, review);
              return (
                <Card key={campaign.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{campaign.campaignName}</h3>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" /> {campaign.clientName}
                        </p>
                      </div>
                      <Badge tone="neutral">v{campaign.version}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      <Badge tone="neutral">{campaign.adGroups.length} ad groups</Badge>
                      <Badge tone="neutral">{campaign.campaignType}</Badge>
                    </div>

                    <div className="mt-auto flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Progress value={progress.percent} className="flex-1" tone={progress.percent === 100 ? 'success' : 'primary'} />
                        <span className="text-xs tabular-nums text-muted-foreground">{progress.percent}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Updated {formatRelativeTime(campaign.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-border pt-3">
                      <Button size="sm" className="flex-1" onClick={() => openProject(campaign.id)}>
                        <FolderOpen className="h-3.5 w-3.5" /> Open <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Duplicate project" onClick={() => duplicate(campaign)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete project"
                        className="text-destructive"
                        onClick={() => setConfirmDelete(campaign)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <div className="mt-6">
            <Button variant="ghost" size="sm" onClick={loadDemo}>
              <Sparkles className="h-3.5 w-3.5" /> Load sample project
            </Button>
          </div>
        )}
      </main>

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} onCreate={saveAndOpen} />

      <ConfirmationDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        title={`Delete "${confirmDelete?.campaignName}"?`}
        message="This permanently removes the campaign, its client feedback, and internal notes from this browser."
        confirmLabel="Delete project"
        destructive
      />
    </div>
  );
}

function NewProjectDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (bundle: ProjectBundle) => Promise<void> | void;
}) {
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'daily' | 'monthly'>('daily');

  function reset() {
    setClientName('');
    setCampaignName('');
    setObjective('');
    setBudget('');
    setBudgetPeriod('daily');
  }

  function create() {
    const bundle = createBlankProject({
      clientName: clientName || 'New Client',
      campaignName: campaignName || 'New Campaign',
      objective: objective || undefined,
      budget: budget ? Number(budget) : undefined,
      budgetPeriod,
    });
    void onCreate(bundle);
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New campaign project"
      description="You can change any of this later in the campaign overview."
      footer={
        <>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button onClick={create}>
            <Plus className="h-4 w-4" /> Create project
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Client name">
          <Input value={clientName} autoFocus onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Example Clinical Technology Company" />
        </Field>
        <Field label="Campaign name">
          <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. Clinical Trial Solutions Search" />
        </Field>
        <Field label="Objective" hint="Optional">
          <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} placeholder="e.g. Generate qualified demo requests" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget" hint="Optional">
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="250" />
          </Field>
          <Field label="Budget period">
            <Select value={budgetPeriod} onChange={(e) => setBudgetPeriod(e.target.value as 'daily' | 'monthly')}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
