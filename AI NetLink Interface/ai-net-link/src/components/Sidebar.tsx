/**
 * © 2026 NetLink. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, MessageSquare, Search, Settings, FolderClosed, Sun, Moon, Globe, Activity, ChevronRight, ChevronLeft, ChevronDown, Network, ShieldAlert, BarChart3, Briefcase, CreditCard, Package, Users, Map, PieChart, LayoutTemplate, TrendingUp, Truck, Calendar, Coins, ShieldCheck, LogOut, Server, Landmark } from 'lucide-react';
import { AppState, Currency, Permission, SettingsCategoryId, Tab } from '../types';
import { dict } from '../dict';
import { hasPermission as canAccess } from '../permissions';
import { getPathForTab } from '../navigation';

interface SidebarProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

interface NavItem {
  id: Tab;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  permission: Permission;
}

interface SettingsNavItem {
  id: SettingsCategoryId;
  label: string;
  permission?: Permission;
}

export default function Sidebar({ state, setState }: SidebarProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [hoveredTooltip, setHoveredTooltip] = useState<{label: string, top: number, right: number, left: number} | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    operations: false,
    customers: false,
    network: false,
    insights: false,
    system: false,
  });
  const handleMouseEnter = (e: React.MouseEvent, label: string) => {
    if (!state.sidebarOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({ label, top: rect.top + rect.height / 2, right: rect.left, left: rect.right });
    }
  };

  const handleMouseLeave = () => setHoveredTooltip(null);

  const allNavItems: NavItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.nav.dashboard, permission: 'view_dashboard' },
    { id: 'executive', icon: Briefcase, label: t.nav.executive, permission: 'access_executive' },
    { id: 'crm', icon: Users, label: t.nav.crm, permission: 'view_crm' },
    { id: 'investors', icon: TrendingUp, label: t.nav.investors, permission: 'view_investors' },
    { id: 'suppliers', icon: Truck, label: t.nav.suppliers, permission: 'view_suppliers' },
    { id: 'boi_expiry', icon: Calendar, label: t.nav.boi_expiry, permission: 'view_boi' },
    { id: 'billing', icon: CreditCard, label: t.nav.billing, permission: 'view_billing' },
    { id: 'topology', icon: Network, label: t.nav.topology, permission: 'view_topology' },
    { id: 'inventory', icon: Package, label: t.nav.inventory, permission: 'view_inventory' },
    { id: 'field', icon: Map, label: t.nav.field, permission: 'view_field_service' },
    { id: 'chat', icon: MessageSquare, label: t.nav.chat, permission: 'access_chat' },
    { id: 'security', icon: ShieldAlert, label: t.nav.security, permission: 'view_security' },
    { id: 'analytics', icon: BarChart3, label: t.nav.analytics, permission: 'view_reports' },
    { id: 'reports', icon: PieChart, label: t.nav.reports, permission: 'create_reports' },
    { id: 'portal', icon: LayoutTemplate, label: t.nav.portal, permission: 'manage_portal' },
    { id: 'management', icon: ShieldCheck, label: t.nav.management, permission: 'view_admins' },
    { id: 'network_radius', icon: Server, label: t.nav.network_radius, permission: 'view_admins' },
    { id: 'search', icon: Search, label: t.nav.search, permission: 'perform_search' },
    { id: 'financial', icon: Landmark, label: t.nav.financial, permission: 'view_admins' },
    { id: 'files', icon: FolderClosed, label: t.nav.files, permission: 'access_files' },
    { id: 'settings', icon: Settings, label: t.nav.settings, permission: 'edit_settings' },
  ];

  const hasPermission = (perm: Permission) => canAccess(state, perm);

  const navItems = allNavItems.filter(item => {
    // Investors portal is special for shareholders
    if (item.id === 'investors' && state.role === 'shareholder') return true;
    return hasPermission(item.permission);
  });

  const navGroups = useMemo(() => ([
    {
      id: 'operations',
      label: isRTL ? 'العمليات الذكية' : 'Smart Operations',
      items: ['dashboard', 'executive', 'chat', 'search'],
    },
    {
      id: 'customers',
      label: isRTL ? 'العملاء والإدارة' : 'Customers & Management',
      items: ['crm', 'management', 'financial', 'suppliers', 'investors', 'billing', 'boi_expiry'],
    },
    {
      id: 'network',
      label: isRTL ? 'الشبكة والبنية' : 'Network & Infrastructure',
      items: ['topology', 'network_radius', 'inventory', 'field'],
    },
    {
      id: 'insights',
      label: isRTL ? 'التحليلات والمنصات' : 'Insights & Platforms',
      items: ['analytics', 'reports', 'portal'],
    },
    {
      id: 'system',
      label: isRTL ? 'النظام والأدوات' : 'System & Tools',
      items: ['files', 'security'],
    },
    {
      id: 'settings',
      label: isRTL ? 'الإعدادات' : 'Settings',
      items: ['settings'],
    },
  ].map(group => ({
    ...group,
    items: group.items
      .map(itemId => navItems.find(item => item.id === itemId))
      .filter(Boolean),
  })).filter(group => group.items.length > 0)), [isRTL, navItems]);

  const settingsCategories = useMemo<SettingsNavItem[]>(() => {
    const categoryItems: SettingsNavItem[] = [
      { id: 'profile', label: t.settings.categories.profile },
      { id: 'gateways', label: isRTL ? 'إدارة البوابات' : 'Gateways', permission: 'manage_team' },
      { id: 'ai', label: t.settings.categories.ai, permission: 'manage_ai' },
      { id: 'billing', label: t.settings.categories.billing, permission: 'view_billing' },
      { id: 'investors', label: t.settings.categories.investors, permission: 'view_investors' },
      { id: 'backup', label: t.settings.categories.backup, permission: 'perform_backup' },
      { id: 'team', label: t.settings.categories.team, permission: 'manage_team' },
      { id: 'security', label: t.settings.categories.security, permission: 'view_security' },
      { id: 'about', label: t.settings.categories.about },
    ];

    return categoryItems.filter((category) => category.permission === undefined || hasPermission(category.permission));
  }, [hasPermission, isRTL, t.settings.categories]);

  useEffect(() => {
    if (state.activeTab === 'settings') {
      setExpandedGroups(prev => ({ ...prev, settings: true }));
    }
  }, [state.activeTab, state.activeSettingsCategory]);

  const toggleTheme = () => setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  const toggleLang = () => setState(prev => ({ ...prev, lang: prev.lang === 'en' ? 'ar' : 'en' }));
  const handleNavigateHome = () => setState(prev => ({ ...prev, activeTab: 'dashboard', activeSettingsCategory: 'profile' }));
  const handleLogout = () => {
    localStorage.removeItem('sas4_remembered_user');
    localStorage.removeItem('sas4_shared_session_user');
    sessionStorage.removeItem('sas4_session_user');
    setState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, impersonationSource: null, role: 'user', activeTab: 'dashboard', activeSettingsCategory: 'profile' }));
  };
  
  const cycleCurrency = () => {
    const currencies: Currency[] = ['ILS', 'USD', 'JOD'];
    const currentIndex = currencies.indexOf(state.currency);
    const nextIndex = (currentIndex + 1) % currencies.length;
    setState(prev => ({ ...prev, currency: currencies[nextIndex] }));
  };

  const shouldHandleInAppNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = state.activeTab === item.id;

    return (
      <a
        key={item.id}
        href={getPathForTab(item.id)}
        onClick={(event) => {
          if (!shouldHandleInAppNavigation(event)) return;
          event.preventDefault();
          setState(prev => ({ ...prev, activeTab: item.id }));
        }}
        onMouseEnter={(e) => handleMouseEnter(e, item.label)}
        onMouseLeave={handleMouseLeave}
        className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden cursor-pointer text-sm
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
      >
        {isActive && (
          <motion.div layoutId="activeNav" className="absolute inset-0 bg-blue-100/50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 rounded-xl z-0" />
        )}
        <Icon className={`w-6 h-6 shrink-0 z-10 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'group-hover:text-blue-500'}`} strokeWidth={isActive ? 2.5 : 2} />
        {state.sidebarOpen && (
          <div className="flex-1 flex items-center justify-between z-10 truncate">
            <span className="truncate text-sm leading-6">{item.label}</span>
            {item.id === 'management' && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold rounded-full">
                {state.role === 'sas4_manager' ? (isRTL ? 'حدلق' : 'Hadlaq') : (isRTL ? 'مدير' : 'Admin')}
              </span>
            )}
          </div>
        )}
      </a>
    );
  };

  const renderSettingsCategoryButton = (item: SettingsNavItem) => {
    const isActive = state.activeTab === 'settings' && state.activeSettingsCategory === item.id;

    return (
      <a
        key={item.id}
        href={getPathForTab('settings', item.id)}
        onClick={(event) => {
          if (!shouldHandleInAppNavigation(event)) return;
          event.preventDefault();
          setState(prev => ({ ...prev, activeTab: 'settings', activeSettingsCategory: item.id }));
        }}
        className={`w-full flex items-center rounded-xl px-3 py-3 text-sm transition-colors ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <span className="truncate">{item.label}</span>
      </a>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col glass-panel z-20 transition-all duration-300 ${state.sidebarOpen ? 'w-56' : 'w-20'} border-e border-slate-200/50 dark:border-slate-800/50 relative`}>
      <button 
        onClick={() => setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))}
        className={`absolute top-6 ${isRTL ? '-left-3' : '-right-3'} w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md z-30 hover:bg-blue-700 transition-colors cursor-pointer`}
      >
        {state.sidebarOpen ? (isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />) : (isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)}
      </button>

      <a
        href={getPathForTab('dashboard')}
        onClick={(event) => {
          if (!shouldHandleInAppNavigation(event)) return;
          event.preventDefault();
          handleNavigateHome();
        }}
        className="p-4 flex items-center gap-3 h-20 text-start transition-opacity hover:opacity-90"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <Activity className="text-white w-5 h-5" />
        </div>
        {state.sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-w-0">
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 whitespace-nowrap">
              {t.title}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-tight mt-0.5 break-words">
              {t.subtitle}
            </p>
          </motion.div>
        )}
      </a>

      <nav className="flex-1 px-2 py-4 space-y-3 overflow-y-auto custom-scrollbar">
        {state.sidebarOpen ? (
          navGroups.map((group) => {
            return (
              <div key={group.id} className="space-y-2">
                <button
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-bold">{group.label}</span>
                  <ChevronDown size={16} className={`transition-transform ${expandedGroups[group.id] ? 'rotate-180' : ''}`} />
                </button>

                {expandedGroups[group.id] && (
                  <div className="space-y-1.5">
                    {group.id === 'settings'
                      ? settingsCategories.map((item) => renderSettingsCategoryButton(item))
                      : group.items.map((item) => renderNavButton(item))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          navItems.map((item) => renderNavButton(item))
        )}
      </nav>

      <div className="p-3 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
        <div className={`flex items-center ${state.sidebarOpen ? 'justify-between' : 'justify-center flex-col gap-4'}`}>
          <button 
             onClick={toggleTheme} 
             onMouseEnter={(e) => handleMouseEnter(e, t.dashboard.themeToggle)}
             onMouseLeave={handleMouseLeave}
             className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer group"
          >
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
             onClick={toggleLang} 
             onMouseEnter={(e) => handleMouseEnter(e, state.lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية')}
             onMouseLeave={handleMouseLeave}
             className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-2 cursor-pointer group"
          >
            <Globe size={18} />
            {state.sidebarOpen && <span className="text-sm font-medium uppercase">{state.lang === 'en' ? 'AR' : 'EN'}</span>}
          </button>
          <button 
             onClick={cycleCurrency} 
             onMouseEnter={(e) => handleMouseEnter(e, t.currencies[state.currency])}
             onMouseLeave={handleMouseLeave}
             className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-2 cursor-pointer group"
          >
            <Coins size={18} />
            {state.sidebarOpen && <span className="text-sm font-medium uppercase">{t.currencies[state.currency]}</span>}
          </button>
        </div>
        
        {state.sidebarOpen && (
          <div className="space-y-3 px-3 py-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {state.currentUser?.name.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{state.currentUser?.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.roles[state.role]}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-auto p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                title={t.auth.logout}
              >
                <LogOut size={14} />
              </button>
            </div>
            {state.impersonationSource && (
              <button
                onClick={() => setState(prev => ({ ...prev, currentUser: prev.impersonationSource, impersonationSource: null, role: prev.impersonationSource?.role || 'super_admin', activeTab: 'dashboard' }))}
                className="w-full rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                {isRTL ? 'العودة إلى حساب السوبر أدمن' : 'Return to Super Admin'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 mt-auto border-t border-slate-200/50 dark:border-slate-800/50">
        {state.sidebarOpen ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold text-slate-400">© 2026 NetLink</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Developed by Muhammad Rateb Jabarin</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="text-[10px] font-bold text-slate-400">©</span>
          </div>
        )}
      </div>

      {/* Global Fixed Tooltip for Sidebar */}
      {!state.sidebarOpen && hoveredTooltip && (
        <div 
          className="fixed z-[9999] px-3 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: hoveredTooltip.top,
            left: isRTL ? undefined : hoveredTooltip.left + 16,
            right: isRTL ? window.innerWidth - hoveredTooltip.right + 16 : undefined,
            transform: 'translateY(-50%)'
          }}
        >
          {hoveredTooltip.label}
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? '-right-1 border-l-slate-800 dark:border-l-slate-100 border-y-transparent border-r-transparent' : '-left-1 border-r-slate-800 dark:border-r-slate-100 border-y-transparent border-l-transparent'} border-[5px]`} />
        </div>
      )}
    </aside>
  );
}
