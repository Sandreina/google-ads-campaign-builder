import type { CampaignProposal, ClientReview, InternalEditorData } from '@/types';
import { formatKeyword } from './parsing';
import { getAssetFeedback } from './review';

export type SearchKind =
  | 'Ad group'
  | 'Keyword'
  | 'Headline'
  | 'Description'
  | 'Client comment'
  | 'Internal note';

export interface SearchResult {
  id: string;
  kind: SearchKind;
  adGroupId?: string;
  adGroupName?: string;
  title: string;
  subtitle?: string;
}

function includes(haystack: string | undefined, needle: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(needle);
}

/**
 * Global search across campaign content, client feedback, and (Editor Mode
 * only) internal notes. Internal notes are included only when
 * `includeInternal` is true — Client Review Mode must never surface them.
 */
export function searchCampaign(
  campaign: CampaignProposal,
  review: ClientReview | null,
  internal: InternalEditorData | null,
  rawQuery: string,
  opts: { includeInternal: boolean; limit?: number } = { includeInternal: false },
): SearchResult[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? 60;
  const results: SearchResult[] = [];
  const push = (r: SearchResult) => {
    if (results.length < limit) results.push(r);
  };

  for (const ag of campaign.adGroups) {
    const agReview = review?.adGroupReviews[ag.id];

    if (includes(ag.name, q) || includes(ag.theme, q) || includes(ag.searchIntent, q) || includes(ag.clientFacingContext, q)) {
      push({ id: ag.id, kind: 'Ad group', adGroupId: ag.id, adGroupName: ag.name, title: ag.name, subtitle: ag.theme });
    }

    for (const kw of [...ag.keywords, ...ag.negativeKeywords]) {
      if (includes(kw.text, q)) {
        push({
          id: kw.id,
          kind: 'Keyword',
          adGroupId: ag.id,
          adGroupName: ag.name,
          title: formatKeyword(kw.text, kw.matchType),
          subtitle: ag.name,
        });
      }
    }

    ag.headlines.forEach((h, i) => {
      if (includes(h.text, q)) {
        push({ id: h.id, kind: 'Headline', adGroupId: ag.id, adGroupName: ag.name, title: h.text, subtitle: `${ag.name} · Headline ${i + 1}` });
      }
    });
    ag.descriptions.forEach((d, i) => {
      if (includes(d.text, q)) {
        push({ id: d.id, kind: 'Description', adGroupId: ag.id, adGroupName: ag.name, title: d.text, subtitle: `${ag.name} · Description ${i + 1}` });
      }
    });

    // Client comments (visible to both modes — they are the client's own words).
    if (agReview) {
      for (const asset of [...ag.headlines, ...ag.descriptions]) {
        const f = getAssetFeedback(agReview, asset.id);
        if (includes(f.comment, q)) {
          push({ id: `c-${asset.id}`, kind: 'Client comment', adGroupId: ag.id, adGroupName: ag.name, title: f.comment, subtitle: `${ag.name} · comment` });
        }
      }
      if (includes(agReview.generalComment, q)) {
        push({ id: `c-ag-${ag.id}`, kind: 'Client comment', adGroupId: ag.id, adGroupName: ag.name, title: agReview.generalComment, subtitle: `${ag.name} · ad group note` });
      }
      if (includes(agReview.keywordFeedback.generalComment, q)) {
        push({ id: `c-kw-${ag.id}`, kind: 'Client comment', adGroupId: ag.id, adGroupName: ag.name, title: agReview.keywordFeedback.generalComment, subtitle: `${ag.name} · keyword note` });
      }
    }

    // Internal notes — Editor Mode only.
    if (opts.includeInternal && internal) {
      if (includes(internal.adGroupNotes[ag.id], q)) {
        push({ id: `n-ag-${ag.id}`, kind: 'Internal note', adGroupId: ag.id, adGroupName: ag.name, title: internal.adGroupNotes[ag.id], subtitle: `${ag.name} · internal` });
      }
      for (const asset of [...ag.headlines, ...ag.descriptions]) {
        if (includes(internal.assetNotes[asset.id], q)) {
          push({ id: `n-${asset.id}`, kind: 'Internal note', adGroupId: ag.id, adGroupName: ag.name, title: internal.assetNotes[asset.id], subtitle: `${ag.name} · internal` });
        }
      }
    }
  }

  if (opts.includeInternal && internal && includes(internal.campaignNote, q)) {
    push({ id: 'n-campaign', kind: 'Internal note', title: internal.campaignNote ?? '', subtitle: 'Campaign · internal' });
  }
  if (review && includes(review.finalComment, q)) {
    push({ id: 'c-final', kind: 'Client comment', title: review.finalComment, subtitle: 'Campaign · final note' });
  }

  return results;
}
