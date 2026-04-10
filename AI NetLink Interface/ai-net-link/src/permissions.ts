import { AppState, Permission } from './types';

export const hasPermission = (state: Pick<AppState, 'role' | 'currentUser' | 'securityGroups'>, permission: Permission | 'all') => {
  if (state.role === 'super_admin') return true;

  if (state.currentUser?.groupId) {
    const group = state.securityGroups.find((item) => item.id === state.currentUser?.groupId);
    if (group) return group.permissions.includes('all') || group.permissions.includes(permission as Permission);
  }

  const directPermissions = state.currentUser?.permissions || [];
  return directPermissions.includes('all') || directPermissions.includes(permission);
};
