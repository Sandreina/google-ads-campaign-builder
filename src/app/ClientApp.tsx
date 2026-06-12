import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Network } from 'lucide-react';
import { CampaignStoreProvider, useStore } from '@/store/CampaignStore';
import { AppShell } from '@/components/shell/AppShell';
import { CampaignSidebar } from '@/components/shell/CampaignSidebar';
import { ClientReviewHeader } from '@/components/client/ClientReviewHeader';
import { ClientOverview } from '@/components/client/ClientOverview';
import { ClientStructure } from '@/components/client/ClientStructure';
import { ClientAdGroupReview } from '@/components/client/ClientAdGroupReview';
import { ClientReviewSummary } from '@/components/client/ClientReviewSummary';
import { ClientFinalApproval } from '@/components/client/ClientFinalApproval';
import { ClientExportDialog } from '@/components/client/ClientExportDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/Button';
import type { View } from '@/app/navigation';

export function ClientApp() {
  return (
    <CampaignStoreProvider initialMode="client">
      <ClientAppInner />
    </CampaignStoreProvider>
  );
}

function ClientAppInner() {
  const { loaded, campaign } = useStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [exportOpen, setExportOpen] = useState(false);

  if (!loaded || !campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentAdGroup = view.kind === 'adgroup' ? campaign.adGroups.find((ag) => ag.id === view.id) : undefined;

  return (
    <AppShell
      header={<ClientReviewHeader onExport={() => setExportOpen(true)} />}
      sidebar={
        <div className="flex h-full flex-col">
          <CampaignSidebar mode="client" current={view} onNavigate={setView} />
          <div className="no-print mt-auto border-t border-border p-3">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => navigate('/editor')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Exit preview
            </Button>
          </div>
        </div>
      }
    >
      {view.kind === 'overview' && <ClientOverview onNavigate={setView} />}
      {view.kind === 'structure' && <ClientStructure onNavigate={setView} />}
      {view.kind === 'adgroup' &&
        (currentAdGroup ? (
          <ClientAdGroupReview key={currentAdGroup.id} adGroup={currentAdGroup} />
        ) : (
          <EmptyState icon={Network} title="Ad group not found" description="It may no longer be available." />
        ))}
      {view.kind === 'summary' && <ClientReviewSummary onNavigate={setView} />}
      {view.kind === 'final' && <ClientFinalApproval />}

      <ClientExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </AppShell>
  );
}
