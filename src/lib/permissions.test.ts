import { describe, it, expect } from 'vitest';
import {
  permissionsFor,
  assertPermission,
  can,
  PermissionError,
  EDITOR_PERMISSIONS,
  CLIENT_PERMISSIONS,
} from './permissions';

describe('permission sets', () => {
  it('editor can edit campaign content but cannot approve', () => {
    expect(EDITOR_PERMISSIONS.canEditCampaign).toBe(true);
    expect(EDITOR_PERMISSIONS.canEditAssets).toBe(true);
    expect(EDITOR_PERMISSIONS.canReorderAssets).toBe(true);
    expect(EDITOR_PERMISSIONS.canApprove).toBe(false);
    expect(EDITOR_PERMISSIONS.canSubmitReview).toBe(false);
  });

  it('client can approve/comment but cannot edit any campaign content', () => {
    expect(CLIENT_PERMISSIONS.canApprove).toBe(true);
    expect(CLIENT_PERMISSIONS.canAddClientComments).toBe(true);
    expect(CLIENT_PERMISSIONS.canSubmitReview).toBe(true);
    // The client cannot mutate any campaign content:
    expect(CLIENT_PERMISSIONS.canEditCampaign).toBe(false);
    expect(CLIENT_PERMISSIONS.canEditAdGroups).toBe(false);
    expect(CLIENT_PERMISSIONS.canEditKeywords).toBe(false);
    expect(CLIENT_PERMISSIONS.canEditAssets).toBe(false);
    expect(CLIENT_PERMISSIONS.canEditUrls).toBe(false);
    expect(CLIENT_PERMISSIONS.canReorderAssets).toBe(false);
    expect(CLIENT_PERMISSIONS.canDeleteContent).toBe(false);
    expect(CLIENT_PERMISSIONS.canImportData).toBe(false);
    expect(CLIENT_PERMISSIONS.canManageInternalNotes).toBe(false);
  });

  it('permissionsFor maps modes correctly', () => {
    expect(permissionsFor('editor')).toBe(EDITOR_PERMISSIONS);
    expect(permissionsFor('client')).toBe(CLIENT_PERMISSIONS);
  });
});

describe('assertPermission', () => {
  it('throws PermissionError when not allowed', () => {
    expect(() => assertPermission(CLIENT_PERMISSIONS, 'canEditAssets')).toThrow(PermissionError);
  });
  it('does not throw when allowed', () => {
    expect(() => assertPermission(EDITOR_PERMISSIONS, 'canEditAssets')).not.toThrow();
  });
  it('PermissionError records the permission name', () => {
    try {
      assertPermission(CLIENT_PERMISSIONS, 'canDeleteContent');
    } catch (e) {
      expect(e).toBeInstanceOf(PermissionError);
      expect((e as PermissionError).permission).toBe('canDeleteContent');
    }
  });
});

describe('can', () => {
  it('returns the boolean flag', () => {
    expect(can(EDITOR_PERMISSIONS, 'canEditUrls')).toBe(true);
    expect(can(CLIENT_PERMISSIONS, 'canEditUrls')).toBe(false);
  });
});
