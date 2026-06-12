import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RotateCcw, Trash2, LayoutGrid } from 'lucide-react';
import { CampaignStoreProvider, useStore } from '@/store/CampaignStore';
import { AppShell } from '@/components/shell/AppShell';
import { CampaignSidebar } from '@/components/shell/CampaignSidebar';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { CampaignOverview } from '@/components/editor/CampaignOverview';
import { CampaignStructure } from '@/components/editor/CampaignStructure';
import { AdGroupWorkspace } from '@/components/editor/AdGroupWorkspace';
import { FeedbackSummary } from '@/components/editor/FeedbackSummary';
import { ValidationSummary } from '@/components/editor/ValidationSummary';
import { EditorFinalApproval } from '@/components/editor/EditorFinalApproval';
import {
  ImportDialog,
  ExportDialog,
  ClientReviewPackageDialog,
} from '@/components/editor/ProjectDialogs';
import { GlobalSearchDialog } from '@/components/editor/GlobalSearchDialog';
import { ConfirmationDialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { Network } from 'lucide-react';
import type { View } from '@/app/navigation';

export function EditorApp() {
  return (
    <CampaignStoreProvider initialMode="editor">
      <EditorAppInner />
    </CampaignStoreProvider>
  );
}

function EditorAppInner() {
  const { loaded, campaign, reorderAdGroupsByIndex, addAdGroup, resetDemo, clearProject } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!loaded || !campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentAdGroup =
    view.kind === 'adgroup' ? campaign.adGroups.find((ag) => ag.id === view.id) : undefined;

  function handleAddAdGroup() {
    const ag = addAdGroup(`Ad Group ${campaign!.adGroups.length + 1}`);
    if (ag) {
      setView({ kind: 'adgroup', id: ag.id });
      toast('Ad group created');
    }
  }

  return (
    <AppShell
      header={
        <EditorHeader
          onImport={() => setImportOpen(true)}
          onExport={() => setExportOpen(true)}
          onCreatePackage={() => setPackageOpen(true)}
          onValidate={() => setView({ kind: 'validation' })}
          onSearch={() => setSearchOpen(true)}
        />
      }
      sidebar={
        <div className="flex h-full flex-col">
          <CampaignSidebar
            mode="editor"
            current={view}
            onNavigate={setView}
            onAddAdGroup={handleAddAdGroup}
            onReorder={reorderAdGroupsByIndex}
          />
          <div className="mt-auto flex flex-col gap-1 border-t border-border p-3">
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => navigate('/')}>
              <LayoutGrid className="h-3.5 w-3.5" /> All projects
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => { resetDemo(); toast('Demo data reset'); setView({ kind: 'overview' }); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
            </Button>
            <Button variant="ghost" size="sm" className="justify-start text-destructive" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear project
            </Button>
          </div>
        </div>
      }
    >
      {view.kind === 'overview' && <CampaignOverview />}
      {view.kind === 'structure' && <CampaignStructure onOpenAdGroup={setView} />}
      {view.kind === 'adgroup' &&
        (currentAdGroup ? (
          <AdGroupWorkspace key={currentAdGroup.id} adGroup={currentAdGroup} />
        ) : (
          <EmptyState icon={Network} title="Ad group not found" description="It may have been deleted." />
        ))}
      {view.kind === 'feedback' && <FeedbackSummary onNavigate={setView} />}
      {view.kind === 'validation' && <ValidationSummary onNavigate={setView} />}
      {view.kind === 'final' && <EditorFinalApproval />}

      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={setView} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <ClientReviewPackageDialog open={packageOpen} onClose={() => setPackageOpen(false)} />
      <ConfirmationDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearProject();
          setView({ kind: 'overview' });
          toast('Project cleared');
        }}
        title="Clear this project?"
        message="This permanently removes the current campaign, all client feedback, and internal notes from this browser."
        confirmLabel="Clear project"
        destructive
      />
    </AppShell>
  );
}
