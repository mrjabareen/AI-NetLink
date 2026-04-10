import { Role, SettingsCategoryId, Tab } from './types';

export const DEFAULT_SETTINGS_CATEGORY: SettingsCategoryId = 'profile';

const TAB_PATHS: Record<Exclude<Tab, 'settings'>, string> = {
  dashboard: '/',
  chat: '/operations-room',
  search: '/knowledge-search',
  files: '/files',
  topology: '/network-topology',
  security: '/security',
  analytics: '/analytics',
  executive: '/executive',
  billing: '/billing',
  inventory: '/inventory',
  crm: '/users',
  field: '/field-service',
  reports: '/reports',
  portal: '/portal',
  investors: '/investors',
  suppliers: '/suppliers',
  boi_expiry: '/subscription-control',
  management: '/operations',
  network_radius: '/network-radius',
  financial: '/financial-system',
};

const SETTINGS_PATHS: Record<SettingsCategoryId, string> = {
  profile: '/settings/profile',
  gateways: '/settings/gateways',
  ai: '/settings/ai',
  billing: '/settings/billing',
  investors: '/settings/investors',
  backup: '/settings/backup',
  team: '/settings/team',
  security: '/settings/security',
  about: '/settings/about',
};

const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
};

export const getPathForTab = (tab: Tab, settingsCategory: SettingsCategoryId = DEFAULT_SETTINGS_CATEGORY) => {
  if (tab === 'settings') {
    return SETTINGS_PATHS[settingsCategory] || SETTINGS_PATHS[DEFAULT_SETTINGS_CATEGORY];
  }

  return TAB_PATHS[tab];
};

export const resolveRouteFromPath = (pathname: string): { tab: Tab; settingsCategory: SettingsCategoryId } => {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/settings') {
    return { tab: 'settings', settingsCategory: DEFAULT_SETTINGS_CATEGORY };
  }

  const matchedSettingsCategory = (Object.entries(SETTINGS_PATHS) as Array<[SettingsCategoryId, string]>)
    .find(([, path]) => path === normalizedPath)?.[0];

  if (matchedSettingsCategory) {
    return { tab: 'settings', settingsCategory: matchedSettingsCategory };
  }

  const matchedTab = (Object.entries(TAB_PATHS) as Array<[Exclude<Tab, 'settings'>, string]>)
    .find(([, path]) => path === normalizedPath)?.[0];

  if (matchedTab) {
    return { tab: matchedTab, settingsCategory: DEFAULT_SETTINGS_CATEGORY };
  }

  return { tab: 'dashboard', settingsCategory: DEFAULT_SETTINGS_CATEGORY };
};

export const getDefaultTabForRole = (role: Role): Tab => (
  role === 'shareholder' ? 'investors' : 'dashboard'
);
