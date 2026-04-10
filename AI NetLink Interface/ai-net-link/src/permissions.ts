import { AppState, Permission } from './types';

const IMPLIED_PERMISSIONS: Partial<Record<Permission, Permission[]>> = {
  view_suppliers: ['manage_suppliers'],
  view_investors: ['manage_investors', 'manage_shareholders', 'view_shareholders'],
  view_shareholders: ['manage_shareholders', 'manage_investors'],
  view_iptv: ['manage_iptv', 'iptv_manage'],
  view_financial: ['wallet_deposit', 'wallet_withdraw', 'manage_tx_limits', 'view_central_balance', 'manage_billing'],
  view_billing: ['manage_billing'],
  view_crm: ['manage_crm', 'manage_subscribers', 'sub_add', 'sub_edit', 'sub_edit_package', 'sub_delete', 'sub_activate'],
  view_admins: ['manage_admins', 'manage_security_groups', 'manage_team'],
  view_boi: ['manage_boi'],
  view_reports: ['create_reports'],
  view_security: ['manage_security', 'view_audit_logs'],
};

const READ_ONLY_WHEN_FROZEN = new Set<Permission>([
  'view_dashboard',
  'view_topology',
  'view_billing',
  'view_inventory',
  'view_crm',
  'view_field_service',
  'view_investors',
  'view_suppliers',
  'view_boi',
  'view_admins',
  'view_security',
  'view_reports',
  'view_financial',
  'view_central_balance',
  'view_subscribers',
]);

const permissionListHas = (permissions: Permission[], permission: Permission | 'all'): boolean => {
  if (permissions.includes('all')) return true;
  if (permission !== 'all' && permissions.includes(permission)) return true;
  if (permission === 'all') return false;
  return (IMPLIED_PERMISSIONS[permission] || []).some((candidate) => permissions.includes(candidate));
};

export const hasPermission = (state: Pick<AppState, 'role' | 'currentUser' | 'securityGroups'>, permission: Permission | 'all') => {
  if (state.role === 'super_admin') return true;
  if (state.currentUser?.status === 'inactive') {
    return permission !== 'all' && READ_ONLY_WHEN_FROZEN.has(permission);
  }

  if (state.currentUser?.groupId) {
    const group = state.securityGroups.find((item) => item.id === state.currentUser?.groupId);
    if (group) return permissionListHas(group.permissions, permission);
  }

  const directPermissions = state.currentUser?.permissions || [];
  return permissionListHas(directPermissions, permission);
};
