import { useRef, useState } from 'react';
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  PackageCheck,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Megaphone,
  KeyRound,
  Ban,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { downloadFile, slugify } from '@/lib/utils';
import { campaignToCsv, feedbackToCsv, previewCsvImport, adGroupsFromCsv } from '@/lib/csv';
import {
  campaignToEditorAdsTsv,
  campaignToEditorKeywordsTsv,
  campaignToEditorNegativesTsv,
  hasNegatives,
} from '@/lib/google-ads-editor';
import { buildClientReviewPackage, assertNoInternalData } from '@/lib/sanitize';
import { projectBundleSchema, clientReviewSchema } from '@/lib/schemas';
import { createBlankProject } from '@/lib/project';
import type { ProjectBundle } from '@/types';

/* ---------------- Export Dialog ---------------- */

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { campaign, review, internal } = useStore();
  const toast = useToast();
  if (!campaign || !review || !internal) return null;

  const base = slugify(campaign.campaignName) || 'campaign';

  const exportProject = () => {
    const bundle: ProjectBundle = { campaign, review, internal };
    downloadFile(`${base}-project.json`, JSON.stringify(bundle, null, 2), 'application/json');
    toast('Full project exported');
  };
  const exportClientPackage = () => {
    const pkg = buildClientReviewPackage(campaign, review);
    assertNoInternalData(pkg); // guard: never leak internal data
    downloadFile(`${base}-client-review-package.json`, JSON.stringify(pkg, null, 2), 'application/json');
    toast('Sanitized client package exported');
  };
  const exportFeedbackJson = () => {
    const pkg = buildClientReviewPackage(campaign, review);
    assertNoInternalData(pkg.review);
    downloadFile(`${base}-feedback.json`, JSON.stringify(pkg.review, null, 2), 'application/json');
    toast('Client feedback exported');
  };
  const exportCampaignCsv = () => {
    downloadFile(`${base}-campaign.csv`, campaignToCsv(campaign), 'text/csv');
    toast('Campaign CSV exported');
  };
  const exportFeedbackCsv = () => {
    const csv = feedbackToCsv(campaign, review);
    downloadFile(`${base}-feedback.csv`, csv, 'text/csv');
    toast('Feedback CSV exported');
  };

  async function copyTsv(label: string, tsv: string) {
    try {
      await navigator.clipboard.writeText(tsv);
      toast(`${label} copied — paste into Google Ads Editor`);
    } catch {
      toast('Copy failed — use the download instead', 'error');
    }
  }
  const downloadTsv = (name: string, tsv: string, label: string) => {
    downloadFile(`${base}-${name}.tsv`, tsv, 'text/tab-separated-values');
    toast(`${label} downloaded`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export" description="Send to Google Ads Editor, or download project data and feedback." size="md">
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-semibold">Google Ads Editor</h3>
            <p className="text-xs text-muted-foreground">
              Copy a block and paste it straight into Google Ads Editor's grid (or download the .tsv). Pins are
              included as position columns; over-limit and inactive assets are excluded.
            </p>
          </div>
          <EditorExportRow
            icon={Megaphone}
            title="Responsive Search Ads"
            desc="One RSA per ad group — headlines, descriptions, paths, final URL."
            onCopy={() => copyTsv('Responsive Search Ads', campaignToEditorAdsTsv(campaign))}
            onDownload={() => downloadTsv('google-ads-editor-ads', campaignToEditorAdsTsv(campaign), 'Ads')}
          />
          <EditorExportRow
            icon={KeyRound}
            title="Keywords"
            desc="Campaign, ad group, keyword, match type, status."
            onCopy={() => copyTsv('Keywords', campaignToEditorKeywordsTsv(campaign))}
            onDownload={() => downloadTsv('google-ads-editor-keywords', campaignToEditorKeywordsTsv(campaign), 'Keywords')}
          />
          {hasNegatives(campaign) && (
            <EditorExportRow
              icon={Ban}
              title="Negative keywords"
              desc="For Editor's negative keywords grid."
              onCopy={() => copyTsv('Negative keywords', campaignToEditorNegativesTsv(campaign))}
              onDownload={() => downloadTsv('google-ads-editor-negatives', campaignToEditorNegativesTsv(campaign), 'Negative keywords')}
            />
          )}
        </section>

        <section className="flex flex-col gap-2.5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Project & feedback</h3>
          <ExportRow icon={FileJson} title="Full project (JSON)" desc="Campaign, client review, and internal notes." onClick={exportProject} />
          <ExportRow
            icon={PackageCheck}
            title="Client review package (JSON)"
            desc="Sanitized — safe to share with the client. No internal notes."
            onClick={exportClientPackage}
            highlight
          />
          <ExportRow icon={FileJson} title="Client feedback only (JSON)" desc="Just the review state to re-import." onClick={exportFeedbackJson} />
          <ExportRow icon={FileSpreadsheet} title="Campaign structure (CSV)" desc="All keywords, headlines, and descriptions." onClick={exportCampaignCsv} />
          <ExportRow icon={FileSpreadsheet} title="Client feedback (CSV)" desc="Approvals and comments. No internal notes." onClick={exportFeedbackCsv} />
        </section>
      </div>
    </Dialog>
  );
}

function EditorExportRow({
  icon: Icon,
  title,
  desc,
  onCopy,
  onDownload,
}: {
  icon: typeof FileJson;
  title: string;
  desc: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Button size="sm" onClick={onCopy}>
        <ClipboardCopy className="h-3.5 w-3.5" /> Copy
      </Button>
      <Button variant="outline" size="icon" aria-label={`Download ${title} as TSV`} onClick={onDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ExportRow({
  icon: Icon,
  title,
  desc,
  onClick,
  highlight,
}: {
  icon: typeof FileJson;
  title: string;
  desc: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-secondary ${
        highlight ? 'border-primary/40 bg-accent/40' : 'border-border'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/* ---------------- Import Dialog ---------------- */

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { loadProject, campaign, review, updateReview } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof previewCsvImport> | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setCsvPreview(null);
    const text = await file.text();

    if (file.name.endsWith('.csv')) {
      try {
        setCsvPreview(previewCsvImport(text));
      } catch {
        setError('Could not parse the CSV file.');
      }
      return;
    }

    // JSON
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      setError('Invalid JSON file.');
      return;
    }

    // Full project bundle?
    const bundle = projectBundleSchema.safeParse(data);
    if (bundle.success) {
      loadProject(bundle.data as ProjectBundle);
      toast('Project imported');
      onClose();
      return;
    }

    // Returned client feedback (review object)?
    const reviewParse = clientReviewSchema.safeParse(data);
    if (reviewParse.success && campaign) {
      if (reviewParse.data.campaignId !== campaign.id) {
        setError('This feedback belongs to a different campaign.');
        return;
      }
      updateReview(() => reviewParse.data);
      toast('Client feedback imported');
      onClose();
      return;
    }

    // Client review package?
    if (data && typeof data === 'object' && (data as { kind?: string }).kind === 'client-review-package') {
      const pkgReview = (data as { review?: unknown }).review;
      const pr = clientReviewSchema.safeParse(pkgReview);
      if (pr.success && campaign && pr.data.campaignId === campaign.id) {
        updateReview(() => pr.data);
        toast('Feedback from package imported');
        onClose();
        return;
      }
    }

    setError(
      bundle.error
        ? `Validation failed: ${bundle.error.issues[0]?.message ?? 'unrecognized file format'}.`
        : 'Unrecognized file format.',
    );
  }

  void review; // referenced for completeness

  return (
    <Dialog
      open={open}
      onClose={() => {
        setError(null);
        setCsvPreview(null);
        onClose();
      }}
      title="Import"
      description="Import a full project (JSON), returned client feedback (JSON), or a campaign CSV."
      size="md"
      footer={
        csvPreview ? (
          <>
            <Button variant="outline" onClick={() => setCsvPreview(null)}>
              Choose another file
            </Button>
            <Button
              onClick={() => {
                const adGroups = adGroupsFromCsv(csvPreview.parsedRows);
                const campaignName = [...csvPreview.campaigns][0] || 'Imported campaign';
                const project = createBlankProject({ clientName: 'Imported', campaignName });
                project.campaign.adGroups = adGroups;
                loadProject(project);
                toast(`Imported ${adGroups.length} ad groups from CSV`);
                onClose();
                setCsvPreview(null);
              }}
              disabled={csvPreview.invalidRows === csvPreview.parsedRows.length}
            >
              Import {csvPreview.adGroups.size} ad groups
            </Button>
          </>
        ) : undefined
      }
    >
      {!csvPreview ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-10 text-center transition-colors hover:bg-secondary/60"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to choose a file</span>
            <span className="text-xs text-muted-foreground">.json or .csv</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Detected in this CSV:</p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Stat label="Campaigns" value={csvPreview.campaigns.size} />
            <Stat label="Ad groups" value={csvPreview.adGroups.size} />
            <Stat label="Keywords" value={csvPreview.keywordCount} />
            <Stat label="Headlines" value={csvPreview.headlineCount} />
            <Stat label="Descriptions" value={csvPreview.descriptionCount} />
            <Stat label="Total rows" value={csvPreview.parsedRows.length} />
          </div>
          <div className="flex flex-wrap gap-2">
            {csvPreview.duplicateRows > 0 && <Badge tone="warning">{csvPreview.duplicateRows} duplicate rows</Badge>}
            {csvPreview.invalidRows > 0 && <Badge tone="destructive">{csvPreview.invalidRows} invalid rows</Badge>}
            {csvPreview.charLimitIssues > 0 && <Badge tone="destructive">{csvPreview.charLimitIssues} over limit</Badge>}
            {csvPreview.duplicateRows === 0 && csvPreview.invalidRows === 0 && (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> No issues detected
              </Badge>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- Client Review Package Dialog ---------------- */

export function ClientReviewPackageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { campaign, review } = useStore();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!campaign || !review) return null;

  const base = slugify(campaign.campaignName) || 'campaign';
  const reviewUrl = `${window.location.origin}${window.location.pathname}#/review`;

  const downloadPackage = () => {
    const pkg = buildClientReviewPackage(campaign, review);
    assertNoInternalData(pkg);
    downloadFile(`${base}-client-review-package.json`, JSON.stringify(pkg, null, 2), 'application/json');
    toast('Client review package downloaded');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Copy failed — select the link manually', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Client Review Package"
      description="Share a polished, read-only review experience. Internal notes are always removed."
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-primary/30 bg-accent/40 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <LinkIcon className="h-4 w-4" /> Share the review link
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Opens directly in Client Review Mode — no editor controls, no internal notes. Feedback saves locally and
            can be exported back to you.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-border bg-card px-2.5 py-1.5 text-xs">{reviewUrl}</code>
            <Button size="sm" onClick={copyLink}>
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4" /> Download sanitized package
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            A self-contained JSON file with the campaign proposal and review state — no internal data. The client opens
            it from the review screen and returns their feedback file when done.
          </p>
          <Button size="sm" onClick={downloadPackage}>
            <Download className="h-3.5 w-3.5" /> Download package
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Internal notes, resolution notes, and editor-only data are stripped from every client-facing export and
            from the review experience. This is enforced by a sanitization step and verified by automated tests.
          </span>
        </div>
      </div>
    </Dialog>
  );
}
