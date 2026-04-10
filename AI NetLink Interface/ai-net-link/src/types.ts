export type Lang = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Tab = 'dashboard' | 'chat' | 'search' | 'settings' | 'files' | 'topology' | 'security' | 'analytics' | 'executive' | 'billing' | 'inventory' | 'crm' | 'field' | 'reports' | 'portal' | 'investors' | 'suppliers' | 'boi_expiry' | 'management' | 'network_radius' | 'financial';
export type SettingsCategoryId = 'profile' | 'gateways' | 'ai' | 'billing' | 'investors' | 'backup' | 'team' | 'security' | 'about';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly';
export type BackupCompressionLevel = 'fast' | 'balanced' | 'maximum';
export type BackupExportFormat = 'json' | 'csv' | 'xlsx' | 'zip';
export type BackupDatasetId = 'subscribers' | 'investors' | 'suppliers' | 'managers' | 'directors' | 'deputies' | 'iptv' | 'profiles' | 'all_tables';
export type BackupProvider = 'local' | 'google_drive' | 'hybrid';
export type BackupJobStatus = 'idle' | 'running' | 'success' | 'failed';
export type BackupRestoreMode = 'full' | 'selective';
export type BackupEncryptionAlgorithm = 'aes-256-gcm';
/**
 * © 2026 SAS NET. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
export type Role = 
  | 'super_admin' 
  | 'admin'
  | 'sas4_manager'
  | 'system_manager' 
  | 'manager' 
  | 'agent' 
  | 'employee' 
  | 'representative' 
  | 'pos' 
  | 'technician' 
  | 'investor' 
  | 'supplier'
  | 'shareholder'
  | 'user';

export type Permission = 
  | 'all'
  | 'view_dashboard'
  | 'access_executive'
  | 'view_crm'
  | 'view_subscribers'
  | 'manage_subscribers'
  | 'view_investors'
  | 'manage_investors'
  | 'view_shareholders'
  | 'manage_shareholders'
  | 'view_directors'
  | 'manage_directors'
  | 'view_deputies'
  | 'manage_deputies'
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
  | 'manage_security'
  | 'view_audit_logs'
  | 'view_reports'
  | 'create_reports'
  | 'manage_widgets'
  | 'manage_portal'
  | 'manage_security_groups'
  | 'manage_team'
  | 'manage_ai'
  | 'perform_backup'
  | 'perform_search'
  | 'access_files'
  | 'edit_settings'
  | 'manage_topology'
  | 'manage_billing'
  | 'manage_inventory'
  | 'manage_crm'
  | 'manage_field_service'
  | 'manage_boi'
  | 'wallet_deposit'
  | 'wallet_withdraw'
  | 'manage_tx_limits'
  | 'view_central_balance'
  | 'sub_activate'
  | 'sub_add'
  | 'sub_edit'
  | 'sub_edit_package'
  | 'sub_delete'
  | 'iptv_manage'
  | 'view_financial';

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  memberCount: number;
  createdAt: string;
}

export type Currency = 'ILS' | 'USD' | 'JOD';

export interface RouterRecord {
  id: string;
  name?: string;
  host?: string;
  [key: string]: unknown;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
}

export interface ContactEntry {
  name: string;
  phone: string;
  email: string;
}

export interface BaseEntityRecord {
  id: string;
  name?: string;
  username?: string;
  status?: string;
  [key: string]: unknown;
}

export interface BaseSubscriberRecord extends BaseEntityRecord {
  phone?: string;
  email?: string;
  location?: string;
  plan?: string;
  expiry?: string;
}

export interface NetworkProfile {
  id?: string;
  name?: string;
  price?: number | string;
  billingCycleDay?: number | null;
  [key: string]: unknown;
}

export interface GatewayConfig {
  sms?: {
    url?: string;
    user_name?: string;
    user_pass?: string;
    sender?: string;
  };
  whatsapp?: {
    delay?: number;
  };
  email?: {
    host?: string;
    user?: string;
    port?: number;
    pass?: string;
    from?: string;
  };
}

export interface WhatsAppStatus {
  ready?: boolean;
  status?: string;
}

export interface SystemDashboardMetrics {
  timestamp: string;
  appUptimeSec: number;
  osUptimeSec: number;
  nodeVersion: string;
  platform: string;
  database: {
    exists: boolean;
    path: string;
  };
  storage: {
    path: string;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
}

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

export interface BackupGoogleDriveSettings {
  enabled: boolean;
  folderId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
  autoUpload: boolean;
  lastSyncAt: string | null;
  connectionStatus: 'idle' | 'connected' | 'error';
  connectionMessage?: string;
}

export interface BackupEncryptionSettings {
  enabled: boolean;
  algorithm: BackupEncryptionAlgorithm;
  password: string;
  passwordHint: string;
  applyToExports: boolean;
  requirePasswordOnRestore: boolean;
  kdfIterations: number;
}

export interface BackupSettings {
  enabled: boolean;
  automatic: boolean;
  frequency: BackupFrequency;
  scheduledTime: string;
  retentionCount: number;
  compressionLevel: BackupCompressionLevel;
  verifyAfterBackup: boolean;
  createRestorePointBeforeRestore: boolean;
  includeUploadsDirectory: boolean;
  lastBackup: string | null;
  lastRestore: string | null;
  encryption: BackupEncryptionSettings;
  googleDrive: BackupGoogleDriveSettings;
}

export interface BackupHistoryItem {
  id: string;
  action: 'backup' | 'export' | 'restore';
  status: Exclude<BackupJobStatus, 'idle'>;
  provider: BackupProvider;
  format: BackupExportFormat | 'backup_zip';
  dataset?: BackupDatasetId | 'full_system';
  createdAt: string;
  fileName: string;
  sizeBytes?: number;
  checksum?: string;
  message?: string;
  downloadUrl?: string;
  encrypted?: boolean;
  isProtected?: boolean;
}

export interface BackupDatasetDiffItem {
  id: BackupDatasetId;
  label: string;
  availableInArchive: boolean;
  currentRecords: number;
  archiveRecords: number;
  delta: number;
  currentPath?: string;
  archivePath?: string;
}

export interface BackupRestorePreview {
  previewToken: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  encrypted?: boolean;
  requiresPassword?: boolean;
  passwordHint?: string;
  encryptionAlgorithm?: BackupEncryptionAlgorithm;
  createdAt?: string | null;
  backupId?: string | null;
  scope?: string | null;
  datasetDiffs: BackupDatasetDiffItem[];
  archiveSummary: {
    fileCount: number;
    availableDatasets: BackupDatasetId[];
  };
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
  balance?: number;
  commissionRate?: number;
  maxTxLimit?: number;
  isLimitEnabled?: boolean;
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
  activeSettingsCategory: SettingsCategoryId;
  dashboardRefreshIntervalSec: number;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  role: Role;
  currentUser: User | null;
  impersonationSource: User | null;
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
    automatic: boolean;
    frequency: BackupFrequency;
    scheduledTime: string;
    retentionCount: number;
    compressionLevel: BackupCompressionLevel;
    verifyAfterBackup: boolean;
    createRestorePointBeforeRestore: boolean;
    includeUploadsDirectory: boolean;
    lastBackup: string | null;
    lastRestore: string | null;
    encryption: BackupEncryptionSettings;
    googleDrive: BackupGoogleDriveSettings;
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
