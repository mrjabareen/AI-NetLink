import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, MessageSquare, Search, Settings, FolderClosed, Sun, Moon, Globe, Activity, Menu, X, Network, ShieldAlert, BarChart3, Briefcase, CreditCard, Package, Users, Map, PieChart, LayoutTemplate, TrendingUp, Truck, Calendar, Download, Server, Landmark, ShieldCheck, Bell } from 'lucide-react';
import { AppState, Permission, Tab } from '../types';
import { dict } from '../dict';
import { getPathForTab } from '../navigation';
import { hasPermission as canAccess } from '../permissions';

interface HeaderProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type NavItem = {
  id: Tab;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  label: string;
  permission: Permission;
};

export default function Header({ state, setState }: HeaderProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const shouldHandleInAppNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );

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
    { id: 'financial', icon: Landmark, label: t.nav.financial, permission: 'view_financial' },
    { id: 'files', icon: FolderClosed, label: t.nav.files, permission: 'access_files' },
    { id: 'settings', icon: Settings, label: t.nav.settings, permission: 'edit_settings' },
  ];

  const hasPermission = (perm: Permission) => canAccess(state, perm);

  const canAccessManagementArea =
    hasPermission('view_admins') ||
    hasPermission('view_suppliers') ||
    hasPermission('view_shareholders') ||
    hasPermission('view_iptv') ||
    hasPermission('manage_security_groups');

  const navItems = allNavItems.filter(item => {
    if (item.id === 'investors' && state.role === 'shareholder') return true;
    if (item.id === 'management') return canAccessManagementArea;
    return hasPermission(item.permission);
  });

  const navGroups = useMemo(() => ([
    {
      id: 'operations',
      label: isRTL ? 'العمليات الذكية' : 'Smart Operations',
      items: ['dashboard', 'executive', 'chat', 'search'] as Tab[],
    },
    {
      id: 'customers',
      label: isRTL ? 'العملاء والإدارة' : 'Customers & Management',
      items: ['crm', 'management', 'financial', 'suppliers', 'investors', 'billing', 'boi_expiry'] as Tab[],
    },
    {
      id: 'network',
      label: isRTL ? 'الشبكة والبنية' : 'Network & Infrastructure',
      items: ['topology', 'network_radius', 'inventory', 'field'] as Tab[],
    },
    {
      id: 'insights',
      label: isRTL ? 'التحليلات والمنصات' : 'Insights & Platforms',
      items: ['analytics', 'reports', 'portal'] as Tab[],
    },
    {
      id: 'system',
      label: isRTL ? 'النظام والأدوات' : 'System & Tools',
      items: ['files', 'security'] as Tab[],
    },
    {
      id: 'settings',
      label: isRTL ? 'الإعدادات' : 'Settings',
      items: ['settings'] as Tab[],
    },
  ].map(group => ({
    ...group,
    items: group.items
      .map(id => navItems.find(item => item.id === id))
      .filter(Boolean) as NavItem[],
  })).filter(group => group.items.length > 0)), [isRTL, navItems]);

  const toggleTheme = () => setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  const toggleLang = () => setState(prev => ({ ...prev, lang: prev.lang === 'en' ? 'ar' : 'en' }));

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (state.role === 'user') return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications');
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
        setNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.read).length);
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [state.role, state.lang]);

  const openNotifications = async () => {
    if (state.role === 'user') return;
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
      if (unreadIds.length) {
        try {
          await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unreadIds }),
          });
          setNotifications((prev) => prev.map((n: any) => (unreadIds.includes(n.id) ? { ...n, read: true } : n)));
          setUnreadCount(0);
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <>
      {state.impersonationSource && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-amber-500 px-4 py-2 text-center text-xs font-black text-slate-950">
          <button onClick={() => setState(prev => ({ ...prev, currentUser: prev.impersonationSource, impersonationSource: null, role: prev.impersonationSource?.role || 'super_admin', activeTab: 'dashboard' }))}>
            {state.lang === 'ar' ? 'أنت داخل كحساب آخر. اضغط للعودة إلى السوبر أدمن.' : 'You are impersonating another account. Tap to return to Super Admin.'}
          </button>
        </div>
      )}
      <div className={`md:hidden fixed left-0 right-0 h-14 bg-white/95 dark:bg-slate-950/95 z-30 flex items-center justify-between px-3 border-b border-slate-200/50 dark:border-slate-800/50 ${state.impersonationSource ? 'top-8' : 'top-0'}`}>
        <a
          href={getPathForTab('dashboard')}
          onClick={(event) => {
            if (!shouldHandleInAppNavigation(event)) return;
            event.preventDefault();
            setState(prev => ({ ...prev, activeTab: 'dashboard', activeSettingsCategory: 'profile', mobileMenuOpen: false }));
          }}
          className="flex items-center gap-2 text-start"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Activity className="text-white w-3.5 h-3.5" />
          </div>
          <h1 className="text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
            {t.title}
          </h1>
        </a>
        <div className="flex items-center gap-1.5">
          {state.updateStatus.hasUpdate && (
            <button 
              onClick={() => setState(prev => ({ ...prev, activeTab: 'settings' }))}
              className="p-2 text-blue-600 dark:text-blue-400 animate-bounce cursor-pointer relative"
              title={t.settings.categories.about}
            >
              <Download size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
          )}
          {state.role !== 'user' && (
            <button
              onClick={openNotifications}
              className="relative p-2 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <button onClick={() => setState(prev => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }))} className="p-2 text-slate-600 dark:text-slate-300 cursor-pointer relative">
            {state.mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            {state.updateStatus.hasUpdate && !state.mobileMenuOpen && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-slate-950" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {state.mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`md:hidden fixed inset-0 z-20 bg-white/98 dark:bg-slate-950/95 flex flex-col p-3 ${state.impersonationSource ? 'top-24' : 'top-14'}`}
          >
            <nav className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
              {navGroups.map(group => (
                <div key={group.id} className="space-y-1.5">
                  <div className="px-1.5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {group.label}
                  </div>
                  {group.items.map(item => (
                    <a
                      key={item.id}
                      href={getPathForTab(item.id)}
                      onClick={(event) => {
                        if (!shouldHandleInAppNavigation(event)) return;
                        event.preventDefault();
                        setState(prev => ({ ...prev, activeTab: item.id, mobileMenuOpen: false }));
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-colors ${
                        state.activeTab === item.id
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              ))}
            </nav>
            <div className="flex justify-around p-3 border-t border-slate-200 dark:border-slate-800">
              <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer">
                {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button onClick={toggleLang} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer">{state.lang === 'en' ? 'AR' : 'EN'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {state.role !== 'user' && showNotifications && (
        <div className="hidden md:block fixed top-4 right-4 z-40 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </span>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {notifications.length === 0 && (
              <p className="text-slate-500 dark:text-slate-400">
                {isRTL ? 'لا توجد إشعارات حالياً.' : 'No notifications yet.'}
              </p>
            )}
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={`rounded-xl border px-3 py-2 ${
                  n.read
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60'
                    : 'border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-50 truncate">
                    {n.title || (isRTL ? 'إشعار' : 'Notification')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {(n.createdAt || '').toString().slice(0, 16)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
