/**
 * © 2026 SAS NET. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState } from './types';
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
import { AppToastPayload } from './utils/notify';

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

export default function App() {
  const [toasts, setToasts] = useState<Array<AppToastPayload & { id: number }>>([]);
  const [state, setState] = useState<AppState>({
    lang: 'ar',
    theme: 'dark',
    activeTab: localStorage.getItem('sas4_active_tab') || 'dashboard',
    sidebarOpen: false,
    mobileMenuOpen: false,
    role: 'user',
    currentUser: null,
    isAuthenticated: false,
    currency: 'ILS',
    centralBalance: 50000,
    financialTransactions: [
      { id: 'TX-001', date: '2026-04-01 10:00', type: 'topup_agent', amount: 5000, fromId: 'aljabareen', fromName: 'Super Admin', toId: 'admin_1', toName: 'Branch Manager A', status: 'completed', note: 'Initial allocation' },
      { id: 'TX-002', date: '2026-04-02 14:30', type: 'topup_sub', amount: 100, fromId: 'admin_1', fromName: 'Branch Manager A', toId: 'sub_441', toName: 'User 441', status: 'completed', metadata: { agentCommission: 10 } },
    ],
    teamMembers: [
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
        balance: 50000, 
        commissionRate: 0,
        maxTxLimit: 0,
        isLimitEnabled: false
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
        balance: 2450, 
        commissionRate: 10,
        maxTxLimit: 1000,
        isLimitEnabled: true
      },
    ],
    securityGroups: [
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
      frequency: 'daily',
      lastBackup: '2026-03-28 12:00:00',
      automatic: true,
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
          setState(prev => ({ ...prev, teamMembers: [SUPER_ADMIN, ...dbUsers] }));
        }
      } catch (err) {
        console.error('Failed to load managers globally', err);
      }
    };
    loadManagers();
  }, []);

  // Check for remembered user
  useEffect(() => {
    const savedUser = localStorage.getItem('sas4_remembered_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        
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
          activeTab: savedTab || (user.role === 'shareholder' ? 'investors' : 'dashboard')
        }));
      } catch (e) {
        localStorage.removeItem('sas4_remembered_user');
      }
    }
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

  const userPermissions = state.currentUser?.permissions || [];
  const hasPermission = (perm: string) => state.role === 'super_admin' || userPermissions.includes('all') || userPermissions.includes(perm);

  if (!state.isAuthenticated) {
    return <Login state={state} setState={setState} />;
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden ${fontClass} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
      
      <Sidebar state={state} setState={setState} />
      <Header state={state} setState={setState} />

      <div className={`fixed top-5 z-[100] flex flex-col gap-3 ${state.lang === 'ar' ? 'left-5' : 'right-5'}`}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[280px] max-w-[360px] rounded-2xl border shadow-2xl backdrop-blur-xl px-4 py-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
                  : toast.type === 'error'
                    ? 'bg-rose-500/10 border-rose-400/30 text-rose-100'
                    : 'bg-slate-900/90 border-slate-700 text-slate-100'
              }`}
            >
              {toast.title && <div className="text-sm font-bold mb-1">{toast.title}</div>}
              <div className="text-sm leading-6">{toast.message}</div>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- Main Content Area --- */}
      <main className="flex-1 h-full flex flex-col pt-16 md:pt-0 relative bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-500/5 dark:from-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto flex-1 relative z-10 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {state.activeTab === 'dashboard' && hasPermission('view_dashboard') && <DashboardTab state={state} setState={setState} />}
            {state.activeTab === 'executive' && hasPermission('access_executive') && <ExecutiveTab state={state} />}
            {state.activeTab === 'topology' && hasPermission('view_topology') && <TopologyTab state={state} />}
            {state.activeTab === 'billing' && hasPermission('view_billing') && <BillingTab state={state} />}
            {state.activeTab === 'inventory' && hasPermission('view_inventory') && <InventoryTab state={state} />}
            {state.activeTab === 'crm' && hasPermission('view_crm') && <CrmTab state={state} />}
            {state.activeTab === 'field' && hasPermission('view_field_service') && <FieldServiceTab state={state} />}
            {state.activeTab === 'reports' && hasPermission('create_reports') && <ReportsTab state={state} />}
            {state.activeTab === 'portal' && hasPermission('manage_portal') && <PortalDesignerTab state={state} />}
            {state.activeTab === 'investors' && (state.role === 'shareholder' || hasPermission('view_investors')) && <InvestorsTab state={state} setState={setState} />}
            {state.activeTab === 'suppliers' && hasPermission('view_suppliers') && <SuppliersTab state={state} />}
            {state.activeTab === 'boi_expiry' && hasPermission('view_boi') && <BoiExpiryTab state={state} />}
            {state.activeTab === 'management' && hasPermission('view_admins') && <ManagementTab state={state} setState={setState} />}
            {state.activeTab === 'network_radius' && hasPermission('view_admins') && <NetworkRadiusTab state={state} setState={setState} />}
            {state.activeTab === 'financial' && hasPermission('view_financial') && <FinancialDashboard state={state} setState={setState} />}
            {state.activeTab === 'chat' && hasPermission('access_chat') && <ChatTab state={state} />}
            {state.activeTab === 'security' && hasPermission('view_security') && <SecurityTab state={state} />}
            {state.activeTab === 'analytics' && hasPermission('view_reports') && <AnalyticsTab state={state} />}
            {state.activeTab === 'search' && hasPermission('perform_search') && <SearchTab state={state} />}
            {state.activeTab === 'settings' && hasPermission('edit_settings') && <SettingsTab state={state} setState={setState} />}
            {state.activeTab === 'files' && hasPermission('access_files') && <FilesTab state={state} setState={setState} />}
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
