import type { CampaignProposal, ClientReview, InternalEditorData } from '@/types';
import { STORAGE_KEYS, SCHEMA_VERSION } from '@/lib/constants';
import {
  campaignProposalSchema,
  clientReviewSchema,
  internalEditorDataSchema,
} from '@/lib/schemas';
import type { CampaignRepository } from './repository';

interface Envelope<T> {
  schemaVersion: number;
  data: T;
}

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Envelope<Record<string, T>>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return {};
    return parsed.data ?? {};
  } catch {
    // Malformed data recovery: do not crash, start clean for this key.
    console.warn(`[storage] Recovered from malformed data at "${key}".`);
    return {};
  }
}

function writeMap<T>(key: string, map: Record<string, T>): void {
  const envelope: Envelope<Record<string, T>> = { schemaVersion: SCHEMA_VERSION, data: map };
  localStorage.setItem(key, JSON.stringify(envelope));
}

/**
 * localStorage-backed repository. Validates persisted data with Zod on read and
 * silently recovers (dropping just the offending record) when data is malformed.
 */
export class LocalStorageRepository implements CampaignRepository {
  async getCampaigns(): Promise<CampaignProposal[]> {
    const map = readMap<CampaignProposal>(STORAGE_KEYS.campaigns);
    const result: CampaignProposal[] = [];
    for (const value of Object.values(map)) {
      const parsed = campaignProposalSchema.safeParse(value);
      if (parsed.success) result.push(parsed.data);
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCampaign(id: string): Promise<CampaignProposal | null> {
    const map = readMap<CampaignProposal>(STORAGE_KEYS.campaigns);
    const value = map[id];
    if (!value) return null;
    const parsed = campaignProposalSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  async saveCampaign(campaign: CampaignProposal): Promise<void> {
    const map = readMap<CampaignProposal>(STORAGE_KEYS.campaigns);
    map[campaign.id] = campaign;
    writeMap(STORAGE_KEYS.campaigns, map);
  }

  async deleteCampaign(id: string): Promise<void> {
    const campaigns = readMap<CampaignProposal>(STORAGE_KEYS.campaigns);
    delete campaigns[id];
    writeMap(STORAGE_KEYS.campaigns, campaigns);

    const reviews = readMap<ClientReview>(STORAGE_KEYS.reviews);
    delete reviews[id];
    writeMap(STORAGE_KEYS.reviews, reviews);

    const internal = readMap<InternalEditorData>(STORAGE_KEYS.internal);
    delete internal[id];
    writeMap(STORAGE_KEYS.internal, internal);
  }

  async getClientReview(campaignId: string): Promise<ClientReview | null> {
    const map = readMap<ClientReview>(STORAGE_KEYS.reviews);
    const value = map[campaignId];
    if (!value) return null;
    const parsed = clientReviewSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  async saveClientReview(review: ClientReview): Promise<void> {
    const map = readMap<ClientReview>(STORAGE_KEYS.reviews);
    map[review.campaignId] = review;
    writeMap(STORAGE_KEYS.reviews, map);
  }

  async getInternalData(campaignId: string): Promise<InternalEditorData | null> {
    const map = readMap<InternalEditorData>(STORAGE_KEYS.internal);
    const value = map[campaignId];
    if (!value) return null;
    const parsed = internalEditorDataSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  async saveInternalData(data: InternalEditorData): Promise<void> {
    const map = readMap<InternalEditorData>(STORAGE_KEYS.internal);
    map[data.campaignId] = data;
    writeMap(STORAGE_KEYS.internal, map);
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.campaigns);
    localStorage.removeItem(STORAGE_KEYS.reviews);
    localStorage.removeItem(STORAGE_KEYS.internal);
    localStorage.removeItem(STORAGE_KEYS.activeCampaign);
  }
}

export const repository: CampaignRepository = new LocalStorageRepository();
