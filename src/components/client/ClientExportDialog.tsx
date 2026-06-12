import { Download, FileJson, FileSpreadsheet, Printer, ShieldCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { downloadFile, slugify } from '@/lib/utils';
import { feedbackToCsv } from '@/lib/csv';
import { assertNoInternalData } from '@/lib/sanitize';

export function ClientExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { campaign, review } = useStore();
  const toast = useToast();
  if (!campaign || !review) return null;

  const base = slugify(campaign.campaignName) || 'campaign';

  const exportJson = () => {
    // Feedback only — guaranteed free of internal data.
    assertNoInternalData(review);
    downloadFile(`${base}-feedback.json`, JSON.stringify(review, null, 2), 'application/json');
    toast('Feedback exported as JSON');
  };
  const exportCsv = () => {
    downloadFile(`${base}-feedback.csv`, feedbackToCsv(campaign, review), 'text/csv');
    toast('Feedback exported as CSV');
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export your feedback" description="Send these back to the team that prepared the campaign." size="md">
      <div className="flex flex-col gap-2.5">
        <Row icon={FileJson} title="Feedback (JSON)" desc="Re-importable by your agency to see every approval and comment." onClick={exportJson} />
        <Row icon={FileSpreadsheet} title="Feedback (CSV)" desc="A spreadsheet of approvals and comments." onClick={exportCsv} />
        <Row icon={Printer} title="Print / Save as PDF" desc="Open your browser's print dialog for a clean report." onClick={() => { onClose(); setTimeout(() => window.print(), 100); }} />
        <div className="mt-1 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Exports contain only your feedback and the campaign you reviewed — never internal agency notes.</span>
        </div>
      </div>
    </Dialog>
  );
}

function Row({ icon: Icon, title, desc, onClick }: { icon: typeof FileJson; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-secondary">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
