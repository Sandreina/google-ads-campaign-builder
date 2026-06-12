import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AdGroup,
  AppMode,
  AppPermissions,
  AssetType,
  CampaignProposal,
  ClientReview,
  InternalEditorData,
  ProjectBundle,
} from '@/types';
import { permissionsFor } from '@/lib/permissions';
import {
  addAdGroup as addAdGroupOp,
  duplicateAdGroup,
  removeAdGroup as removeAdGroupOp,
  reorderAdGroups as reorderAdGroupsOp,
  reviseAssetText,
  updateAdGroup as updateAdGroupOp,
  updateCampaignFields,
} from '@/lib/campaign-ops';
import { emptyClientReview, reconcileReview, getAssetFeedback } from '@/lib/review';
import { repository } from '@/storage/localStorageRepository';
import { buildDemoProject } from '@/data/demo';
import { STORAGE_KEYS } from '@/lib/constants';
import { debounce, nowIso } from '@/lib/utils';

type SaveStatus = 'idle' | 'saving' | 'saved';

interface StoreValue {
  loaded: boolean;
  mode: AppMode;
  permissions: AppPermissions;
  campaign: CampaignProposal | null;
  review: ClientReview | null;
  internal: InternalEditorData | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  /** Review is locked after the client submits, until the editor reopens it. */
  isLocked: boolean;

  setMode: (mode: AppMode) => void;

  // Campaign (editor) mutations — all permission-checked.
  patchCampaign: (fields: Partial<CampaignProposal>) => void;
  mutateAdGroup: (
    adGroupId: string,
    permission: keyof AppPermissions,
    updater: (ag: AdGroup) => AdGroup,
  ) => void;
  addAdGroup: (name: string) => AdGroup | null;
  removeAdGroup: (adGroupId: string) => void;
  duplicateAdGroupById: (adGroupId: string) => void;
  reorderAdGroupsByIndex: (from: number, to: number) => void;
  /** Edits asset text; if it was already reviewed, preserves history and resets status. */
  reviseAsset: (adGroupId: string, type: AssetType, assetId: string, newText: string) => void;
  /** Replaces the whole campaign (import / new version). */
  replaceCampaign: (campaign: CampaignProposal) => void;
  createNewVersion: () => void;

  // Review (client) mutations.
  updateReview: (updater: (review: ClientReview) => ClientReview) => void;
  reopenReview: () => void;

  // Internal (editor) mutations.
  updateInternal: (updater: (data: InternalEditorData) => InternalEditorData) => void;

  // Project lifecycle.
  loadProject: (bundle: ProjectBundle) => void;
  resetDemo: () => void;
  clearProject: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within CampaignStoreProvider');
  return ctx;
}

function emptyInternal(campaignId: string): InternalEditorData {
  return {
    campaignId,
    campaignNote: '',
    adGroupNotes: {},
    keywordNotes: {},
    assetNotes: {},
    resolutionNotes: {},
    resolvedFeedback: {},
  };
}

export function CampaignStoreProvider({
  children,
  initialMode = 'editor',
  /** When provided, the store runs against this bundle in read-only-ish package mode. */
  packageBundle,
}: {
  children: ReactNode;
  initialMode?: AppMode;
  packageBundle?: { campaign: CampaignProposal; review: ClientReview } | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [campaign, setCampaign] = useState<CampaignProposal | null>(null);
  const [review, setReview] = useState<ClientReview | null>(null);
  const [internal, setInternal] = useState<InternalEditorData | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const permissions = useMemo(() => permissionsFor(mode), [mode]);
  const isLocked = !!review?.submittedAt;
  const isPackageMode = !!packageBundle;

  // ----- Initial load -----
  // Guards against React StrictMode's double-invocation of this effect, which
  // would otherwise seed demo data twice and create duplicate campaigns.
  const initStarted = useRef(false);
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    (async () => {
      if (packageBundle) {
        // Standalone client package: campaign is fixed, review persisted locally.
        const stored = await repository.getClientReview(packageBundle.campaign.id);
        const baseReview = stored ?? packageBundle.review;
        setCampaign(packageBundle.campaign);
        setReview(reconcileReview(baseReview, packageBundle.campaign));
        setInternal(null);
        setLoaded(true);
        return;
      }

      const campaigns = await repository.getCampaigns();
      let active1: CampaignProposal;
      if (campaigns.length === 0) {
        // First launch — seed demo data.
        const demo = buildDemoProject();
        await repository.saveCampaign(demo.campaign);
        await repository.saveClientReview(demo.review);
        await repository.saveInternalData(demo.internal);
        localStorage.setItem(STORAGE_KEYS.activeCampaign, demo.campaign.id);
        active1 = demo.campaign;
      } else {
        const activeId = localStorage.getItem(STORAGE_KEYS.activeCampaign);
        active1 = campaigns.find((c) => c.id === activeId) ?? campaigns[0];
      }

      const [storedReview, storedInternal] = await Promise.all([
        repository.getClientReview(active1.id),
        repository.getInternalData(active1.id),
      ]);
      setCampaign(active1);
      setReview(reconcileReview(storedReview ?? emptyClientReview(active1), active1));
      setInternal(storedInternal ?? emptyInternal(active1.id));
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Autosave (debounced) -----
  const saveCampaignDebounced = useRef(
    debounce((c: CampaignProposal) => {
      void repository.saveCampaign(c).then(() => {
        setSaveStatus('saved');
        setLastSavedAt(nowIso());
      });
    }, 600),
  ).current;

  const saveReviewDebounced = useRef(
    debounce((r: ClientReview) => {
      void repository.saveClientReview(r).then(() => {
        setSaveStatus('saved');
        setLastSavedAt(nowIso());
      });
    }, 600),
  ).current;

  const saveInternalDebounced = useRef(
    debounce((d: InternalEditorData) => {
      void repository.saveInternalData(d).then(() => {
        setSaveStatus('saved');
        setLastSavedAt(nowIso());
      });
    }, 600),
  ).current;

  // ----- Mutation helpers that persist -----
  const commitCampaign = useCallback(
    (next: CampaignProposal) => {
      setCampaign(next);
      setSaveStatus('saving');
      saveCampaignDebounced(next);
    },
    [saveCampaignDebounced],
  );

  const commitReview = useCallback(
    (next: ClientReview) => {
      setReview(next);
      setSaveStatus('saving');
      saveReviewDebounced(next);
    },
    [saveReviewDebounced],
  );

  const commitInternal = useCallback(
    (next: InternalEditorData) => {
      setInternal(next);
      setSaveStatus('saving');
      saveInternalDebounced(next);
    },
    [saveInternalDebounced],
  );

  // ----- Campaign actions -----
  const patchCampaign = useCallback(
    (fields: Partial<CampaignProposal>) => {
      if (!campaign) return;
      commitCampaign(updateCampaignFields(campaign, permissions, fields));
    },
    [campaign, permissions, commitCampaign],
  );

  const mutateAdGroup = useCallback(
    (adGroupId: string, permission: keyof AppPermissions, updater: (ag: AdGroup) => AdGroup) => {
      if (!campaign) return;
      commitCampaign(updateAdGroupOp(campaign, permissions, permission, adGroupId, updater));
    },
    [campaign, permissions, commitCampaign],
  );

  const addAdGroup = useCallback(
    (name: string): AdGroup | null => {
      if (!campaign) return null;
      const { campaign: next, adGroup } = addAdGroupOp(campaign, permissions, name);
      // ensure review has an entry
      if (review) commitReview(reconcileReview(review, next));
      commitCampaign(next);
      return adGroup;
    },
    [campaign, permissions, review, commitCampaign, commitReview],
  );

  const removeAdGroup = useCallback(
    (adGroupId: string) => {
      if (!campaign) return;
      commitCampaign(removeAdGroupOp(campaign, permissions, adGroupId));
    },
    [campaign, permissions, commitCampaign],
  );

  const duplicateAdGroupById = useCallback(
    (adGroupId: string) => {
      if (!campaign) return;
      const source = campaign.adGroups.find((ag) => ag.id === adGroupId);
      if (!source) return;
      const copy = duplicateAdGroup(source);
      const idx = campaign.adGroups.findIndex((ag) => ag.id === adGroupId);
      const next: CampaignProposal = {
        ...campaign,
        updatedAt: nowIso(),
        adGroups: [
          ...campaign.adGroups.slice(0, idx + 1),
          copy,
          ...campaign.adGroups.slice(idx + 1),
        ],
      };
      if (review) commitReview(reconcileReview(review, next));
      commitCampaign(next);
    },
    [campaign, review, commitCampaign, commitReview],
  );

  const reorderAdGroupsByIndex = useCallback(
    (from: number, to: number) => {
      if (!campaign) return;
      commitCampaign(reorderAdGroupsOp(campaign, permissions, from, to));
    },
    [campaign, permissions, commitCampaign],
  );

  const reviseAsset = useCallback(
    (adGroupId: string, type: AssetType, assetId: string, newText: string) => {
      if (!campaign) return;
      const agReview = review?.adGroupReviews[adGroupId];
      const prevStatus = agReview ? getAssetFeedback(agReview, assetId).status : 'pending';
      const wasReviewed = prevStatus !== 'pending';

      const nextCampaign = updateAdGroupOp(campaign, permissions, 'canEditAssets', adGroupId, (ag) => {
        const list = type === 'headline' ? ag.headlines : ag.descriptions;
        const updated = list.map((a) =>
          a.id === assetId
            ? reviseAssetText(a, newText, { wasReviewed, previousStatus: prevStatus })
            : a,
        );
        return type === 'headline'
          ? { ...ag, headlines: updated }
          : { ...ag, descriptions: updated };
      });
      commitCampaign(nextCampaign);

      // Reset the client review status for a revised, previously-reviewed asset.
      if (wasReviewed && review) {
        const nextReview: ClientReview = {
          ...review,
          updatedAt: nowIso(),
          adGroupReviews: {
            ...review.adGroupReviews,
            [adGroupId]: {
              ...review.adGroupReviews[adGroupId],
              assetFeedback: {
                ...review.adGroupReviews[adGroupId].assetFeedback,
                [assetId]: {
                  ...getAssetFeedback(review.adGroupReviews[adGroupId], assetId),
                  status: 'pending',
                  updatedAt: nowIso(),
                },
              },
            },
          },
        };
        commitReview(nextReview);
      }
    },
    [campaign, review, permissions, commitCampaign, commitReview],
  );

  const replaceCampaign = useCallback(
    (next: CampaignProposal) => {
      commitCampaign(next);
      localStorage.setItem(STORAGE_KEYS.activeCampaign, next.id);
      if (review) commitReview(reconcileReview(review, next));
    },
    [commitCampaign, commitReview, review],
  );

  const createNewVersion = useCallback(() => {
    if (!campaign) return;
    const next: CampaignProposal = { ...campaign, version: campaign.version + 1, updatedAt: nowIso() };
    commitCampaign(next);
    if (review) commitReview({ ...review, campaignVersion: next.version, updatedAt: nowIso() });
  }, [campaign, review, commitCampaign, commitReview]);

  // ----- Review actions -----
  const updateReview = useCallback(
    (updater: (review: ClientReview) => ClientReview) => {
      if (!review) return;
      commitReview({ ...updater(review), updatedAt: nowIso() });
    },
    [review, commitReview],
  );

  const reopenReview = useCallback(() => {
    if (!review) return;
    commitReview({ ...review, submittedAt: undefined, updatedAt: nowIso() });
  }, [review, commitReview]);

  // ----- Internal actions -----
  const updateInternal = useCallback(
    (updater: (data: InternalEditorData) => InternalEditorData) => {
      if (!internal) return;
      commitInternal(updater(internal));
    },
    [internal, commitInternal],
  );

  // ----- Project lifecycle -----
  const loadProject = useCallback(
    (bundle: ProjectBundle) => {
      void (async () => {
        await repository.saveCampaign(bundle.campaign);
        await repository.saveClientReview(bundle.review);
        await repository.saveInternalData(bundle.internal);
        localStorage.setItem(STORAGE_KEYS.activeCampaign, bundle.campaign.id);
        setCampaign(bundle.campaign);
        setReview(reconcileReview(bundle.review, bundle.campaign));
        setInternal(bundle.internal);
        setLastSavedAt(nowIso());
        setSaveStatus('saved');
      })();
    },
    [],
  );

  const resetDemo = useCallback(() => {
    void (async () => {
      await repository.clearAll();
      const demo = buildDemoProject();
      await repository.saveCampaign(demo.campaign);
      await repository.saveClientReview(demo.review);
      await repository.saveInternalData(demo.internal);
      localStorage.setItem(STORAGE_KEYS.activeCampaign, demo.campaign.id);
      setCampaign(demo.campaign);
      setReview(demo.review);
      setInternal(demo.internal);
      setLastSavedAt(nowIso());
      setSaveStatus('saved');
    })();
  }, []);

  const clearProject = useCallback(() => {
    void (async () => {
      await repository.clearAll();
      const fresh = buildDemoProject();
      // Start from a blank-ish campaign rather than demo content.
      const blank: CampaignProposal = {
        ...fresh.campaign,
        clientName: 'New Client',
        campaignName: 'New Campaign',
        adGroups: [],
      };
      await repository.saveCampaign(blank);
      const blankReview = emptyClientReview(blank);
      await repository.saveClientReview(blankReview);
      const blankInternal = emptyInternal(blank.id);
      await repository.saveInternalData(blankInternal);
      localStorage.setItem(STORAGE_KEYS.activeCampaign, blank.id);
      setCampaign(blank);
      setReview(blankReview);
      setInternal(blankInternal);
      setLastSavedAt(nowIso());
      setSaveStatus('saved');
    })();
  }, []);

  const value: StoreValue = {
    loaded,
    mode,
    permissions,
    campaign,
    review,
    internal,
    saveStatus,
    lastSavedAt,
    isLocked,
    setMode: isPackageMode ? () => {} : setMode,
    patchCampaign,
    mutateAdGroup,
    addAdGroup,
    removeAdGroup,
    duplicateAdGroupById,
    reorderAdGroupsByIndex,
    reviseAsset,
    replaceCampaign,
    createNewVersion,
    updateReview,
    reopenReview,
    updateInternal,
    loadProject,
    resetDemo,
    clearProject,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
