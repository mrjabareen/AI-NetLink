/**
 * © 2026 SAS NET. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppState, Permission, SettingsCategoryId, Tab } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import ChatTab from './components/ChatTab';
import SearchTab from './components/SearchTab';
import SettingsTab from './components/SettingsTab';
import FilesTab from './components/FilesTab';
import TopologyTab from './components/TopologyTab';
import SecurityTab from './components/SecurityTab';
import AnalyticsTab from './components/AnalyticsTab';
import ExecutiveTab from './components/ExecutiveTab';
import BillingTab from './components/BillingTab';
import InventoryTab from './components/InventoryTab';
import CrmTab from './components/CrmTab';
import FieldServiceTab from './components/FieldServiceTab';
import ReportsTab from './components/ReportsTab';
import PortalDesignerTab from './components/PortalDesignerTab';
import InvestorsTab from './components/InvestorsTab';
import SuppliersTab from './components/SuppliersTab';
import BoiExpiryTab from './components/BoiExpiryTab';
import ManagementTab from './components/ManagementTab';
import NetworkRadiusTab from './components/NetworkRadiusTab';
import FinancialDashboard from './components/FinancialDashboard';
import Login from './components/Login';
import { fetchManagers } from './api';
import { getDefaultTabForRole, getPathForTab, resolveRouteFromPath } from './navigation';
import { hasPermission as canAccess } from './permissions';
import { AppToastPayload, toastInfo } from './utils/notify';
import { mergeTeamMembersWithStoredFinancialState, readStoredFinancialState, writeStoredFinancialState } from './utils/financialState';
import { computeCentralBalanceFromTeamMembers, MASTER_CAPITAL } from './utils/financeMath';

const DEFAULT_AI_SETTINGS = {
  primaryModel: 'gemini-3-flash-preview',
  autoRemediation: 2,
  providers: [
    { id: 'google', name: 'Google Gemini (Family)', enabled: true, apiKey: '••••••••••••••••', endpoint: '' },
    { id: 'openai', name: 'OpenAI GPT (Family)', enabled: false, apiKey: '', endpoint: '' },
    { id: 'anthropic', name: 'Anthropic Claude', enabled: false, apiKey: '', endpoint: '' },
    { id: 'grok', name: 'xAI Grok', enabled: false, apiKey: '', endpoint: '' },
    { id: 'openrouter', name: 'Open Router (All Models)', enabled: false, apiKey: '', endpoint: '' },
    { id: 'mistral', name: 'Mistral AI', enabled: false, apiKey: '', endpoint: '' },
    { id: 'local', name: 'Local AI (Ollama/LM Studio)', enabled: false, apiKey: '', endpoint: 'http://localhost:11434' },
  ]
};

const getInitialAiSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;

  try {
    const savedAiSettings = window.localStorage.getItem('sas4_ai_settings');
    if (!savedAiSettings) return DEFAULT_AI_SETTINGS;

    const parsed = JSON.parse(savedAiSettings);
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      providers: Array.isArray(parsed?.providers) ? parsed.providers : DEFAULT_AI_SETTINGS.providers,
    };
  } catch (error) {
    console.error('Failed to restore AI settings', error);
    return DEFAULT_AI_SETTINGS;
  }
};

const getInitialSettingsCategory = (): SettingsCategoryId => {
  if (typeof window === 'undefined') return 'profile';

  const savedCategory = window.localStorage.getItem('sas4_active_settings_category');
  const allowedCategories: SettingsCategoryId[] = ['profile', 'gateways', 'ai', 'billing', 'investors', 'backup', 'team', 'security', 'about'];

  return allowedCategories.includes(savedCategory as SettingsCategoryId)
    ? (savedCategory as SettingsCategoryId)
    : 'profile';
};

const getInitialActiveTab = (): Tab => {
  if (typeof window === 'undefined') return 'dashboard';

  const savedTab = window.localStorage.getItem('sas4_active_tab');
  const allowedTabs: Tab[] = ['dashboard', 'chat', 'search', 'settings', 'files', 'topology', 'security', 'analytics', 'executive', 'billing', 'inventory', 'crm', 'field', 'reports', 'portal', 'investors', 'suppliers', 'boi_expiry', 'management', 'network_radius', 'financial'];
  return allowedTabs.includes(savedTab as Tab) ? (savedTab as Tab) : 'dashboard';
};

const getInitialDashboardRefreshIntervalSec = () => {
  if (typeof window === 'undefined') return 60;

  const savedValue = Number(window.localStorage.getItem('sas4_dashboard_refresh_interval_sec'));
  return [5, 30, 60, 120, 300].includes(savedValue) ? savedValue : 60;
};

const REMEMBERED_USER_KEY = 'sas4_remembered_user';
const SESSION_USER_KEY = 'sas4_session_user';
const SHARED_SESSION_USER_KEY = 'sas4_shared_session_user';
const OPEN_TAB_COUNT_KEY = 'sas4_open_tab_count';
const SECURITY_GROUPS_KEY = 'sas4_security_groups';
const FINANCIAL_RESET_MARKER_KEY = 'sas4_financial_reset_apr_2026_v1';
const FINANCIAL_STATE_KEY = 'sas4_financial_state_v2';
const STORED_FINANCIAL_STATE = readStoredFinancialState();
const STORED_SECURITY_GROUPS = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SECURITY_GROUPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
})();

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const skipNextStateUrlSyncRef = useRef(false);
  const [toasts, setToasts] = useState<Array<AppToastPayload & { id: number }>>([]);
  const defaultTeamMembers = mergeTeamMembersWithStoredFinancialState([
      { 
        id: '0', 
        name: 'المدير العام (Super Admin)', 
        email: 'mrjabarin@gmail.com', 
        username: 'aljabareen', 
        role: 'super_admin', 
        groupId: 'grp_admin',
        permissions: ['view_dashboard', 'access_executive', 'view_central_balance', 'manage_security_groups', 'manage_admins'], 
        status: 'active', 
        joinDate: '2026-01-01', 
        balance: 0, 
        commissionRate: 0,
        maxTxLimit: 0,
        isLimitEnabled: false,
        debtLimit: 0,
        isDebtLimitEnabled: false
      },
      { 
        id: '5', 
        name: 'مدير فرع الشمال', 
        email: 'north_mgr@sasnet.ps', 
        username: 'north_agent', 
        role: 'manager', 
        groupId: 'grp_mgr',
        permissions: ['view_dashboard', 'view_admins', 'wallet_deposit'], 
        status: 'active', 
        joinDate: '2026-02-15', 
        balance: 0, 
        commissionRate: 10,
        maxTxLimit: 0,
        isLimitEnabled: false,
        debtLimit: 0,
        isDebtLimitEnabled: false
      },
    ], STORED_FINANCIAL_STATE);
  const initialCentralBalance = computeCentralBalanceFromTeamMembers(defaultTeamMembers);

  const [state, setState] = useState<AppState>({
    lang: 'ar',
    theme: 'dark',
    activeTab: getInitialActiveTab(),
    activeSettingsCategory: getInitialSettingsCategory(),
    dashboardRefreshIntervalSec: getInitialDashboardRefreshIntervalSec(),
    sidebarOpen: false,
    mobileMenuOpen: false,
    role: 'user',
    currentUser: null,
    impersonationSource: null,
    isAuthenticated: false,
    currency: 'ILS',
    centralBalance: initialCentralBalance,
    financialTransactions: STORED_FINANCIAL_STATE?.financialTransactions?.length ? STORED_FINANCIAL_STATE.financialTransactions : [],
    teamMembers: defaultTeamMembers,
    securityGroups: STORED_SECURITY_GROUPS ?? [
      { 
        id: 'grp_admin', 
        name: 'كبار المسؤولين (Administrator)', 
        description: 'صلاحيات كاملة لإدارة النظام والمالية', 
        permissions: ['view_dashboard', 'access_executive', 'view_central_balance', 'manage_admins', 'manage_security_groups', 'wallet_deposit', 'wallet_withdraw'], 
        memberCount: 1, 
        createdAt: '2026-01-01' 
      },
      { 
        id: 'grp_mgr', 
        name: 'مدراء الفروع (Managers)', 
        description: 'إدارة المشتركين والعمليات المالية المحدودة', 
        permissions: ['view_dashboard', 'view_admins', 'wallet_deposit'], 
        memberCount: 1, 
        createdAt: '2026-01-10' 
      },
      { 
        id: 'grp_tech', 
        name: 'الفنيون (Technicians)', 
        description: 'صلاحيات الدعم الفني والميداني فقط', 
        permissions: ['view_field_service', 'view_topology', 'access_chat'], 
        memberCount: 0, 
        createdAt: '2026-02-01' 
      }
    ],
    shareholders: [
      { 
        id: '1', 
        name: 'Ahmed Al-Rashed', 
        shares: 25000, 
        dividends: 12500, 
        ownership: '2.5%',
        investment: 350000,
        joinDate: '2025-01-15',
        transactions: [
          { id: 'tx-1-1', date: '2026-03-25', type: 'buy', shares: 5000, price: 14.20, amount: 71000, status: 'completed' },
          { id: 'tx-1-2', date: '2026-02-10', type: 'dividend', amount: 5000, status: 'completed' },
        ]
      },
      { 
        id: '2', 
        name: 'Sarah International Group', 
        shares: 150000, 
        dividends: 75000, 
        ownership: '15.0%',
        investment: 2100000,
        joinDate: '2024-11-20',
        transactions: [
          { id: 'tx-2-1', date: '2026-03-10', type: 'buy', shares: 50000, price: 13.50, amount: 675000, status: 'completed' },
        ]
      },
      { 
        id: '3', 
        name: 'Khalid Investment Fund', 
        shares: 85000, 
        dividends: 42500, 
        ownership: '8.5%',
        investment: 1100000,
        joinDate: '2025-03-05',
        transactions: []
      },
      { 
        id: '4', 
        name: 'Nora Al-Saud', 
        shares: 12000, 
        dividends: 6000, 
        ownership: '1.2%',
        investment: 160000,
        joinDate: '2025-06-12',
        transactions: []
      },
    ],
    investorSettings: {
      sharePrice: 15.12,
      buyPrice: 15.25,
      sellPrice: 15.05,
      totalShares: 10000000,
      eps: 1.42,
      dividendYield: 3.5,
      lastDividendDate: '2026-01-15',
      nextEarningsDate: '2026-04-20',
    },
    numberSettings: {
      decimalPlaces: 2,
    },
    backupSettings: {
      enabled: true,
      automatic: true,
      frequency: 'daily',
      scheduledTime: '02:00',
      retentionCount: 14,
      compressionLevel: 'balanced',
      verifyAfterBackup: true,
      createRestorePointBeforeRestore: true,
      includeUploadsDirectory: true,
      lastBackup: '2026-03-28 12:00:00',
      lastRestore: null,
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm',
        password: '',
        passwordHint: '',
        applyToExports: false,
        requirePasswordOnRestore: true,
        kdfIterations: 210000
      },
      googleDrive: {
        enabled: false,
        folderId: '',
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        redirectUri: 'https://developers.google.com/oauthplayground',
        autoUpload: false,
        lastSyncAt: null,
        connectionStatus: 'idle',
        connectionMessage: ''
      }
    },
    aiSettings: getInitialAiSettings(),
    versionInfo: {
      version: '4.0.0',
      buildDate: '2026-04-05',
      changelog: ['Initial rebranding', 'IP Protection added']
    },
    updateStatus: {
      hasUpdate: false,
      latestVersion: null,
      checking: false
    }
  });

  const isRTL = state.lang === 'ar';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(FINANCIAL_RESET_MARKER_KEY) === 'done') return;

    setState((prev) => {
      const zeroedTeamMembers = prev.teamMembers.map((member) => ({ ...member, balance: 0 }));
      return {
        ...prev,
        centralBalance: MASTER_CAPITAL,
        financialTransactions: [],
        teamMembers: zeroedTeamMembers,
        currentUser: prev.currentUser ? { ...prev.currentUser, balance: 0 } : null,
        impersonationSource: prev.impersonationSource ? { ...prev.impersonationSource, balance: 0 } : null,
      };
    });

    window.localStorage.removeItem(FINANCIAL_STATE_KEY);
    window.localStorage.setItem(FINANCIAL_RESET_MARKER_KEY, 'done');
  }, []);

  // Apply theme to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(state.theme);
    root.dir = isRTL ? 'rtl' : 'ltr';
  }, [state.theme, isRTL]);

  // Fetch true managers on app load globally
  useEffect(() => {
    const loadManagers = async () => {
      try {
        const dbUsers = await fetchManagers();
        if (dbUsers && dbUsers.length > 0) {
          const SUPER_ADMIN = { id: '0', name: 'المدير العام (Super Admin)', email: 'mr.aljabareen@gmail.com', username: 'aljabareen', role: 'super_admin', permissions: ['all'], status: 'active', joinDate: '2026-01-01' };
          setState(prev => ({ ...prev, teamMembers: mergeTeamMembersWithStoredFinancialState([SUPER_ADMIN, ...dbUsers], readStoredFinancialState()) }));
        }
      } catch (err) {
        console.error('Failed to load managers globally', err);
      }
    };
    loadManagers();
  }, []);

  // Check for remembered user
  useEffect(() => {
    const savedUser = sessionStorage.getItem(SESSION_USER_KEY)
      || localStorage.getItem(REMEMBERED_USER_KEY)
      || localStorage.getItem(SHARED_SESSION_USER_KEY);
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const routeState = resolveRouteFromPath(location.pathname);
        const shouldUseRoute = location.pathname !== '/';
        
        // Ensure permissions exist for backward compatibility with older sessions
        if (!user.permissions) {
          if (user.role === 'super_admin') user.permissions = ['all'];
          else if (user.role === 'admin') user.permissions = ['view_dashboard', 'view_subscribers', 'manage_subscribers', 'view_suppliers', 'manage_suppliers', 'view_admins', 'manage_admins', 'edit_settings', 'view_security', 'view_reports'];
          else if (user.role === 'sas4_manager') user.permissions = ['view_dashboard', 'view_subscribers', 'manage_subscribers', 'view_suppliers', 'manage_suppliers', 'view_inventory', 'view_crm', 'access_chat'];
          else if (user.role === 'shareholder') user.permissions = ['view_investors'];
          else user.permissions = ['view_dashboard'];
        }

        const savedTab = localStorage.getItem('sas4_active_tab');
        
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          currentUser: user,
          role: user.role,
          activeTab: shouldUseRoute
            ? routeState.tab
            : ((savedTab as Tab) || getDefaultTabForRole(user.role)),
          activeSettingsCategory: shouldUseRoute && routeState.tab === 'settings'
            ? routeState.settingsCategory
            : prev.activeSettingsCategory,
        }));
      } catch (e) {
        localStorage.removeItem(REMEMBERED_USER_KEY);
        localStorage.removeItem(SHARED_SESSION_USER_KEY);
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const syncFromSharedSession = () => {
      if (state.isAuthenticated) return;
      const sharedSession = localStorage.getItem(SHARED_SESSION_USER_KEY);
      if (!sharedSession) return;

      try {
        const user = JSON.parse(sharedSession);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          currentUser: user,
          impersonationSource: null,
          role: user.role || 'user',
        }));
        sessionStorage.setItem(SESSION_USER_KEY, sharedSession);
      } catch (_error) {
        localStorage.removeItem(SHARED_SESSION_USER_KEY);
      }
    };

    syncFromSharedSession();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SHARED_SESSION_USER_KEY) return;
      if (event.newValue) {
        syncFromSharedSession();
      } else {
        setState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, impersonationSource: null, role: 'user' }));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state.isAuthenticated]);

  useEffect(() => {
    const currentCount = Math.max(0, Number(localStorage.getItem(OPEN_TAB_COUNT_KEY) || '0'));
    localStorage.setItem(OPEN_TAB_COUNT_KEY, String(currentCount + 1));

    const handleBeforeUnload = () => {
      const latestCount = Math.max(0, Number(localStorage.getItem(OPEN_TAB_COUNT_KEY) || '1') - 1);
      localStorage.setItem(OPEN_TAB_COUNT_KEY, String(latestCount));
      if (latestCount === 0 && !localStorage.getItem(REMEMBERED_USER_KEY)) {
        localStorage.removeItem(SHARED_SESSION_USER_KEY);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    localStorage.setItem('sas4_ai_settings', JSON.stringify(state.aiSettings));
  }, [state.aiSettings]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<AppToastPayload>;
      const payload = customEvent.detail;
      if (!payload?.message) return;

      const toastId = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id: toastId, type: 'info', duration: 3500, ...payload }]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toastId));
      }, payload.duration || 3500);
    };

    window.addEventListener('app-toast', handleToast as EventListener);

    const pendingUpdateToast = sessionStorage.getItem('sas4_update_success_toast');
    if (pendingUpdateToast) {
      sessionStorage.removeItem('sas4_update_success_toast');
      try {
        const payload = JSON.parse(pendingUpdateToast) as AppToastPayload;
        handleToast(new CustomEvent('app-toast', { detail: payload }));
      } catch {
        // Ignore invalid session toast payload.
      }
    }

    return () => {
      window.removeEventListener('app-toast', handleToast as EventListener);
    };
  }, []);

  // Handle font family based on language
  const fontClass = isRTL ? 'font-[Cairo]' : 'font-[Inter]';

  // Persistence for activeTab (Update when changed)
  useEffect(() => {
    if (state.activeTab) {
      localStorage.setItem('sas4_active_tab', state.activeTab);
    }
  }, [state.activeTab]);

  useEffect(() => {
    localStorage.setItem('sas4_active_settings_category', state.activeSettingsCategory);
  }, [state.activeSettingsCategory]);

  useEffect(() => {
    localStorage.setItem('sas4_dashboard_refresh_interval_sec', String(state.dashboardRefreshIntervalSec));
  }, [state.dashboardRefreshIntervalSec]);

  useEffect(() => {
    localStorage.setItem(SECURITY_GROUPS_KEY, JSON.stringify(state.securityGroups));
  }, [state.securityGroups]);

  useEffect(() => {
    writeStoredFinancialState(state.centralBalance, state.financialTransactions, state.teamMembers);
  }, [state.centralBalance, state.financialTransactions, state.teamMembers]);

  useEffect(() => {
    const computedCentralBalance = computeCentralBalanceFromTeamMembers(state.teamMembers);
    if (Math.abs(computedCentralBalance - state.centralBalance) < 0.0001) return;
    setState(prev => ({ ...prev, centralBalance: computedCentralBalance }));
  }, [state.centralBalance, state.teamMembers]);

  useEffect(() => {
    if (!state.currentUser || state.role === 'super_admin') return;

    const currentUserId = String(state.currentUser?.id || '').trim();
    const currentUsername = String(state.currentUser?.username || '').trim();

    const matchedMember = state.teamMembers.find((member) => String(member.id) === currentUserId)
      || state.teamMembers.find((member) => (
        member.role !== 'super_admin' &&
        currentUsername &&
        String(member.username || '').trim() === currentUsername
      ));

    if (!matchedMember) return;

    const nextUser = {
      ...state.currentUser,
      name: matchedMember.name || state.currentUser.name,
      email: matchedMember.email || state.currentUser.email,
      username: matchedMember.username || state.currentUser.username,
      groupId: matchedMember.groupId || state.currentUser.groupId,
      status: (matchedMember.status || state.currentUser.status || 'active') as 'active' | 'inactive',
      permissions: matchedMember.groupId
        ? (state.securityGroups.find(group => group.id === matchedMember.groupId)?.permissions || matchedMember.permissions || state.currentUser.permissions)
        : (matchedMember.permissions || state.currentUser.permissions),
      balance: Number(matchedMember.balance || 0),
      commissionRate: Number(matchedMember.commissionRate || 0),
      maxTxLimit: Number(matchedMember.maxTxLimit || 0),
      isLimitEnabled: Boolean(matchedMember.isLimitEnabled),
      debtLimit: Number(matchedMember.debtLimit || 0),
      isDebtLimitEnabled: Boolean(matchedMember.isDebtLimitEnabled),
    };

    if (JSON.stringify(nextUser) === JSON.stringify(state.currentUser)) return;

    setState(prev => ({ ...prev, currentUser: nextUser }));
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(SHARED_SESSION_USER_KEY, JSON.stringify(nextUser));
    if (localStorage.getItem(REMEMBERED_USER_KEY)) {
      localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(nextUser));
    }
  }, [state.currentUser, state.role, state.securityGroups, state.teamMembers]);

  useEffect(() => {
    const routeState = resolveRouteFromPath(location.pathname);

    if (
      state.activeTab !== routeState.tab ||
      (routeState.tab === 'settings' && state.activeSettingsCategory !== routeState.settingsCategory)
    ) {
      skipNextStateUrlSyncRef.current = true;
    }

    setState((prev) => {
      const nextSettingsCategory = routeState.tab === 'settings'
        ? routeState.settingsCategory
        : prev.activeSettingsCategory;

      if (
        prev.activeTab === routeState.tab &&
        prev.activeSettingsCategory === nextSettingsCategory &&
        !prev.mobileMenuOpen
      ) {
        return prev;
      }

      return {
        ...prev,
        activeTab: routeState.tab,
        activeSettingsCategory: nextSettingsCategory,
        mobileMenuOpen: false,
      };
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    if (skipNextStateUrlSyncRef.current) {
      skipNextStateUrlSyncRef.current = false;
      return;
    }

    const nextPath = getPathForTab(state.activeTab, state.activeSettingsCategory);
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
  }, [location.pathname, navigate, state.activeSettingsCategory, state.activeTab, state.isAuthenticated]);

  // Check for updates
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        // Fetch local version info
        const localRes = await fetch('/version.json');
        const localData = await localRes.json();
        
        setState(prev => ({ ...prev, versionInfo: localData }));

        // In a real scenario, you'd fetch from a central server or GitHub API
        // For now, we simulate a check by fetching the same file or a mock remote
        // In the LXC environment, this would call our future /api/check-update
      } catch (err) {
        console.error('Failed to check for updates', err);
      }
    };
    checkUpdate();
  }, []);

  const hasPermission = (perm: Permission) => canAccess(state, perm);
  const canAccessManagementArea = () => (
    hasPermission('view_admins') ||
    hasPermission('view_suppliers') ||
    hasPermission('view_shareholders') ||
    hasPermission('view_iptv') ||
    hasPermission('manage_security_groups')
  );
  const canAccessTab = (tab: Tab) => {
    switch (tab) {
      case 'dashboard': return hasPermission('view_dashboard');
      case 'executive': return hasPermission('access_executive');
      case 'topology': return hasPermission('view_topology');
      case 'billing': return hasPermission('view_billing');
      case 'inventory': return hasPermission('view_inventory');
      case 'crm': return hasPermission('view_crm');
      case 'field': return hasPermission('view_field_service');
      case 'reports': return hasPermission('create_reports');
      case 'portal': return hasPermission('manage_portal');
      case 'investors': return state.role === 'shareholder' || hasPermission('view_investors');
      case 'suppliers': return hasPermission('view_suppliers');
      case 'boi_expiry': return hasPermission('view_boi');
      case 'management': return canAccessManagementArea();
      case 'network_radius': return hasPermission('view_admins');
      case 'financial': return hasPermission('view_financial');
      case 'chat': return hasPermission('access_chat');
      case 'security': return hasPermission('view_security');
      case 'analytics': return hasPermission('view_reports');
      case 'search': return hasPermission('perform_search');
      case 'settings': return hasPermission('edit_settings');
      case 'files': return hasPermission('access_files');
      default: return false;
    }
  };

  const getFirstAccessibleTab = (): Tab => {
    const preferredDefault = getDefaultTabForRole(state.role);
    if (canAccessTab(preferredDefault)) return preferredDefault;

    const orderedTabs: Tab[] = [
      'dashboard', 'management', 'financial', 'billing', 'crm', 'boi_expiry', 'investors',
      'suppliers', 'search', 'settings', 'files', 'chat', 'reports', 'analytics',
      'inventory', 'field', 'portal', 'topology', 'executive', 'security', 'network_radius'
    ];

    return orderedTabs.find((tab) => canAccessTab(tab)) || 'dashboard';
  };
  const visibleActiveTab = canAccessTab(state.activeTab) ? state.activeTab : getFirstAccessibleTab();
  const activeContentKey = visibleActiveTab === 'settings'
    ? `${visibleActiveTab}:${state.activeSettingsCategory}`
    : visibleActiveTab;

  let activeContent: React.ReactNode = null;
  switch (visibleActiveTab) {
    case 'dashboard':
      activeContent = hasPermission('view_dashboard') ? <DashboardTab state={state} setState={setState} /> : null;
      break;
    case 'executive':
      activeContent = hasPermission('access_executive') ? <ExecutiveTab state={state} /> : null;
      break;
    case 'topology':
      activeContent = hasPermission('view_topology') ? <TopologyTab state={state} /> : null;
      break;
    case 'billing':
      activeContent = hasPermission('view_billing') ? <BillingTab state={state} setState={setState} /> : null;
      break;
    case 'inventory':
      activeContent = hasPermission('view_inventory') ? <InventoryTab state={state} /> : null;
      break;
    case 'crm':
      activeContent = hasPermission('view_crm') ? <CrmTab state={state} /> : null;
      break;
    case 'field':
      activeContent = hasPermission('view_field_service') ? <FieldServiceTab state={state} /> : null;
      break;
    case 'reports':
      activeContent = hasPermission('create_reports') ? <ReportsTab state={state} /> : null;
      break;
    case 'portal':
      activeContent = hasPermission('manage_portal') ? <PortalDesignerTab state={state} /> : null;
      break;
    case 'investors':
      activeContent = (state.role === 'shareholder' || hasPermission('view_investors')) ? <InvestorsTab state={state} setState={setState} /> : null;
      break;
    case 'suppliers':
      activeContent = hasPermission('view_suppliers') ? <SuppliersTab state={state} /> : null;
      break;
    case 'boi_expiry':
      activeContent = hasPermission('view_boi') ? <BoiExpiryTab state={state} setState={setState} /> : null;
      break;
    case 'management':
      activeContent = canAccessManagementArea() ? <ManagementTab state={state} setState={setState} /> : null;
      break;
    case 'network_radius':
      activeContent = hasPermission('view_admins') ? <NetworkRadiusTab state={state} setState={setState} /> : null;
      break;
    case 'financial':
      activeContent = hasPermission('view_financial') ? <FinancialDashboard state={state} setState={setState} /> : null;
      break;
    case 'chat':
      activeContent = hasPermission('access_chat') ? <ChatTab state={state} /> : null;
      break;
    case 'security':
      activeContent = hasPermission('view_security') ? <SecurityTab state={state} /> : null;
      break;
    case 'analytics':
      activeContent = hasPermission('view_reports') ? <AnalyticsTab state={state} /> : null;
      break;
    case 'search':
      activeContent = hasPermission('perform_search') ? <SearchTab state={state} setState={setState} /> : null;
      break;
    case 'settings':
      activeContent = hasPermission('edit_settings') ? <SettingsTab state={state} setState={setState} /> : null;
      break;
    case 'files':
      activeContent = hasPermission('access_files') ? <FilesTab state={state} setState={setState} /> : null;
      break;
    default:
      activeContent = null;
  }

  useEffect(() => {
    if (!state.isAuthenticated) return;
    if (canAccessTab(state.activeTab)) return;

    if (state.currentUser?.status === 'inactive') {
      toastInfo(
        state.lang === 'ar'
          ? 'حسابك مجمد. يمكنك المشاهدة فقط، ولمتابعة أي إجراء يجب مراجعة مدراء النظام.'
          : 'Your account is frozen. You can view only. Please contact system administrators for any action.',
        state.lang === 'ar' ? 'الحساب مجمد' : 'Account Frozen'
      );
    }

    const fallbackTab = getFirstAccessibleTab();
    const fallbackPath = getPathForTab(fallbackTab, state.activeSettingsCategory);
    skipNextStateUrlSyncRef.current = true;
    setState(prev => ({ ...prev, activeTab: fallbackTab }));
    if (location.pathname !== fallbackPath) navigate(fallbackPath, { replace: true });
  }, [location.pathname, navigate, state.activeSettingsCategory, state.activeTab, state.isAuthenticated, state.role, state.securityGroups, state.currentUser]);

  if (!state.isAuthenticated) {
    return <Login state={state} setState={setState} />;
  }

  return (
    <div className={`flex min-h-screen w-full overflow-x-hidden ${fontClass} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
      
      <Sidebar state={state} setState={setState} />
      <Header state={state} setState={setState} />

      <div className={`fixed top-5 z-[100] flex flex-col gap-3 ${state.lang === 'ar' ? 'left-5' : 'right-5'}`}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className={`min-w-[300px] max-w-[380px] overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-400/30 bg-white/90 text-slate-900 dark:bg-emerald-500/10 dark:text-emerald-50'
                  : toast.type === 'error'
                    ? 'border-rose-400/30 bg-white/90 text-slate-900 dark:bg-rose-500/10 dark:text-rose-50'
                    : 'border-slate-300/60 bg-white/90 text-slate-900 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100'
              }`}
            >
              <div className="flex items-start gap-3 px-4 py-4">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : toast.type === 'error'
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-blue-500/15 text-blue-500'
                }`}>
                  {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  {toast.title ? <div className="mb-1 text-sm font-black">{toast.title}</div> : null}
                  <div className="text-sm leading-6 text-slate-600 dark:text-slate-200">{toast.message}</div>
                </div>
              </div>
              <div className={`h-1 w-full ${
                toast.type === 'success'
                  ? 'bg-emerald-500/70'
                  : toast.type === 'error'
                    ? 'bg-rose-500/70'
                    : 'bg-blue-500/70'
              }`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- Main Content Area --- */}
      <main className="flex-1 min-h-0 flex flex-col pt-16 md:pt-0 relative bg-slate-50/50 dark:bg-slate-950/50 overflow-x-hidden">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-500/5 dark:from-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto flex-1 relative z-10 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeContentKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {activeContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
