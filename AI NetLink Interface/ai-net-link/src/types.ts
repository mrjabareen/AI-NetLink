export type Lang = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Tab = 'dashboard' | 'chat' | 'search' | 'settings' | 'files' | 'topology' | 'security' | 'analytics' | 'executive' | 'billing' | 'inventory' | 'crm' | 'field' | 'reports' | 'portal' | 'investors' | 'suppliers' | 'boi_expiry' | 'management' | 'network_radius' | 'financial';
/**
 * © 2026 SAS NET. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
export type Role = 
  | 'super_admin' 
  | 'system_manager' 
  | 'manager' 
  | 'agent' 
  | 'employee' 
  | 'representative' 
  | 'pos' 
  | 'technician' 
  | 'investor' 
  | 'supplier'
  | 'user';

export type Permission = 
  | 'view_dashboard'
  | 'access_executive'
  | 'view_crm'
  | 'view_subscribers'
  | 'manage_subscribers'
  | 'view_investors'
  | 'manage_investors'
  | 'view_shareholders'
  | 'manage_shareholders'
  | 'view_suppliers'
  | 'manage_suppliers'
  | 'view_admins'
  | 'manage_admins'
  | 'view_iptv'
  | 'manage_iptv'
  | 'view_boi'
  | 'view_billing'
  | 'view_topology'
  | 'view_inventory'
  | 'view_field_service'
  | 'access_chat'
  | 'view_security'
  | 'view_reports'
  | 'create_reports'
  | 'manage_portal'
  | 'manage_security_groups'
  | 'perform_search'
  | 'access_files'
  | 'edit_settings'
  | 'wallet_deposit'
  | 'wallet_withdraw'
  | 'manage_tx_limits'
  | 'view_central_balance'
  | 'sub_activate'
  | 'sub_edit'
  | 'sub_delete'
  | 'iptv_manage';

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  memberCount: number;
  createdAt: string;
}

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
  permissions: Permission[];
  groupId?: string;
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

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'topup_agent' | 'topup_sub' | 'commission' | 'withdraw' | 'transfer';
  amount: number;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  status: 'completed' | 'pending' | 'failed';
  note?: string;
  metadata?: {
    packageId?: string;
    packageName?: string;
    agentCommission?: number;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  password?: string;
  role: Role;
  groupId: string;
  permissions: Permission[];
  status: 'active' | 'inactive';
  joinDate: string;
  lastLogin?: string;
  balance: number; // Current wallet balance
  commissionRate: number; // Default commission percentage (e.g. 5 for 5%)
  maxTxLimit: number;
  isLimitEnabled: boolean;
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
  centralBalance: number; // The master pool owned by Super Admin
  financialTransactions: FinancialTransaction[];
  teamMembers: TeamMember[];
  securityGroups: SecurityGroup[];
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
