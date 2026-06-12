import type { CampaignProposal, ClientReview, InternalEditorData } from '@/types';

/**
 * Persistence abstraction. The localStorage implementation can be swapped for
 * an API/database client later without touching the UI. All methods are async
 * to keep that future swap seamless.
 */
export interface CampaignRepository {
  getCampaigns(): Promise<CampaignProposal[]>;
  getCampaign(id: string): Promise<CampaignProposal | null>;
  saveCampaign(campaign: CampaignProposal): Promise<void>;
  deleteCampaign(id: string): Promise<void>;
  getClientReview(campaignId: string): Promise<ClientReview | null>;
  saveClientReview(review: ClientReview): Promise<void>;
  getInternalData(campaignId: string): Promise<InternalEditorData | null>;
  saveInternalData(data: InternalEditorData): Promise<void>;
  /** Clears all persisted project data. */
  clearAll(): Promise<void>;
}
