import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Bot,
  Clock3,
  Database,
  HardDrive,
  LayoutDashboard,
  Network,
  RefreshCw,
  Router,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchSubscribers, fetchSuppliers, getMikrotikStatusBatch, getSystemDashboardMetrics, getWhatsappStatus } from '../api';
import { AppState, BaseSubscriberRecord, SystemDashboardMetrics, WhatsAppStatus } from '../types';
import { formatNumber } from '../utils/format';
import { formatCurrency } from '../utils/currency';

interface DashboardTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type DashboardView = 'overview' | 'subscribers' | 'investors' | 'operations';

type SupplierRecord = {
  id: string;
  name?: string;
  balance?: number | string;
  [key: string]: unknown;
};

type NetworkBatchStatus = {
  onlineUsers?: string[];
  failedRouters?: string[];
  resultsPerRouter?: Record<string, {
    name?: string;
    pppCount?: number;
    hotspotCount?: number;
    connectionError?: string;
  }>;
};

type NormalizedSubscriber = {
  id: string;
  name: string;
  username: string;
  plan: string;
  statusText: string;
  expiryText: string;
  expiryDate: Date | null;
  daysToExpiry: number | null;
  debt: number;
  isOnline: boolean;
  isActiveSubscription: boolean;
};

type DrilldownRow = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
};

type ActiveDrilldown = {
  view: DashboardView;
  title: string;
  subtitle: string;
  rows: DrilldownRow[];
};

const normalizeText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseFlexibleDate = (value: unknown): Date | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '/').replace(/-/g, '/');
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = normalized.split('/');
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (String(parts[0]).length === 4) {
      const date = new Date(a, b - 1, c);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const date = new Date(c, b - 1, a);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysUntil = (date: Date | null) => {
  if (!date) return null;
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
};

const formatBytes = (bytes: number, lang: 'ar' | 'en') => {
  if (!bytes) return lang === 'ar' ? 'غير متاح' : 'N/A';
  const units = lang === 'ar' ? ['بايت', 'KB', 'MB', 'GB', 'TB'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unitIndex);
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number, isRTL: boolean) => {
  if (!seconds) return isRTL ? 'الآن' : 'Now';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return isRTL ? `${days} يوم و ${hours} ساعة` : `${days}d ${hours}h`;
  if (hours > 0) return isRTL ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m`;
  return isRTL ? `${minutes} دقيقة` : `${minutes}m`;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  onClick,
  clickableLabel,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  onClick?: () => void;
  clickableLabel?: string;
}) {
  const isInteractive = Boolean(onClick);
  return (
    <motion.button
      type="button"
      whileHover={isInteractive ? { y: -4, scale: 1.01 } : undefined}
      whileTap={isInteractive ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/85 p-5 text-start shadow-xl shadow-slate-950/5 backdrop-blur-xl transition-all dark:border-slate-800 dark:bg-[#09090B]/85 ${isInteractive ? 'hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-950/10 dark:hover:border-slate-700' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_38%)] opacity-70" />
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{value}</div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
          {isInteractive ? (
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-black text-slate-500 transition-all group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
              <ArrowRight size={14} className={isRTLText(title) ? 'rotate-180' : ''} />
              {clickableLabel || 'Open'}
            </div>
          ) : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.button>
  );
}

const isRTLText = (text: string) => /[\u0600-\u06FF]/.test(text);

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800 dark:bg-[#09090B]/85">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardTab({ state, setState }: DashboardTabProps) {
  const isRTL = state.lang === 'ar';
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [activeDrilldown, setActiveDrilldown] = useState<ActiveDrilldown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<BaseSubscriberRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkBatchStatus | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemDashboardMetrics | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);

  const labels = {
    title: isRTL ? 'الداشبورد الرئيسية' : 'Main Dashboard',
    subtitle: isRTL ? 'واجهة تنفيذية رئيسية شاملة، ومنها لوحات فرعية للمشتركين والمستثمرين والنظام والتشغيل، وكل القراءات فيها مبنية على بيانات حقيقية.' : 'A full executive dashboard with nested views for subscribers, investors, and system operations, all powered by real data.',
    overview: isRTL ? 'الرئيسية' : 'Overview',
    subscribers: isRTL ? 'المشتركون' : 'Subscribers',
    investors: isRTL ? 'المستثمرون' : 'Investors',
    operations: isRTL ? 'النظام والتشغيل' : 'Operations',
    refresh: isRTL ? 'تحديث البيانات' : 'Refresh Data',
  };

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);

      const [subsRes, suppliersRes, networkRes, systemRes, waRes] = await Promise.allSettled([
        fetchSubscribers(),
        fetchSuppliers(),
        getMikrotikStatusBatch(),
        getSystemDashboardMetrics(),
        getWhatsappStatus(),
      ]);

      if (!mounted) return;

      if (subsRes.status === 'fulfilled') setSubscribers((subsRes.value || []) as BaseSubscriberRecord[]);
      if (suppliersRes.status === 'fulfilled') setSuppliers((suppliersRes.value || []) as SupplierRecord[]);
      if (networkRes.status === 'fulfilled') setNetworkStatus((networkRes.value || {}) as NetworkBatchStatus);
      if (systemRes.status === 'fulfilled') setSystemMetrics(systemRes.value as SystemDashboardMetrics);
      if (waRes.status === 'fulfilled') setWaStatus((waRes.value || {}) as WhatsAppStatus);

      const failedCount = [subsRes, suppliersRes, networkRes, systemRes].filter(result => result.status === 'rejected').length;
      if (failedCount === 4) {
        setError(isRTL ? 'تعذر تحميل بيانات الداشبورد. تأكد من جاهزية الخادم ومصادر البيانات.' : 'Unable to load dashboard data. Verify the server and data sources.');
      }

      setLoading(false);
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isRTL]);

  const onlineUserSet = useMemo(
    () => new Set((networkStatus?.onlineUsers || []).map(user => normalizeText(user).toLowerCase())),
    [networkStatus]
  );

  const normalizedSubscribers = useMemo<NormalizedSubscriber[]>(() => (
    subscribers.map((item, index) => {
      const name = normalizeText(item.name) || `${normalizeText(item.firstname)} ${normalizeText(item.lastname)}`.trim() || `${isRTL ? 'مشترك' : 'Subscriber'} ${index + 1}`;
      const username = normalizeText(item.username || item['اسم الدخول'] || item['اسم المستخدم']);
      const plan = normalizeText(item.plan || item.profile || item.package || item['سرعة الخط'] || item['الباقة'], isRTL ? 'غير محدد' : 'Unassigned');
      const statusText = normalizeText(item.status || item['حالة الحساب'], isRTL ? 'غير محدد' : 'Unknown');
      const expiryText = normalizeText(item.expiry || item.expiration || item['تاريخ انتهاء الاشتراك'] || item['تاريخ ناهية الاشتراك'] || item['تاريخ النهاية'], isRTL ? 'غير متوفر' : 'N/A');
      const expiryDate = parseFlexibleDate(expiryText);
      const daysToExpiry = daysUntil(expiryDate);
      const debt = normalizeNumber(item.debt || item.balanceDue || item['عليه دين']);
      const statusLower = statusText.toLowerCase();
      const isInactive = ['inactive', 'expired', 'disabled', 'suspended', 'منتهي', 'موقوف', 'غير مفعل'].some(keyword => statusLower.includes(keyword));
      const isExpiredByDate = daysToExpiry !== null && daysToExpiry < 0;
      const isActiveSubscription = !isInactive && !isExpiredByDate;
      const isOnline = username ? onlineUserSet.has(username.toLowerCase()) : false;

      return {
        id: normalizeText(item.id, `sub-${index}`),
        name,
        username,
        plan,
        statusText,
        expiryText,
        expiryDate,
        daysToExpiry,
        debt,
        isOnline,
        isActiveSubscription,
      };
    })
  ), [subscribers, onlineUserSet, isRTL]);

  const payableDebt = useMemo(() => suppliers.reduce((sum, supplier) => sum + normalizeNumber(supplier['عليه دين']), 0), [suppliers]);
  const receivableDebt = useMemo(() => normalizedSubscribers.reduce((sum, sub) => sum + sub.debt, 0), [normalizedSubscribers]);
  const connectedCount = normalizedSubscribers.filter(sub => sub.isOnline).length;
  const totalSubscribers = normalizedSubscribers.length;
  const activeOfflineCount = normalizedSubscribers.filter(sub => sub.isActiveSubscription && !sub.isOnline).length;
  const expiredCount = normalizedSubscribers.filter(sub => sub.daysToExpiry !== null && sub.daysToExpiry < 0).length;
  const expiringTodayCount = normalizedSubscribers.filter(sub => sub.daysToExpiry === 0).length;
  const expiringSoonCount = normalizedSubscribers.filter(sub => sub.daysToExpiry !== null && sub.daysToExpiry > 0 && sub.daysToExpiry <= 3).length;
  const branchManagersCount = state.teamMembers.filter(member => ['manager', 'admin', 'sas4_manager', 'system_manager'].includes(member.role) && member.role !== 'super_admin').length;

  const allocatedShares = state.shareholders.reduce((sum, holder) => sum + holder.shares, 0);
  const totalInvestment = state.shareholders.reduce((sum, holder) => sum + holder.investment, 0);
  const totalDividends = state.shareholders.reduce((sum, holder) => sum + holder.dividends, 0);
  const marketCap = state.investorSettings.sharePrice * state.investorSettings.totalShares;
  const remainingShares = Math.max(0, state.investorSettings.totalShares - allocatedShares);

  const googleProvider = state.aiSettings.providers.find(provider => provider.id === 'google');
  const routerEntries = Object.entries((networkStatus?.resultsPerRouter || {}) as NonNullable<NetworkBatchStatus['resultsPerRouter']>) as Array<[string, NonNullable<NetworkBatchStatus['resultsPerRouter']>[string]]>;
  const healthyRouters = routerEntries.filter(([, router]) => !router.connectionError).length;
  const failedRouters = networkStatus?.failedRouters?.length || 0;
  const networkSummary = routerEntries.length === 0
    ? (isRTL ? 'لم يتم ضبط الراوترات بعد' : 'No routers configured yet')
    : failedRouters === 0
      ? (isRTL ? `الشبكة سليمة، ${healthyRouters} من ${routerEntries.length} راوتر متصل` : `Healthy network, ${healthyRouters} of ${routerEntries.length} routers online`)
      : failedRouters < routerEntries.length
        ? (isRTL ? `الشبكة بحاجة متابعة، ${failedRouters} راوتر متعثر` : `Degraded network, ${failedRouters} router(s) failing`)
        : (isRTL ? 'الشبكة متوقفة حاليًا' : 'Network appears offline');

  const subscriberStatusChart = [
    { name: isRTL ? 'متصلون' : 'Online', value: connectedCount },
    { name: isRTL ? 'فعالون دون اتصال' : 'Active Offline', value: activeOfflineCount },
    { name: isRTL ? 'ينتهون اليوم' : 'Expire Today', value: expiringTodayCount },
    { name: isRTL ? 'خلال 3 أيام' : 'Within 3 Days', value: expiringSoonCount },
    { name: isRTL ? 'منتهون' : 'Expired', value: expiredCount },
  ];

  const planDistribution = Object.entries(
    normalizedSubscribers.reduce<Record<string, number>>((acc, item) => {
      acc[item.plan] = (acc[item.plan] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value).slice(0, 6);

  const topInvestors = [...state.shareholders]
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 6)
    .map(item => ({ name: item.name, value: item.shares }));

  const expiringList = normalizedSubscribers
    .filter(sub => sub.daysToExpiry !== null && sub.daysToExpiry >= 0 && sub.daysToExpiry <= 7)
    .sort((a, b) => (a.daysToExpiry ?? 999) - (b.daysToExpiry ?? 999))
    .slice(0, 6);

  const branchManagers = state.teamMembers
    .filter(member => ['manager', 'admin', 'sas4_manager', 'system_manager'].includes(member.role) && member.role !== 'super_admin')
    .map(member => ({
      id: member.id,
      title: member.name,
      subtitle: member.username || member.email,
      meta: member.role,
      badge: member.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive'),
    }));

  const supplierDebtRows = suppliers
    .filter(supplier => normalizeNumber(supplier['عليه دين']) > 0)
    .sort((a, b) => normalizeNumber(b['عليه دين']) - normalizeNumber(a['عليه دين']))
    .map(supplier => ({
      id: normalizeText(supplier.id),
      title: normalizeText(supplier['اسم المورد'] || supplier.name, isRTL ? 'مورد' : 'Supplier'),
      subtitle: normalizeText(supplier['ملاحظات'], isRTL ? 'دين مستحق عليك' : 'Payable balance'),
      meta: formatCurrency(normalizeNumber(supplier['عليه دين']), state.currency, state.lang),
    }));

  const receivableRows = normalizedSubscribers
    .filter(sub => sub.debt > 0)
    .sort((a, b) => b.debt - a.debt)
    .map(sub => ({
      id: sub.id,
      title: sub.name,
      subtitle: sub.username || sub.plan,
      meta: formatCurrency(sub.debt, state.currency, state.lang),
      badge: sub.expiryText,
    }));

  const openDrilldown = (view: DashboardView, title: string, subtitle: string, rows: DrilldownRow[]) => {
    setActiveView(view);
    setActiveDrilldown({ view, title, subtitle, rows });
  };

  const overviewCards = [
    { title: isRTL ? 'إجمالي المشتركين' : 'Total Subscribers', value: formatNumber(totalSubscribers), subtitle: isRTL ? 'العدد الكلي للمشتركين بكافة حالاتهم' : 'Complete count of all subscribers', icon: Users, accent: 'bg-gradient-to-r from-blue-500 to-cyan-500', onClick: () => openDrilldown('subscribers', isRTL ? 'كل المشتركين' : 'All Subscribers', isRTL ? 'جميع المشتركين بكامل حالاتهم الحالية.' : 'All subscribers with their current statuses.', normalizedSubscribers.map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.plan, badge: sub.statusText }))) },
    { title: isRTL ? 'المتصلون الآن' : 'Connected Now', value: formatNumber(connectedCount), subtitle: isRTL ? 'المشتركون المتصلون بالإنترنت حاليًا' : 'Subscribers currently online', icon: Wifi, accent: 'bg-gradient-to-r from-emerald-500 to-teal-500', onClick: () => openDrilldown('subscribers', isRTL ? 'المتصلون حاليًا' : 'Currently Connected', isRTL ? 'هذه القائمة تعرض كل المشتركين المتصلين فعليًا الآن.' : 'Subscribers with active sessions right now.', normalizedSubscribers.filter(sub => sub.isOnline).map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.plan, badge: isRTL ? 'متصل' : 'Online' }))) },
    { title: isRTL ? 'فعالون دون اتصال' : 'Active Offline', value: formatNumber(activeOfflineCount), subtitle: isRTL ? 'اشتراك صالح لكن لا توجد جلسة فعالة الآن' : 'Valid subscription without an active session', icon: WifiOff, accent: 'bg-gradient-to-r from-violet-500 to-indigo-500', onClick: () => openDrilldown('subscribers', isRTL ? 'المشتركون الفعالون دون اتصال' : 'Active but Offline', isRTL ? 'اشتراكاتهم سارية لكنهم غير متصلين الآن.' : 'Subscribers with valid service but no current session.', normalizedSubscribers.filter(sub => sub.isActiveSubscription && !sub.isOnline).map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.expiryText, badge: isRTL ? 'غير متصل' : 'Offline' }))) },
    { title: isRTL ? 'منتهون' : 'Expired', value: formatNumber(expiredCount), subtitle: isRTL ? 'المشتركون الذين انتهى اشتراكهم' : 'Subscribers already expired', icon: Clock3, accent: 'bg-gradient-to-r from-rose-500 to-orange-500', onClick: () => openDrilldown('subscribers', isRTL ? 'الاشتراكات المنتهية' : 'Expired Subscriptions', isRTL ? 'المشتركون الذين انتهت مدة اشتراكهم.' : 'Subscribers whose subscriptions have ended.', normalizedSubscribers.filter(sub => sub.daysToExpiry !== null && sub.daysToExpiry < 0).map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.expiryText, badge: isRTL ? 'منتهي' : 'Expired' }))) },
    { title: isRTL ? 'ينتهون اليوم' : 'Expire Today', value: formatNumber(expiringTodayCount), subtitle: isRTL ? 'عدد من ينتهي اشتراكهم خلال اليوم' : 'Subscriptions expiring today', icon: Activity, accent: 'bg-gradient-to-r from-amber-500 to-orange-500', onClick: () => openDrilldown('subscribers', isRTL ? 'المنتهية اليوم' : 'Expiring Today', isRTL ? 'المشتركون الذين ينتهي اشتراكهم اليوم.' : 'Subscribers whose service expires today.', normalizedSubscribers.filter(sub => sub.daysToExpiry === 0).map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.expiryText, badge: isRTL ? 'اليوم' : 'Today' }))) },
    { title: isRTL ? 'خلال 3 أيام' : 'Within 3 Days', value: formatNumber(expiringSoonCount), subtitle: isRTL ? 'الاشتراكات التي ستنتهي خلال 3 أيام' : 'Subscriptions ending within 3 days', icon: Clock3, accent: 'bg-gradient-to-r from-fuchsia-500 to-pink-500', onClick: () => openDrilldown('subscribers', isRTL ? 'ينتهون خلال 3 أيام' : 'Ending Within 3 Days', isRTL ? 'المشتركون الذين تحتاج متابعتهم العاجلة قبل الانتهاء.' : 'Subscribers requiring urgent follow-up before expiry.', normalizedSubscribers.filter(sub => sub.daysToExpiry !== null && sub.daysToExpiry > 0 && sub.daysToExpiry <= 3).map(sub => ({ id: sub.id, title: sub.name, subtitle: sub.username || sub.plan, meta: sub.expiryText, badge: isRTL ? `${sub.daysToExpiry} يوم` : `${sub.daysToExpiry}d` }))) },
    { title: isRTL ? 'المدراء الفرعيون' : 'Branch Managers', value: formatNumber(branchManagersCount), subtitle: isRTL ? 'الكوادر الإدارية والتشغيلية الفعالة' : 'Active branch and operational managers', icon: ShieldCheck, accent: 'bg-gradient-to-r from-sky-500 to-blue-600', onClick: () => openDrilldown('overview', isRTL ? 'المدراء الفرعيون' : 'Branch Managers', isRTL ? 'كل الحسابات الإدارية والتشغيلية المرتبطة بالإدارة اليومية.' : 'Administrative and operational manager accounts.', branchManagers) },
    { title: isRTL ? 'ديون مستحقة عليك' : 'Payables', value: formatCurrency(payableDebt, state.currency, state.lang), subtitle: isRTL ? 'التزامات مالية تجاه الموردين' : 'Outstanding liabilities to suppliers', icon: Wallet, accent: 'bg-gradient-to-r from-red-500 to-rose-500', onClick: () => openDrilldown('overview', isRTL ? 'الديون المستحقة عليك' : 'Payables', isRTL ? 'الموردون والجهات التي لديك التزامات مالية تجاهها.' : 'Suppliers and entities you currently owe.', supplierDebtRows) },
    { title: isRTL ? 'مستحقات لك' : 'Receivables', value: formatCurrency(receivableDebt, state.currency, state.lang), subtitle: isRTL ? 'مبالغ مطلوبة من المشتركين والعملاء' : 'Outstanding customer receivables', icon: TrendingUp, accent: 'bg-gradient-to-r from-green-500 to-emerald-500', onClick: () => openDrilldown('subscribers', isRTL ? 'المبالغ المستحقة لك' : 'Receivables', isRTL ? 'المشتركون الذين لديهم مبالغ مستحقة لصالحك.' : 'Subscribers with outstanding receivables.', receivableRows) },
    { title: isRTL ? 'مدة تشغيل النظام' : 'System Uptime', value: formatDuration(systemMetrics?.appUptimeSec || 0, isRTL), subtitle: isRTL ? 'منذ آخر تشغيل فعلي للخادم' : 'Since the last server start', icon: Server, accent: 'bg-gradient-to-r from-slate-700 to-slate-900', onClick: () => { setActiveView('operations'); setActiveDrilldown(null); } },
    { title: isRTL ? 'حالة الشبكة' : 'Network Status', value: routerEntries.length ? `${healthyRouters}/${routerEntries.length}` : (isRTL ? 'غير متاح' : 'N/A'), subtitle: networkSummary, icon: Network, accent: 'bg-gradient-to-r from-cyan-500 to-blue-500', onClick: () => openDrilldown('operations', isRTL ? 'حالة الراوترات' : 'Router Health', isRTL ? 'عرض كل الراوترات وحالتها الحالية.' : 'Current router health and session summary.', routerEntries.map(([routerId, router]) => ({ id: routerId, title: router.name || routerId, subtitle: `PPPoE ${formatNumber(router.pppCount || 0)} • Hotspot ${formatNumber(router.hotspotCount || 0)}`, meta: router.connectionError || (isRTL ? 'سليم' : 'Healthy'), badge: router.connectionError ? (isRTL ? 'متعثر' : 'Failing') : (isRTL ? 'سليم' : 'Healthy') }))) },
    { title: isRTL ? 'Google Gemini' : 'Google Gemini', value: googleProvider?.enabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'غير مفعل' : 'Disabled'), subtitle: state.aiSettings.primaryModel, icon: Bot, accent: 'bg-gradient-to-r from-violet-500 to-purple-600', onClick: () => { setActiveView('operations'); setActiveDrilldown(null); } },
    { title: isRTL ? 'إصدار النظام' : 'System Version', value: state.versionInfo.version || 'N/A', subtitle: state.versionInfo.buildDate || (isRTL ? 'بدون تاريخ بناء' : 'No build date'), icon: Sparkles, accent: 'bg-gradient-to-r from-indigo-500 to-violet-500', onClick: () => { setActiveView('operations'); setActiveDrilldown(null); } },
    { title: isRTL ? 'وحدة التخزين' : 'Storage', value: `${systemMetrics?.storage.usedPercent ?? 0}%`, subtitle: isRTL ? `المستخدم ${formatBytes(systemMetrics?.storage.usedBytes || 0, state.lang)} من ${formatBytes(systemMetrics?.storage.totalBytes || 0, state.lang)}` : `${formatBytes(systemMetrics?.storage.usedBytes || 0, state.lang)} used of ${formatBytes(systemMetrics?.storage.totalBytes || 0, state.lang)}`, icon: HardDrive, accent: 'bg-gradient-to-r from-amber-500 to-yellow-500', onClick: () => { setActiveView('operations'); setActiveDrilldown(null); } },
    { title: isRTL ? 'ذاكرة النظام' : 'System Memory', value: `${systemMetrics?.memory.usedPercent ?? 0}%`, subtitle: isRTL ? `المستخدم ${formatBytes(systemMetrics?.memory.usedBytes || 0, state.lang)}` : `${formatBytes(systemMetrics?.memory.usedBytes || 0, state.lang)} used`, icon: Database, accent: 'bg-gradient-to-r from-teal-500 to-cyan-500', onClick: () => { setActiveView('operations'); setActiveDrilldown(null); } },
    { title: isRTL ? 'الرصيد المركزي' : 'Central Balance', value: formatCurrency(state.centralBalance, state.currency, state.lang), subtitle: isRTL ? 'الرصيد الرئيسي المستخدم لإدارة الحركة المالية' : 'Master balance used for financial distribution', icon: Wallet, accent: 'bg-gradient-to-r from-emerald-500 to-lime-500', onClick: () => { setActiveView('investors'); setActiveDrilldown(null); } },
  ];

  const navItems: Array<{ id: DashboardView; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'overview', label: labels.overview, icon: LayoutDashboard },
    { id: 'subscribers', label: labels.subscribers, icon: Users },
    { id: 'investors', label: labels.investors, icon: TrendingUp },
    { id: 'operations', label: labels.operations, icon: Server },
  ];

  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-2 space-y-6">
      <header className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950 p-6 text-white shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-white/80">
              <Sparkles size={14} />
              {labels.title}
            </div>
            <h2 className="text-3xl font-black">{state.currentUser?.name || (isRTL ? 'لوحة القيادة' : 'Control Center')}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-blue-100/80">{labels.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition-all hover:bg-white/15"
            >
              <RefreshCw size={16} />
              {labels.refresh}
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'management' }))}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition-all hover:bg-slate-100"
            >
              {isRTL ? 'الانتقال للإدارة' : 'Open Management'}
              <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setActiveDrilldown(prev => (prev?.view === item.id ? prev : null));
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-950/10 dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-[#09090B]/80 dark:text-slate-300 dark:hover:text-white'}`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[2rem] border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-[#09090B]/70" />
          ))}
        </div>
      ) : null}

      {!loading && activeView === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map(card => (
              <div key={card.title}>
                <MetricCard
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  accent={card.accent}
                  onClick={card.onClick}
                  clickableLabel={isRTL ? 'عرض التفاصيل' : 'View details'}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard title={isRTL ? 'توزيع حالات المشتركين' : 'Subscriber Status Distribution'} subtitle={isRTL ? 'قراءة حقيقية لحالة المشتركين الحالية والاتصال والانتهاء.' : 'Live distribution of subscriber lifecycle and connection states.'}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriberStatusChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f766e" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title={isRTL ? 'أقرب الاشتراكات للانتهاء' : 'Nearest Upcoming Expiries'} subtitle={isRTL ? 'أولوية المتابعة والتجديد خلال الأسبوع الحالي.' : 'Priority renewal queue for the current week.'}>
              <div className="space-y-3">
                {expiringList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    {isRTL ? 'لا توجد اشتراكات تنتهي قريبًا.' : 'No subscriptions are expiring soon.'}
                  </div>
                ) : expiringList.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{item.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.plan} • {item.expiryText}</div>
                    </div>
                    <div className="text-sm font-black text-amber-500">
                      {item.daysToExpiry === 0 ? (isRTL ? 'اليوم' : 'Today') : isRTL ? `بعد ${item.daysToExpiry} يوم` : `In ${item.daysToExpiry}d`}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {!loading && activeView === 'subscribers' ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={isRTL ? 'عدد المشتركين' : 'Subscriber Count'} value={formatNumber(totalSubscribers)} subtitle={isRTL ? 'العدد الكلي للمشتركين بكافة حالاتهم' : 'Full subscriber count across all states'} icon={Users} accent="bg-gradient-to-r from-blue-500 to-cyan-500" onClick={overviewCards[0].onClick} clickableLabel={isRTL ? 'عرض القائمة' : 'Open list'} />
            <MetricCard title={isRTL ? 'المتصلون حاليًا' : 'Connected Now'} value={formatNumber(connectedCount)} subtitle={isRTL ? 'المشتركون المتصلون الآن عبر الشبكة' : 'Subscribers currently online'} icon={Wifi} accent="bg-gradient-to-r from-emerald-500 to-teal-500" onClick={overviewCards[1].onClick} clickableLabel={isRTL ? 'عرض المتصلين' : 'Open connected'} />
            <MetricCard title={isRTL ? 'فعالون بدون اتصال' : 'Active but Offline'} value={formatNumber(activeOfflineCount)} subtitle={isRTL ? 'اشتراك صالح ولكن ليس هناك اتصال فعلي الآن' : 'Valid subscriptions with no active session'} icon={WifiOff} accent="bg-gradient-to-r from-violet-500 to-indigo-500" onClick={overviewCards[2].onClick} clickableLabel={isRTL ? 'عرض المشتركين' : 'Open subscribers'} />
            <MetricCard title={isRTL ? 'المدراء الفرعيون' : 'Branch Managers'} value={formatNumber(branchManagersCount)} subtitle={isRTL ? 'الكوادر المشرفة على التوزيع والتشغيل' : 'Managers supervising branches and operations'} icon={ShieldCheck} accent="bg-gradient-to-r from-sky-500 to-blue-600" onClick={overviewCards[6].onClick} clickableLabel={isRTL ? 'عرض المدراء' : 'Open managers'} />
            <MetricCard title={isRTL ? 'منتهية اشتراكاتهم' : 'Expired Subscribers'} value={formatNumber(expiredCount)} subtitle={isRTL ? 'كل من انتهى اشتراكه بالفعل' : 'Subscribers already expired'} icon={Clock3} accent="bg-gradient-to-r from-rose-500 to-orange-500" onClick={overviewCards[3].onClick} clickableLabel={isRTL ? 'عرض المنتهين' : 'Open expired'} />
            <MetricCard title={isRTL ? 'تنتهي خلال 3 أيام' : 'Ending Within 3 Days'} value={formatNumber(expiringSoonCount)} subtitle={isRTL ? 'اشتراكات ستنتهي خلال ثلاثة أيام' : 'Subscriptions ending in the next 3 days'} icon={Activity} accent="bg-gradient-to-r from-fuchsia-500 to-pink-500" onClick={overviewCards[5].onClick} clickableLabel={isRTL ? 'عرض القائمة' : 'Open list'} />
            <MetricCard title={isRTL ? 'تنتهي اليوم' : 'Ending Today'} value={formatNumber(expiringTodayCount)} subtitle={isRTL ? 'ينتهي اشتراكهم خلال اليوم الحالي' : 'Expiring during the current day'} icon={Clock3} accent="bg-gradient-to-r from-amber-500 to-orange-500" onClick={overviewCards[4].onClick} clickableLabel={isRTL ? 'عرض اليوم' : 'Open today'} />
            <MetricCard title={isRTL ? 'ديون المشتركين لك' : 'Subscriber Receivables'} value={formatCurrency(receivableDebt, state.currency, state.lang)} subtitle={isRTL ? 'إجمالي المبالغ المطلوبة من المشتركين' : 'Outstanding amounts owed by subscribers'} icon={Wallet} accent="bg-gradient-to-r from-green-500 to-emerald-500" onClick={overviewCards[8].onClick} clickableLabel={isRTL ? 'عرض المديونين' : 'Open receivables'} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard title={isRTL ? 'توزيع الباقات والخطط' : 'Plan Distribution'} subtitle={isRTL ? 'أكثر الخطط استخدامًا حاليًا بين المشتركين.' : 'Most used plans among subscribers right now.'}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title={isRTL ? 'قائمة انتهاء قريبة' : 'Upcoming Expiry Queue'} subtitle={isRTL ? 'قائمة جاهزة للاتصال أو التذكير أو التجديد.' : 'Ready-to-act list for reminders, calls, or renewals.'}>
              <div className="space-y-3">
                {expiringList.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    {isRTL ? 'لا توجد اشتراكات تنتهي قريبًا.' : 'No subscriptions are expiring soon.'}
                  </div>
                ) : expiringList.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{item.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.username || (isRTL ? 'بدون اسم دخول' : 'No username')}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-amber-500">{item.expiryText}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.plan}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {!loading && activeView === 'investors' ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={isRTL ? 'القيمة السوقية' : 'Market Cap'} value={formatCurrency(marketCap, state.currency, state.lang, 0)} subtitle={isRTL ? 'إجمالي القيمة السوقية للأسهم وفق السعر الحالي' : 'Full market capitalization at current share price'} icon={TrendingUp} accent="bg-gradient-to-r from-teal-500 to-emerald-500" onClick={() => openDrilldown('investors', isRTL ? 'القيمة السوقية' : 'Market Capitalization', isRTL ? 'ملخص مباشر لمكونات القيمة السوقية الحالية.' : 'Direct breakdown of the current market capitalization.', [{ id: 'market-cap', title: isRTL ? 'القيمة السوقية الإجمالية' : 'Total Market Cap', subtitle: isRTL ? 'سعر السهم × إجمالي عدد الأسهم' : 'Share price x total share count', meta: formatCurrency(marketCap, state.currency, state.lang, 0), badge: `${formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang)} × ${formatNumber(state.investorSettings.totalShares)}` }])} clickableLabel={isRTL ? 'عرض المكونات' : 'View breakdown'} />
            <MetricCard title={isRTL ? 'إجمالي المستثمرين' : 'Total Investors'} value={formatNumber(state.shareholders.length)} subtitle={isRTL ? 'عدد المساهمين والمستثمرين الحاليين' : 'Current shareholder and investor count'} icon={Users} accent="bg-gradient-to-r from-blue-500 to-violet-500" onClick={() => openDrilldown('investors', isRTL ? 'المستثمرون' : 'Investors', isRTL ? 'قائمة المساهمين والمستثمرين الحاليين.' : 'Current shareholder and investor list.', state.shareholders.map(holder => ({ id: holder.id, title: holder.name, subtitle: holder.ownership, meta: formatCurrency(holder.investment, state.currency, state.lang), badge: `${formatNumber(holder.shares)} ${isRTL ? 'سهم' : 'shares'}` })))} clickableLabel={isRTL ? 'عرض المستثمرين' : 'Open investors'} />
            <MetricCard title={isRTL ? 'رأس المال المستثمر' : 'Invested Capital'} value={formatCurrency(totalInvestment, state.currency, state.lang)} subtitle={isRTL ? 'إجمالي ما تم ضخه فعليًا في حصص المستثمرين' : 'Capital committed by current shareholders'} icon={Wallet} accent="bg-gradient-to-r from-amber-500 to-orange-500" onClick={() => openDrilldown('investors', isRTL ? 'رأس المال المستثمر' : 'Invested Capital', isRTL ? 'المستثمرون مرتبين حسب قيمة الاستثمار.' : 'Investors ranked by invested capital.', [...state.shareholders].sort((a, b) => b.investment - a.investment).map(holder => ({ id: holder.id, title: holder.name, subtitle: holder.ownership, meta: formatCurrency(holder.investment, state.currency, state.lang), badge: `${formatNumber(holder.shares)} ${isRTL ? 'سهم' : 'shares'}` })))} clickableLabel={isRTL ? 'عرض الاستثمارات' : 'View capital'} />
            <MetricCard title={isRTL ? 'الأرباح الموزعة' : 'Distributed Dividends'} value={formatCurrency(totalDividends, state.currency, state.lang)} subtitle={isRTL ? 'إجمالي الأرباح التي تم توزيعها حتى الآن' : 'Total dividends distributed to date'} icon={Sparkles} accent="bg-gradient-to-r from-fuchsia-500 to-pink-500" onClick={() => openDrilldown('investors', isRTL ? 'الأرباح الموزعة' : 'Distributed Dividends', isRTL ? 'الأرباح الموزعة لكل مساهم.' : 'Distributed dividends per shareholder.', [...state.shareholders].sort((a, b) => b.dividends - a.dividends).map(holder => ({ id: holder.id, title: holder.name, subtitle: holder.ownership, meta: formatCurrency(holder.dividends, state.currency, state.lang), badge: formatCurrency(holder.investment, state.currency, state.lang) })))} clickableLabel={isRTL ? 'عرض الأرباح' : 'View dividends'} />
            <MetricCard title={isRTL ? 'الأسهم الموزعة' : 'Allocated Shares'} value={formatNumber(allocatedShares)} subtitle={isRTL ? 'عدد الأسهم المملوكة حاليًا للمستثمرين' : 'Shares currently allocated to shareholders'} icon={TrendingUp} accent="bg-gradient-to-r from-emerald-500 to-teal-500" onClick={() => openDrilldown('investors', isRTL ? 'الأسهم الموزعة' : 'Allocated Shares', isRTL ? 'توزيع الأسهم على المساهمين الحاليين.' : 'Share allocation across current shareholders.', [...state.shareholders].sort((a, b) => b.shares - a.shares).map(holder => ({ id: holder.id, title: holder.name, subtitle: holder.ownership, meta: `${formatNumber(holder.shares)} ${isRTL ? 'سهم' : 'shares'}`, badge: formatCurrency(holder.investment, state.currency, state.lang) })))} clickableLabel={isRTL ? 'عرض التوزيع' : 'View allocation'} />
            <MetricCard title={isRTL ? 'الأسهم المتبقية' : 'Remaining Shares'} value={formatNumber(remainingShares)} subtitle={isRTL ? 'المتبقي من إجمالي الأسهم القابلة للتوزيع' : 'Remaining shares available for distribution'} icon={Activity} accent="bg-gradient-to-r from-slate-700 to-slate-900" onClick={() => openDrilldown('investors', isRTL ? 'الأسهم المتبقية' : 'Remaining Shares', isRTL ? 'ملخص المتبقي من الأسهم مقابل الموزع منها.' : 'Remaining shares versus allocated shares.', [{ id: 'remaining', title: isRTL ? 'الأسهم المتبقية' : 'Remaining Shares', subtitle: isRTL ? 'غير موزعة حتى الآن' : 'Not yet allocated', meta: formatNumber(remainingShares), badge: `${formatNumber(allocatedShares)} ${isRTL ? 'موزعة' : 'allocated'}` }])} clickableLabel={isRTL ? 'عرض الملخص' : 'View summary'} />
            <MetricCard title={isRTL ? 'سعر السهم' : 'Share Price'} value={formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang)} subtitle={isRTL ? `شراء ${formatCurrency(state.investorSettings.buyPrice, state.currency, state.lang)} • بيع ${formatCurrency(state.investorSettings.sellPrice, state.currency, state.lang)}` : `Buy ${formatCurrency(state.investorSettings.buyPrice, state.currency, state.lang)} • Sell ${formatCurrency(state.investorSettings.sellPrice, state.currency, state.lang)}`} icon={TrendingUp} accent="bg-gradient-to-r from-cyan-500 to-blue-600" onClick={() => openDrilldown('investors', isRTL ? 'تفاصيل سعر السهم' : 'Share Price Details', isRTL ? 'سعر السهم الحالي مع أسعار الشراء والبيع.' : 'Current share price with buy and sell values.', [{ id: 'share-price', title: isRTL ? 'السعر الحالي' : 'Current Price', subtitle: isRTL ? 'أسعار الشراء والبيع الحالية' : 'Current buy and sell prices', meta: formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang), badge: `${isRTL ? 'شراء' : 'Buy'} ${formatCurrency(state.investorSettings.buyPrice, state.currency, state.lang)} • ${isRTL ? 'بيع' : 'Sell'} ${formatCurrency(state.investorSettings.sellPrice, state.currency, state.lang)}` }])} clickableLabel={isRTL ? 'عرض التفاصيل' : 'View details'} />
            <MetricCard title={isRTL ? 'عائد التوزيعات' : 'Dividend Yield'} value={`${state.investorSettings.dividendYield}%`} subtitle={isRTL ? 'العائد السنوي الحالي المعلن للمستثمرين' : 'Current declared annual yield'} icon={ShieldCheck} accent="bg-gradient-to-r from-violet-500 to-indigo-600" onClick={() => openDrilldown('investors', isRTL ? 'عائد التوزيعات' : 'Dividend Yield', isRTL ? 'العائد السنوي والإعدادات الاستثمارية المرتبطة.' : 'Dividend yield and associated investor settings.', [{ id: 'yield', title: isRTL ? 'العائد السنوي' : 'Annual Yield', subtitle: isRTL ? 'الإعداد الحالي في النظام' : 'Current configured yield', meta: `${state.investorSettings.dividendYield}%`, badge: formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang) }])} clickableLabel={isRTL ? 'عرض العائد' : 'View yield'} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard title={isRTL ? 'أكبر المستثمرين' : 'Top Investors'} subtitle={isRTL ? 'ترتيب أكبر المساهمين حسب عدد الأسهم الحالية.' : 'Top shareholders ranked by current holdings.'}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topInvestors}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7c3aed" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title={isRTL ? 'ملخص المساهمين' : 'Shareholder Summary'} subtitle={isRTL ? 'عرض مباشر لأهم المؤشرات لكل مستثمر.' : 'Snapshot of the most relevant metrics per investor.'}>
              <div className="space-y-3">
                {[...state.shareholders].sort((a, b) => b.shares - a.shares).slice(0, 6).map(holder => (
                  <div key={holder.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{holder.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{holder.ownership} • {formatNumber(holder.shares)} {isRTL ? 'سهم' : 'shares'}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-emerald-500">{formatCurrency(holder.investment, state.currency, state.lang)}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{isRTL ? `أرباح ${formatCurrency(holder.dividends, state.currency, state.lang)}` : `Dividends ${formatCurrency(holder.dividends, state.currency, state.lang)}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {!loading && activeView === 'operations' ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={isRTL ? 'حالة الشبكة' : 'Network Health'} value={routerEntries.length ? `${healthyRouters}/${routerEntries.length}` : '0/0'} subtitle={networkSummary} icon={Router} accent="bg-gradient-to-r from-cyan-500 to-blue-600" onClick={overviewCards[10].onClick} clickableLabel={isRTL ? 'عرض الراوترات' : 'Open routers'} />
            <MetricCard title={isRTL ? 'مدة تشغيل الخادم' : 'Server Uptime'} value={formatDuration(systemMetrics?.appUptimeSec || 0, isRTL)} subtitle={isRTL ? `النظام ${formatDuration(systemMetrics?.osUptimeSec || 0, isRTL)}` : `OS ${formatDuration(systemMetrics?.osUptimeSec || 0, isRTL)}`} icon={Server} accent="bg-gradient-to-r from-slate-700 to-slate-900" onClick={() => openDrilldown('operations', isRTL ? 'مدة التشغيل' : 'Uptime', isRTL ? 'تفاصيل مدة تشغيل التطبيق والنظام.' : 'Application and operating system uptime details.', [{ id: 'uptime', title: isRTL ? 'تشغيل التطبيق' : 'Application Uptime', subtitle: isRTL ? 'منذ آخر إعادة تشغيل للخادم' : 'Since the last server restart', meta: formatDuration(systemMetrics?.appUptimeSec || 0, isRTL), badge: `${isRTL ? 'النظام' : 'OS'} ${formatDuration(systemMetrics?.osUptimeSec || 0, isRTL)}` }])} clickableLabel={isRTL ? 'عرض التفاصيل' : 'View details'} />
            <MetricCard title={isRTL ? 'التخزين' : 'Storage Usage'} value={`${systemMetrics?.storage.usedPercent ?? 0}%`} subtitle={isRTL ? `${formatBytes(systemMetrics?.storage.freeBytes || 0, state.lang)} متبقي` : `${formatBytes(systemMetrics?.storage.freeBytes || 0, state.lang)} free`} icon={HardDrive} accent="bg-gradient-to-r from-amber-500 to-yellow-500" onClick={() => openDrilldown('operations', isRTL ? 'التخزين' : 'Storage', isRTL ? 'تفاصيل المساحة المستخدمة والمتاحة.' : 'Used and available storage details.', [{ id: 'storage', title: systemMetrics?.storage.path || (isRTL ? 'مسار التخزين' : 'Storage Path'), subtitle: isRTL ? 'المساحة الكلية والمستخدمة والمتبقية' : 'Total, used, and remaining storage', meta: `${systemMetrics?.storage.usedPercent ?? 0}%`, badge: `${formatBytes(systemMetrics?.storage.usedBytes || 0, state.lang)} / ${formatBytes(systemMetrics?.storage.totalBytes || 0, state.lang)}` }])} clickableLabel={isRTL ? 'عرض التخزين' : 'View storage'} />
            <MetricCard title={isRTL ? 'ذاكرة النظام' : 'Memory Usage'} value={`${systemMetrics?.memory.usedPercent ?? 0}%`} subtitle={isRTL ? `${formatBytes(systemMetrics?.memory.usedBytes || 0, state.lang)} مستخدم` : `${formatBytes(systemMetrics?.memory.usedBytes || 0, state.lang)} used`} icon={Database} accent="bg-gradient-to-r from-teal-500 to-cyan-500" onClick={() => openDrilldown('operations', isRTL ? 'ذاكرة النظام' : 'Memory Usage', isRTL ? 'تفاصيل الذاكرة المستخدمة والمتاحة.' : 'Used and available memory details.', [{ id: 'memory', title: isRTL ? 'استهلاك الذاكرة' : 'Memory Consumption', subtitle: isRTL ? 'الذاكرة الكلية والمستخدمة والمتبقية' : 'Total, used, and free memory', meta: `${systemMetrics?.memory.usedPercent ?? 0}%`, badge: `${formatBytes(systemMetrics?.memory.usedBytes || 0, state.lang)} / ${formatBytes(systemMetrics?.memory.totalBytes || 0, state.lang)}` }])} clickableLabel={isRTL ? 'عرض الذاكرة' : 'View memory'} />
            <MetricCard title={isRTL ? 'واتساب' : 'WhatsApp Engine'} value={waStatus?.ready ? (isRTL ? 'جاهز' : 'Ready') : (isRTL ? 'غير جاهز' : 'Not Ready')} subtitle={waStatus?.status || (isRTL ? 'بدون حالة' : 'No status')} icon={ShieldCheck} accent="bg-gradient-to-r from-emerald-500 to-green-600" onClick={() => openDrilldown('operations', isRTL ? 'حالة واتساب' : 'WhatsApp Engine', isRTL ? 'حالة محرك واتساب الحالي.' : 'Current WhatsApp engine status.', [{ id: 'wa', title: waStatus?.ready ? (isRTL ? 'المحرك جاهز' : 'Engine Ready') : (isRTL ? 'المحرك غير جاهز' : 'Engine Not Ready'), subtitle: waStatus?.status || (isRTL ? 'بدون حالة' : 'No status available'), meta: waStatus?.ready ? (isRTL ? 'متصل' : 'Connected') : (isRTL ? 'غير متصل' : 'Disconnected') }])} clickableLabel={isRTL ? 'عرض الحالة' : 'View status'} />
            <MetricCard title={isRTL ? 'Google Gemini' : 'Google Gemini'} value={googleProvider?.enabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'غير مفعل' : 'Disabled')} subtitle={googleProvider?.name || state.aiSettings.primaryModel} icon={Bot} accent="bg-gradient-to-r from-violet-500 to-purple-600" onClick={() => openDrilldown('operations', isRTL ? 'محرك الذكاء الاصطناعي' : 'AI Engine', isRTL ? 'إعدادات محرك Gemini الحالية.' : 'Current Gemini engine configuration.', [{ id: 'gemini', title: googleProvider?.name || 'Google Gemini', subtitle: state.aiSettings.primaryModel, meta: googleProvider?.enabled ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'غير مفعل' : 'Disabled'), badge: googleProvider?.id || 'google' }])} clickableLabel={isRTL ? 'عرض الإعداد' : 'View config'} />
            <MetricCard title={isRTL ? 'قاعدة البيانات' : 'Database'} value={systemMetrics?.database.exists ? (isRTL ? 'متصلة' : 'Connected') : (isRTL ? 'غير متاحة' : 'Unavailable')} subtitle={systemMetrics?.database.path || (isRTL ? 'المسار غير متوفر' : 'Path unavailable')} icon={Database} accent="bg-gradient-to-r from-blue-500 to-indigo-500" onClick={() => openDrilldown('operations', isRTL ? 'قاعدة البيانات' : 'Database', isRTL ? 'حالة قاعدة البيانات ومسارها الحالي.' : 'Database status and current path.', [{ id: 'db', title: systemMetrics?.database.exists ? (isRTL ? 'قاعدة البيانات متاحة' : 'Database Available') : (isRTL ? 'قاعدة البيانات غير متاحة' : 'Database Unavailable'), subtitle: systemMetrics?.database.path || (isRTL ? 'المسار غير متوفر' : 'Path unavailable'), meta: systemMetrics?.database.exists ? (isRTL ? 'تعمل' : 'Operational') : (isRTL ? 'متوقفة' : 'Unavailable') }])} clickableLabel={isRTL ? 'عرض القاعدة' : 'View database'} />
            <MetricCard title={isRTL ? 'إصدار النظام' : 'App Version'} value={state.versionInfo.version} subtitle={state.versionInfo.buildDate} icon={Sparkles} accent="bg-gradient-to-r from-fuchsia-500 to-pink-500" onClick={() => openDrilldown('operations', isRTL ? 'إصدار النظام' : 'Application Version', isRTL ? 'بيانات الإصدار الحالي للنظام.' : 'Current application version details.', [{ id: 'version', title: state.versionInfo.version, subtitle: state.versionInfo.buildDate, meta: systemMetrics?.nodeVersion || 'Node.js', badge: systemMetrics?.platform || '' }])} clickableLabel={isRTL ? 'عرض الإصدار' : 'View version'} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard title={isRTL ? 'صحة الراوترات' : 'Router Health'} subtitle={isRTL ? 'قراءة حية لكل راوتر وعدد الجلسات الفعالة عليه.' : 'Live view of every router and its active sessions.'}>
              <div className="space-y-3">
                {routerEntries.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    {isRTL ? 'لا توجد بيانات راوترات بعد.' : 'No router data yet.'}
                  </div>
                ) : routerEntries.map(([routerId, router]) => (
                  <div key={routerId} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{router.name || routerId}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                        PPPoE {formatNumber(router.pppCount || 0)} • Hotspot {formatNumber(router.hotspotCount || 0)}
                      </div>
                    </div>
                    <div className={`text-sm font-black ${router.connectionError ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {router.connectionError ? (isRTL ? 'متعثر' : 'Failing') : (isRTL ? 'سليم' : 'Healthy')}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={isRTL ? 'مؤشرات الذاكرة والتخزين' : 'Memory & Storage Snapshot'} subtitle={isRTL ? 'مؤشرات مباشرة على صحة الخادم والموارد المستخدمة.' : 'Direct operational indicators for host resource health.'}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: isRTL ? 'الذاكرة' : 'Memory', value: systemMetrics?.memory.usedPercent || 0 },
                    { name: isRTL ? 'التخزين' : 'Storage', value: systemMetrics?.storage.usedPercent || 0 },
                    { name: isRTL ? 'سلامة الراوترات' : 'Router Health', value: routerEntries.length ? (healthyRouters / routerEntries.length) * 100 : 0 },
                  ]}>
                    <defs>
                      <linearGradient id="dashboardHealthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} domain={[0, 100]} />
                    <Tooltip />
                    <Area dataKey="value" type="monotone" stroke="#2563eb" strokeWidth={3} fill="url(#dashboardHealthGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {!loading && activeDrilldown && activeDrilldown.view === activeView ? (
        <SectionCard
          title={activeDrilldown.title}
          subtitle={activeDrilldown.subtitle}
          action={(
            <button
              onClick={() => setActiveDrilldown(null)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition-all hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          )}
        >
          <div className="space-y-3">
            {activeDrilldown.rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                {isRTL ? 'لا توجد عناصر مطابقة لهذه البطاقة حاليًا.' : 'There are no matching items for this card right now.'}
              </div>
            ) : activeDrilldown.rows.map(row => (
              <div key={row.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{row.title}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{row.subtitle}</div>
                </div>
                <div className="text-left">
                  {row.meta ? <div className="text-sm font-black text-slate-900 dark:text-white">{row.meta}</div> : null}
                  {row.badge ? <div className="mt-1 text-xs font-bold text-indigo-500">{row.badge}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </motion.div>
  );
}
