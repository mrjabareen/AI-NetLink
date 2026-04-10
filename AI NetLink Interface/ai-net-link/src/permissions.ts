import { AppState, Permission } from './types';

export const hasPermission = (state: Pick<AppState, 'role' | 'currentUser' | 'securityGroups'>, permission: Permission | 'all') => {
  if (state.role === 'super_admin') return true;

  const directPermissions = state.currentUser?.permissions || [];
  if (directPermissions.includes('all') || directPermissions.includes(permission)) {
    return true;
  }

  if (state.currentUser?.groupId) {
    const group = state.securityGroups.find((item) => item.id === state.currentUser?.groupId);
    if (group?.permissions.includes('all') || group?.permissions.includes(permission as Permission)) {
      return true;
    }
  }

  return false;
};
