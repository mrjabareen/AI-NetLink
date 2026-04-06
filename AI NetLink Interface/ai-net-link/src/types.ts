export type Lang = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Tab = 'dashboard' | 'chat' | 'search' | 'settings' | 'files' | 'topology' | 'security' | 'analytics' | 'executive' | 'billing' | 'inventory' | 'crm' | 'field' | 'reports' | 'portal' | 'investors' | 'suppliers' | 'boi_expiry' | 'management' | 'network_radius';
/**
 * © 2026 NetLink. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
export type Role = 'super_admin' | 'admin' | 'sas4_manager' | 'shareholder' | 'user';
export type Currency = 'ILS' | 'USD' | 'JOD';

export interface VersionInfo {
  version: string;
  buildDate: string;
  changelog: string[];
}

export interface UpdateStatus {
  hasUpdate: boolean;
  latestVersion: string | null;
  latestBuildDate?: string | null;
  latestChangelog?: string[];
  checking: boolean;
  error?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: Role;
  avatar?: string;
  shareholderId?: string; // Link to shareholder record if role is shareholder
  permissions: string[];
}

export interface ShareholderRecord {
  id: string;
  name: string;
  shares: number;
  ownership: string;
  investment: number;
  dividends: number;
  joinDate: string;
  email?: string;
  transactions: {
    id: string;
    date: string;
    type: 'buy' | 'sell' | 'dividend';
    amount: number;
    shares?: number;
    price?: number;
    status: 'completed' | 'pending';
  }[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  permissions: string[];
  status: 'active' | 'inactive';
  joinDate: string;
  lastLogin?: string;
}

export interface AppState {
  lang: Lang;
  theme: Theme;
  activeTab: Tab;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  role: Role;
  currentUser: User | null;
  isAuthenticated: boolean;
  currency: Currency;
  teamMembers: TeamMember[];
  shareholders: ShareholderRecord[];
  investorSettings: {
    sharePrice: number;
    buyPrice: number;
    sellPrice: number;
    totalShares: number;
    eps: number;
    dividendYield: number;
    lastDividendDate: string;
    nextEarningsDate: string;
  };
  numberSettings: {
    decimalPlaces: number;
  };
  backupSettings: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    lastBackup: string | null;
    automatic: boolean;
  };
  aiSettings: {
    primaryModel: string;
    autoRemediation: number;
    providers: {
      id: string;
      name: string;
      enabled: boolean;
      apiKey: string;
      endpoint?: string;
    }[];
  };
  versionInfo: VersionInfo;
  updateStatus: UpdateStatus;
}
