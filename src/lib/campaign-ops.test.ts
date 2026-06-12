import { describe, it, expect } from 'vitest';
import {
  createAsset,
  reorderAssets,
  moveAsset,
  duplicateAdGroup,
  createAdGroup,
  updateAdGroup,
  updateCampaignFields,
  addAdGroup,
  removeAdGroup,
  reorderAdGroups,
  reviseAssetText,
} from './campaign-ops';
import { EDITOR_PERMISSIONS, CLIENT_PERMISSIONS, PermissionError } from './permissions';
import type { CampaignProposal } from '@/types';

function makeCampaign(): CampaignProposal {
  const ag = createAdGroup('Group A');
  ag.headlines = [
    createAsset('headline', 'First', 0),
    createAsset('headline', 'Second', 1),
    createAsset('headline', 'Third', 2),
  ];
  return {
    id: 'c1',
    version: 1,
    clientName: 'Client',
    campaignName: 'Campaign',
    campaignType: 'Google Search',
    locations: [],
    languages: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    adGroups: [ag],
  };
}

describe('reorderAssets', () => {
  it('moves an asset and renumbers order contiguously', () => {
    const assets = [
      createAsset('headline', 'A', 0),
      createAsset('headline', 'B', 1),
      createAsset('headline', 'C', 2),
    ];
    const reordered = reorderAssets(assets, 0, 2); // A to end
    expect(reordered.map((a) => a.text)).toEqual(['B', 'C', 'A']);
    expect(reordered.map((a) => a.order)).toEqual([0, 1, 2]);
  });

  it('preserves stable ids after reordering', () => {
    const assets = [
      createAsset('headline', 'A', 0),
      createAsset('headline', 'B', 1),
    ];
    const idA = assets[0].id;
    const reordered = reorderAssets(assets, 0, 1);
    const movedA = reordered.find((a) => a.text === 'A');
    expect(movedA?.id).toBe(idA);
  });
});

describe('moveAsset', () => {
  it('moves up, down, top, and bottom', () => {
    const assets = [
      createAsset('headline', 'A', 0),
      createAsset('headline', 'B', 1),
      createAsset('headline', 'C', 2),
    ];
    const cId = assets[2].id;
    expect(moveAsset(assets, cId, 'top').map((a) => a.text)).toEqual(['C', 'A', 'B']);
    expect(moveAsset(assets, cId, 'up').map((a) => a.text)).toEqual(['A', 'C', 'B']);
    const aId = assets[0].id;
    expect(moveAsset(assets, aId, 'bottom').map((a) => a.text)).toEqual(['B', 'C', 'A']);
  });
});

describe('duplicateAdGroup', () => {
  it('creates new stable ids for all copied assets', () => {
    const ag = createAdGroup('Group');
    ag.headlines = [createAsset('headline', 'A', 0), createAsset('headline', 'B', 1)];
    ag.descriptions = [createAsset('description', 'D', 0)];
    const copy = duplicateAdGroup(ag);
    expect(copy.id).not.toBe(ag.id);
    expect(copy.headlines[0].id).not.toBe(ag.headlines[0].id);
    expect(copy.headlines[1].id).not.toBe(ag.headlines[1].id);
    expect(copy.descriptions[0].id).not.toBe(ag.descriptions[0].id);
    // text preserved
    expect(copy.headlines.map((h) => h.text)).toEqual(['A', 'B']);
  });
});

describe('permission checks on mutations', () => {
  it('allows editor to edit ad groups', () => {
    const campaign = makeCampaign();
    const agId = campaign.adGroups[0].id;
    const next = updateAdGroup(campaign, EDITOR_PERMISSIONS, 'canEditAdGroups', agId, (ag) => ({
      ...ag,
      name: 'Renamed',
    }));
    expect(next.adGroups[0].name).toBe('Renamed');
  });

  it('rejects client attempts to edit ad groups', () => {
    const campaign = makeCampaign();
    const agId = campaign.adGroups[0].id;
    expect(() =>
      updateAdGroup(campaign, CLIENT_PERMISSIONS, 'canEditAdGroups', agId, (ag) => ({
        ...ag,
        name: 'Hacked',
      })),
    ).toThrow(PermissionError);
  });

  it('rejects client attempts to edit campaign fields', () => {
    const campaign = makeCampaign();
    expect(() => updateCampaignFields(campaign, CLIENT_PERMISSIONS, { campaignName: 'X' })).toThrow(
      PermissionError,
    );
  });

  it('rejects client attempts to delete content', () => {
    const campaign = makeCampaign();
    expect(() => removeAdGroup(campaign, CLIENT_PERMISSIONS, campaign.adGroups[0].id)).toThrow(
      PermissionError,
    );
  });
});

describe('client mutation prevention (every campaign mutation path)', () => {
  it('blocks the client from every content-mutating operation', () => {
    const campaign = makeCampaign();
    const agId = campaign.adGroups[0].id;
    expect(() => updateCampaignFields(campaign, CLIENT_PERMISSIONS, { clientName: 'x' })).toThrow(PermissionError);
    expect(() => addAdGroup(campaign, CLIENT_PERMISSIONS, 'New')).toThrow(PermissionError);
    expect(() => removeAdGroup(campaign, CLIENT_PERMISSIONS, agId)).toThrow(PermissionError);
    expect(() => reorderAdGroups(campaign, CLIENT_PERMISSIONS, 0, 0)).toThrow(PermissionError);
    expect(() => updateAdGroup(campaign, CLIENT_PERMISSIONS, 'canEditKeywords', agId, (ag) => ag)).toThrow(PermissionError);
    expect(() => updateAdGroup(campaign, CLIENT_PERMISSIONS, 'canEditAssets', agId, (ag) => ag)).toThrow(PermissionError);
    expect(() => updateAdGroup(campaign, CLIENT_PERMISSIONS, 'canReorderAssets', agId, (ag) => ag)).toThrow(PermissionError);
    expect(() => updateAdGroup(campaign, CLIENT_PERMISSIONS, 'canEditUrls', agId, (ag) => ag)).toThrow(PermissionError);
  });

  it('allows the editor through every operation', () => {
    const campaign = makeCampaign();
    const agId = campaign.adGroups[0].id;
    expect(() => updateCampaignFields(campaign, EDITOR_PERMISSIONS, { clientName: 'x' })).not.toThrow();
    expect(() => addAdGroup(campaign, EDITOR_PERMISSIONS, 'New')).not.toThrow();
    expect(() => removeAdGroup(campaign, EDITOR_PERMISSIONS, agId)).not.toThrow();
    expect(() => updateAdGroup(campaign, EDITOR_PERMISSIONS, 'canEditAssets', agId, (ag) => ag)).not.toThrow();
  });
});

describe('reviseAssetText', () => {
  it('preserves the previous version and flags revision when previously reviewed', () => {
    const original = createAsset('headline', 'Original', 0);
    const revised = reviseAssetText(original, 'Updated', {
      wasReviewed: true,
      previousStatus: 'approved',
    });
    expect(revised.text).toBe('Updated');
    expect(revised.revisedAfterReview).toBe(true);
    expect(revised.revisionHistory).toHaveLength(1);
    expect(revised.revisionHistory?.[0].text).toBe('Original');
    expect(revised.revisionHistory?.[0].previousStatus).toBe('approved');
  });

  it('does not flag a revision when not previously reviewed', () => {
    const original = createAsset('headline', 'Original', 0);
    const revised = reviseAssetText(original, 'Updated', { wasReviewed: false });
    expect(revised.revisedAfterReview).toBeUndefined();
    expect(revised.revisionHistory).toBeUndefined();
  });

  it('returns the same asset when text is unchanged', () => {
    const original = createAsset('headline', 'Same', 0);
    expect(reviseAssetText(original, 'Same', { wasReviewed: true })).toBe(original);
  });
});
