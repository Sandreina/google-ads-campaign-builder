import type { AppMode, AppPermissions } from '@/types';

/**
 * Single source of truth for what each mode can do. Mutation functions consult
 * these flags (see {@link assertPermission}) — access control is NOT enforced
 * by hidden buttons or CSS alone.
 */
export const EDITOR_PERMISSIONS: AppPermissions = {
  canEditCampaign: true,
  canEditAdGroups: true,
  canEditKeywords: true,
  canEditAssets: true,
  canEditUrls: true,
  canReorderAssets: true,
  canManageInternalNotes: true,
  canImportData: true,
  canDeleteContent: true,
  canApprove: false,
  canRequestChanges: false,
  canAddClientComments: false,
  canSubmitReview: false,
};

export const CLIENT_PERMISSIONS: AppPermissions = {
  canEditCampaign: false,
  canEditAdGroups: false,
  canEditKeywords: false,
  canEditAssets: false,
  canEditUrls: false,
  canReorderAssets: false,
  canManageInternalNotes: false,
  canImportData: false,
  canDeleteContent: false,
  canApprove: true,
  canRequestChanges: true,
  canAddClientComments: true,
  canSubmitReview: true,
};

export function permissionsFor(mode: AppMode): AppPermissions {
  return mode === 'editor' ? EDITOR_PERMISSIONS : CLIENT_PERMISSIONS;
}

export class PermissionError extends Error {
  constructor(public permission: keyof AppPermissions) {
    super(`Permission denied: "${permission}" is not allowed in the current mode.`);
    this.name = 'PermissionError';
  }
}

/**
 * Throws a {@link PermissionError} when the current permission set does not
 * grant `permission`. Campaign-editing functions call this before mutating.
 */
export function assertPermission(
  permissions: AppPermissions,
  permission: keyof AppPermissions,
): void {
  if (!permissions[permission]) {
    throw new PermissionError(permission);
  }
}

export function can(permissions: AppPermissions, permission: keyof AppPermissions): boolean {
  return permissions[permission];
}
