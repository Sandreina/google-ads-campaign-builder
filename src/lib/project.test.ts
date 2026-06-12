import { describe, it, expect } from 'vitest';
import { createBlankProject, duplicateProject } from './project';
import { buildDemoCampaign } from '@/data/demo';
import { projectBundleSchema } from './schemas';

describe('createBlankProject', () => {
  it('creates a valid empty project with sensible defaults', () => {
    const bundle = createBlankProject({ clientName: 'Acme', campaignName: 'Q3 Search' });
    expect(bundle.campaign.clientName).toBe('Acme');
    expect(bundle.campaign.campaignName).toBe('Q3 Search');
    expect(bundle.campaign.adGroups).toEqual([]);
    expect(bundle.campaign.campaignType).toBe('Google Search');
    expect(bundle.campaign.locations).toEqual(['United States']);
    expect(bundle.review.campaignId).toBe(bundle.campaign.id);
    expect(bundle.internal.campaignId).toBe(bundle.campaign.id);
    expect(projectBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it('falls back to placeholder names when empty', () => {
    const bundle = createBlankProject({ clientName: '', campaignName: '' });
    expect(bundle.campaign.clientName).toBe('New Client');
    expect(bundle.campaign.campaignName).toBe('New Campaign');
  });
});

describe('duplicateProject', () => {
  it('clones the campaign with brand-new ids at every level', () => {
    const original = buildDemoCampaign();
    const { campaign: copy, review, internal } = duplicateProject(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.version).toBe(1);
    expect(copy.campaignName).toBe(`${original.campaignName} (copy)`);
    expect(copy.adGroups).toHaveLength(original.adGroups.length);

    original.adGroups.forEach((ag, i) => {
      const c = copy.adGroups[i];
      expect(c.id).not.toBe(ag.id);
      ag.headlines.forEach((h, j) => expect(c.headlines[j].id).not.toBe(h.id));
      ag.keywords.forEach((k, j) => expect(c.keywords[j].id).not.toBe(k.id));
      // content preserved
      expect(c.headlines.map((h) => h.text)).toEqual(ag.headlines.map((h) => h.text));
    });

    // fresh review/internal tied to the new id
    expect(review.campaignId).toBe(copy.id);
    expect(internal.campaignId).toBe(copy.id);
    expect(projectBundleSchema.safeParse({ campaign: copy, review, internal }).success).toBe(true);
  });
});
