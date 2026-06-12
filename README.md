# Google Ads Campaign Builder

A polished web application that helps a paid media specialist **build, organize, present, and collect approval** for a Google Ads Search campaign. It replaces the spreadsheet-and-email approval loop with a dedicated, app-like experience split into two strictly separated modes:

- **Editor Mode** — the internal campaign-building workspace (the only place campaign content can change).
- **Client Review Mode** — a read-only approval experience where the client can approve, request changes, and comment, but can never edit campaign content.

The app runs entirely in the browser with no backend. Data persists to `localStorage` through a swappable repository abstraction.

---

## Product overview

The intended workflow:

1. The specialist creates a campaign and one or more ad groups.
2. They **paste keywords, headlines, and descriptions in bulk** — the app splits, trims, numbers, validates, and de-duplicates them automatically.
3. Assets are organized in a **Google Ads Editor–style** sortable list (drag-and-drop **plus** accessible move buttons), with pinning, activation, and inline editing.
4. A **realistic (unofficial) Google Search ad preview** is generated, respecting pins and skipping invalid/inactive/over-limit assets.
5. The specialist opens a **Client Review Package** (a shareable read-only review link and/or a sanitized JSON file).
6. The client reviews each ad group: approves/requests changes/comments on **every individual headline and description**, approves the keyword section, completes checklists, and submits an overall campaign review.
7. The editor sees **all comments and approval statuses in one place** and can resolve them, revise assets (which resets review status), and create new campaign versions.

---

## Project dashboard

The app opens on a **dashboard** (route `#/`) listing every saved project as a card (campaign name, client, ad group count, review progress, last updated). From here you can:

- **New project** — a short dialog (client, campaign, objective, budget) creates a blank campaign and opens it in the editor.
- **Open** an existing project, **Duplicate** it (deep clone with brand-new stable IDs and a fresh review), or **Delete** it.
- **Import project** — load a full project JSON export.
- **Load sample project** — seed the realistic demo campaign.

The editor's sidebar has an **All projects** link to return here. The editor lives at `#/editor` and the client experience at `#/review`.

## Editor workflow

- **Campaign Overview** — edit campaign settings, see review progress, add an internal campaign note.
- **Campaign Structure** — add / rename / duplicate / reorder / delete ad groups.
- **Ad group workspace** with tabs:
  - **Overview** — name, theme, search intent, final URL, display paths, client-facing context, internal note.
  - **Keywords** — paste in bulk, add/edit/delete, change match types, apply a match type to many, search/filter, negative keywords.
  - **Ad Copy** — headline and description panels with drag-to-reorder, pins, activate/deactivate, inline edit, duplicate, delete, multi-select bulk actions, a one-click **Generate** action (see below), and a sticky ad preview.
  - **Preview** — step through valid ad combinations on desktop/mobile.
  - **Client Feedback** — per-ad-group client feedback with internal resolution notes.
- **Global search** (toolbar button or ⌘K / Ctrl+K) — a command-palette that searches across ad groups, keywords, headlines, descriptions, client comments, and (Editor Mode only) internal notes; arrow-key navigation, Enter to jump to the ad group. Internal notes are searched only in Editor Mode — never surfaced in Client Review Mode.
- **Client Feedback** (campaign-wide) — summary cards, grouped feedback, "show only items requiring action" filter, jump-to-asset.
- **Validation** — missing assets, over-limit assets, duplicates, invalid URLs, pin conflicts, thin ad groups, unresolved change requests.
- **Final Approval** — submission status, ad group status, and version controls.

## Client review workflow

- **Campaign Overview** — read-only campaign details and ad group list.
- **Campaign Structure** — read-only navigation.
- **Ad group review** — about/intent/landing page, keyword review (approve section, flag individual keywords, notes), **individual approval + comment for every headline and description**, sticky Google Search preview, ad group checklist, and overall ad group approval with a general note.
- **Review Summary** — progress across the whole campaign.
- **Final Approval** — campaign summary, campaign checklist, reviewer info, final note, and **Approve / Approve with comments / Request changes** (with confirmation).

Clients can **export their feedback** (JSON, CSV, or print/PDF) and reopen a submitted review to make changes.

---

## Bulk paste instructions

Every asset type supports bulk entry from a prominent **Paste** action:

- **Paste Headlines / Paste Descriptions** — one per line. The app splits by line, trims spaces, removes blank lines, counts characters, flags over-limit and duplicate lines, preserves order, lets you remove individual lines, and choose **append** or **replace**.
- **Paste Keywords** — match types are inferred automatically:
  - `clinical trial imaging` → **broad**
  - `"clinical trial imaging software"` → **phrase**
  - `[oncology trial imaging]` → **exact**

### Generate ad copy from keywords + context

In the **Ad Copy** tab, each panel has a **Generate** action that builds candidate headlines and descriptions from the ad group's **keywords, theme, search intent, and client-facing context**. The dialog has two modes:

- **AI** — a real LLM writes the copy from your inputs. Connect a provider once via **AI settings** (gear in the Generate dialog):
  - **Server proxy (recommended)** — the app POSTs to `/api/llm/chat` and the **key stays on the server** (nothing sensitive in the browser). The proxy ships with the app: it runs as Vite dev/preview middleware (`npm run dev`) and as a zero-dependency production server (`npm start` → `server/proxy.mjs`). It selects the upstream from environment variables — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `LLM_API_KEY` + `LLM_BASE_URL` (point this at any OpenAI-compatible gateway). See **Deployment**.
  - **Anthropic / OpenAI / OpenAI-compatible (browser key)** — the call goes directly from the browser; the key is stored **only in this browser's localStorage** and is **never** included in any campaign or client export. Fine for local/internal use.
- **Built-in** — a local, deterministic, no-backend generator (`src/lib/suggestions.ts`) that composes copy from your keywords and theme. Always available, and the automatic fallback when no AI provider is connected.

Both modes show suggestions with live character counts and checkboxes so you pick which to add; "Regenerate" surfaces fresh options. The AI layer lives in `src/lib/ai.ts` (provider-agnostic, unit-tested parsing/filtering) with a shared server handler in `server/llm-handler.mjs`. Requests use structured JSON output; responses are parsed robustly and filtered to valid, non-duplicate items within the RSA character limits.

### Spreadsheet paste support

If you paste tab-separated content copied from Excel or Google Sheets, the dialog detects the table, shows a **column-mapping step**, and lets you choose which column is the asset text, pin position, note, or asset number. Empty cells, extra spaces, header rows, and numbered rows are handled.

## Asset reordering

Assets can be reordered by **drag-and-drop** (with `@dnd-kit`) and by **accessible buttons** (move up / down / to top / to bottom). Asset numbers update automatically and the order persists after refresh. Reordering preserves stable asset IDs — IDs are never derived from array indexes.

---

## Permission model

A single permission set drives every mutation (`src/lib/permissions.ts`):

```ts
interface AppPermissions {
  canEditCampaign; canEditAdGroups; canEditKeywords; canEditAssets;
  canEditUrls; canReorderAssets; canManageInternalNotes; canImportData;
  canDeleteContent; canApprove; canRequestChanges; canAddClientComments;
  canSubmitReview;
}
```

Every campaign-editing function calls `assertPermission(permissions, '<flag>')` before mutating and **throws** a `PermissionError` when the current mode lacks the flag. This is enforced in code (`src/lib/campaign-ops.ts`), not by hidden buttons or CSS. Client Review Mode is granted only the approve/comment/submit flags, so any attempt to mutate campaign content fails.

## Data separation

Three categories of data are stored and persisted separately:

1. **Campaign proposal** (`CampaignProposal`) — the campaign content.
2. **Client review** (`ClientReview`) — approvals, comments, checklists, reviewer info. The **only** data Client Review Mode mutates.
3. **Internal editor data** (`InternalEditorData`) — campaign/ad group/keyword/asset notes and feedback resolution notes. **Never** exposed to the client.

## Internal note protection

Internal notes never appear in Client Review Mode, client exports, the client review package, printed reports, the feedback CSV, or the client JSON. A sanitization choke point (`src/lib/sanitize.ts`) builds the client package, and `assertNoInternalData()` guards every client-facing export. Automated tests verify that the sanitized package and feedback CSV contain none of the internal note values.

---

## Installation

```bash
npm install
```

## Development commands

```bash
npm run dev        # start the Vite dev server
npm run typecheck  # TypeScript project references, no emit
```

## Testing commands

```bash
npm test           # run the Vitest suite once
npm run test:watch # watch mode
```

The suite covers bulk parsing, spreadsheet parsing, match-type inference, character-limit validation, duplicate detection, asset reordering + stable IDs, preview combination generation, pinned placement, approval/ad-group/campaign progress, permission checks, client mutation prevention, internal-note sanitization, revision reset, import validation, and feedback export.

## Build command

```bash
npm run build      # tsc -b && vite build  → dist/
npm run preview    # preview the production build
```

## Deployment

The output in `dist/` is a static SPA using a hash router (`#/` dashboard, `#/editor`, `#/review`), so it works on any static host (Netlify, Vercel, GitHub Pages, S3/CloudFront) with no rewrite rules.

**With server-side AI (recommended).** To keep the LLM key off the browser, serve the build with the bundled Node server, which also exposes the `/api/llm/chat` proxy:

```bash
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm start     # serves dist/ + proxy on PORT (default 8080)
```

The proxy reads its upstream from the environment (or a gitignored `.env.local`):

```bash
# pick ONE provider:
ANTHROPIC_API_KEY=sk-ant-...                # Anthropic (default model claude-opus-4-8; override ANTHROPIC_MODEL)
OPENAI_API_KEY=sk-...                        # OpenAI (override OPENAI_MODEL)
LLM_API_KEY=...  LLM_BASE_URL=https://your-gateway/v1  LLM_MODEL=...   # any OpenAI-compatible gateway
```

During development the same `/api/llm/chat` endpoint is served by Vite middleware, so `npm run dev` with a key in `.env.local` gives you the server-proxy path locally. In the app, choose the **Server proxy** provider in AI settings (no key entered in the browser). The static-only deploy still works — it just falls back to the browser-key providers or the built-in generator.

---

## Local storage behavior

- Campaign, review, internal, and settings data are stored under separate `gacr:*` keys.
- Saves are **debounced** and autosaved; the header shows the last saved time and a saving indicator.
- Data is wrapped with a **schema version**, validated with **Zod** on read, and **malformed records are recovered gracefully** (the offending record is dropped rather than crashing the app).
- On first launch the app seeds realistic **demo data**. "Reset demo data" and "Clear project" (with confirmation) are available in the editor sidebar.

## Import formats

- **Full project (JSON)** — `{ campaign, review, internal }`, validated with Zod.
- **Returned client feedback (JSON)** — a `ClientReview` (or a client review package); merged into the current campaign after a campaign-id check.
- **Campaign CSV** — columns: `Campaign, Ad Group, Asset Type, Asset Number, Text, Match Type, Final URL, Path 1, Path 2, Pin Position, Active`. Asset types: `Keyword`, `Negative Keyword`, `Headline`, `Description`. A preview shows detected campaigns/ad groups, counts, duplicate rows, invalid rows, and character-limit issues; confirming **builds a new project** — rows are grouped into ad groups with their keywords, headlines, descriptions, URLs, paths, pins, and active flags (invalid rows skipped), and the project opens in the editor.

## Export formats

- **Google Ads Editor (copy & paste)** — from **Export**, copy a tab-separated block straight into Google Ads Editor's paste grid, or download the `.tsv`:
  - **Responsive Search Ads** — one RSA per ad group with `Headline 1..15` / `Description 1..4`, `Path 1/2`, and `Final URL`. Pins are carried in the matching `Headline N position` / `Description N position` columns. Inactive, empty, over-limit, and duplicate assets are excluded so the paste imports cleanly.
  - **Keywords** — `Campaign, Ad Group, Keyword, Match Type, Final URL, Status` (one row per keyword; bare terms with a Match Type column, as Editor expects).
  - **Negative keywords** — `Campaign, Ad Group, Keyword, Match Type` for Editor's negative-keywords grid.
- **Full project (JSON)** — everything, including internal data (for your own backups).
- **Client review package (JSON)** — sanitized; safe to share.
- **Client feedback only (JSON / CSV)** — approvals and comments, no internal data.
- **Campaign structure (CSV)**.
- **Print / Save as PDF** — print-friendly report (internal-only UI is hidden via `@media print`).

---

## Client review package

**Chosen approach (documented):** a **dedicated review route** plus a **sanitized JSON package** and a **feedback return flow**, rather than a generated standalone HTML file.

The editor's **Create Client Review Package** action provides two ways to hand off:

1. **Share the review link** — `#/review` opens directly in Client Review Mode. It shows no mode switch and no editor controls, renders only sanitized campaign content, saves feedback locally, and supports export + print. Host the built app (or share the link on a shared machine) to give the client this experience.
2. **Download a sanitized package** — a self-contained `*-client-review-package.json` (campaign proposal + review state, no internal data, Zod-validated).

### Client feedback return process

The client completes their review and uses **Export Feedback** to download a JSON (or CSV/PDF). They send the JSON back to the agency, who uses **Import → returned client feedback** to merge it into the campaign (matched by campaign id). The editor then sees every approval and comment on the **Client Feedback** page.

---

## Revisions after client feedback

When the editor edits an asset that the client had already reviewed:

- the previous version is preserved in the asset's **revision history**;
- the asset is flagged **“Updated after review”** (editor) / **“Updated since your previous review”** (client);
- the client review status for that asset is **reset to pending**, so it must be reviewed again.

Campaigns carry a **version number**; "Create version N+1" bumps it and links the review to the version that was reviewed.

---

## Current no-backend limitations

- Data lives in the **current browser's** `localStorage`; it is not shared across devices or users automatically. Handoff happens through the JSON package / feedback files.
- There is no authentication; mode separation is enforced in-app via the permission system. For a true production handoff the client experience should be served as its own deployment or behind auth.
- No real-time collaboration or server-side conflict resolution.

## Future backend recommendations

- Implement the `CampaignRepository` interface (`src/storage/repository.ts`) against a real API/database — the UI already talks only to this async abstraction.
- Add authentication and per-role tokens so Editor and Client modes map to real, server-verified roles (the `AppPermissions` model maps cleanly to server-side checks).
- Persist campaign versions and review submissions server-side; expose a signed, expiring client review link instead of sharing files.
- Keep the sanitization layer server-side as well, so internal data never leaves the backend on client-facing endpoints.

## Privacy considerations

- Internal notes are stripped from every client-facing surface and verified by tests; treat the sanitization layer as the single source of truth when adding new client outputs.
- Because data is stored locally, anyone with access to the browser profile can read it. Use "Clear project" on shared machines.
- Exports are plain files — handle them with the same care as any campaign document.

---

## Tech stack

React + TypeScript + Vite · Tailwind CSS · shadcn-style UI primitives · `@dnd-kit` · Zod · React Hook Form · Lucide icons · Vitest + Testing Library.

## Project structure

```
src/
  app/            App shell, routing, Editor & Client apps, navigation types
  components/
    ui/           Reusable primitives (Button, Card, Dialog, Tabs, Toast, …)
    shared/       Cross-mode components (status badge, ad preview, char count, …)
    shell/        AppShell + CampaignSidebar
    editor/       Editor-only components (asset/keyword managers, dialogs, …)
    client/       Client-only review components
  lib/            Pure logic: parsing, validation, permissions, review math,
                  preview generation, sanitization, CSV, Zod schemas (all unit-tested)
  storage/        Repository interface + localStorage implementation
  data/           Demo data
  types/          Domain types
```
