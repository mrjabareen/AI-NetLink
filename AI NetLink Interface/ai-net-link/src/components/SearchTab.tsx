import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, FileText, User, TrendingUp, Truck, ShieldCheck, ExternalLink, Database, Sparkles, ArrowRight, Wallet, Clock3 } from 'lucide-react';
import { AppState, BaseSubscriberRecord, ShareholderRecord } from '../types';
import { dict } from '../dict';
import { fetchInvestors, fetchManagersRaw, fetchSubscribers, fetchSuppliers } from '../api';
import { getSmartMatchScore, normalizeSearchText } from '../utils/search';

interface SearchTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type Category = 'all' | 'subscribers' | 'investors' | 'suppliers' | 'team';

interface SearchResult {
  id: string;
  name: string;
  type: Category;
  status: string;
  details: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  routeTab: 'crm' | 'investors' | 'suppliers' | 'management';
  scoreTerms: string[];
  exactTerms: string[];
  phoneTerms: string[];
  sourceData: Record<string, unknown>;
}

type SupplierRecord = {
  id?: string;
  name?: string;
  status?: string;
  note?: string;
  [key: string]: unknown;
};

type ManagerSearchRecord = {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  groupId?: string;
  status?: string;
  [key: string]: unknown;
};

const TEMP_INVESTORS: ShareholderRecord[] = [
  {
    id: 'temp-investor-1',
    name: 'شركة القدس الاستثمارية',
    shares: 45000,
    dividends: 12500,
    ownership: '4.5%',
    investment: 540000,
    joinDate: '2025-08-12',
    transactions: [],
  },
  {
    id: 'temp-investor-2',
    name: 'Mahmoud Capital Group',
    shares: 82000,
    dividends: 21000,
    ownership: '8.2%',
    investment: 975000,
    joinDate: '2024-12-03',
    transactions: [],
  },
  {
    id: 'temp-investor-3',
    name: 'صندوق الريادة الوطني',
    shares: 18000,
    dividends: 4200,
    ownership: '1.8%',
    investment: 225000,
    joinDate: '2026-01-20',
    transactions: [],
  },
];

const TEMP_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'temp-supplier-1',
    name: 'Ubiquiti Test Supplier',
    status: 'نشط',
    note: 'مورد تجريبي لفحص تبويب الموردين والبحث المعرفي',
  },
  {
    id: 'temp-supplier-2',
    name: 'شركة الألياف المتقدمة',
    status: 'نشط',
    note: 'توريد OLT و ONU ومستلزمات الشبكات',
  },
  {
    id: 'temp-supplier-3',
    name: 'Core Router Lab',
    status: 'معلّق',
    note: 'مزود تجريبي لمعدات الراوتر الأساسية',
  },
];

const TEMP_MANAGERS: ManagerSearchRecord[] = [
  {
    id: 'temp-manager-1',
    'الاسم الاول': 'أحمد',
    'الاسم الثاني': 'جبارين',
    'اسم الدخول': 'mgr_demo_01',
    email: 'mgr_demo_01@sasnet.local',
    'الصلاحية': 'Manager',
    status: 'نشط',
  },
  {
    id: 'temp-manager-2',
    'الاسم الاول': 'Lina',
    'الاسم الثاني': 'Operations',
    'اسم الدخول': 'ops_demo_02',
    email: 'ops_demo_02@sasnet.local',
    'الصلاحية': 'Admin',
    status: 'نشط',
  },
  {
    id: 'temp-manager-3',
    'الاسم الاول': 'يوسف',
    'الاسم الثاني': 'الدعم',
    'اسم الدخول': 'support_demo_03',
    email: 'support_demo_03@sasnet.local',
    'الصلاحية': 'Agent',
    status: 'غير نشط',
  },
];

const SEARCH_SETTINGS_TARGET_KEY = 'sas4_search_settings_target';

const normalizePhoneDigits = (value: string) => value.replace(/[^\d]/g, '');

const buildPhoneSearchTerms = (value: string) => {
  const digits = normalizePhoneDigits(value);
  if (!digits) return [];

  const variants = new Set<string>([digits]);

  if (digits.startsWith('00')) {
    variants.add(digits.slice(2));
  }

  const withoutIntlPrefix = digits.startsWith('00970')
    ? digits.slice(5)
    : digits.startsWith('970')
      ? digits.slice(3)
      : digits.startsWith('00972')
        ? digits.slice(5)
        : digits.startsWith('972')
          ? digits.slice(3)
          : '';

  if (withoutIntlPrefix) {
    variants.add(withoutIntlPrefix);
    if (!withoutIntlPrefix.startsWith('0')) {
      variants.add(`0${withoutIntlPrefix}`);
    }
  }

  if (digits.startsWith('0')) {
    variants.add(digits.slice(1));
  }

  return Array.from(variants).filter(Boolean);
};

const getMatchScore = (query: string, item: SearchResult) => {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const phoneQuery = normalizePhoneDigits(query);

  if (!normalizedQuery && !phoneQuery) {
    return { score: 1, exact: false };
  }

  for (const term of item.exactTerms) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) continue;
    if (normalizedTerm === normalizedQuery) {
      return { score: 5000, exact: true };
    }
    if (compactQuery && normalizedTerm.replace(/\s+/g, '') === compactQuery) {
      return { score: 4900, exact: true };
    }
  }

  if (phoneQuery) {
    for (const phoneTerm of item.phoneTerms) {
      if (phoneTerm === phoneQuery) return { score: 5000, exact: true };
      if (phoneTerm.endsWith(phoneQuery) || phoneQuery.endsWith(phoneTerm)) return { score: 4700, exact: true };
      if (phoneTerm.includes(phoneQuery)) return { score: 4300, exact: false };
    }
    return { score: 0, exact: false };
  }

  let bestScore = 0;
  for (const term of item.scoreTerms) {
    bestScore = Math.max(bestScore, getSmartMatchScore(query, term));
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const threshold = queryTokens.length > 1 ? 520 : normalizedQuery.length <= 4 ? 850 : 620;

  return { score: bestScore >= threshold ? bestScore : 0, exact: false };
};

export default function SearchTab({ state, setState }: SearchTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [resultLimit, setResultLimit] = useState(10);
  const [subscribers, setSubscribers] = useState<BaseSubscriberRecord[]>([]);
  const [investors, setInvestors] = useState<ShareholderRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [managers, setManagers] = useState<ManagerSearchRecord[]>([]);

  useEffect(() => {
    const loadSearchSources = async () => {
      const [subscriberData, supplierData, investorData, managerData] = await Promise.all([
        fetchSubscribers().catch(() => []),
        fetchSuppliers().catch(() => []),
        fetchInvestors().catch(() => []),
        fetchManagersRaw().catch(() => []),
      ]);
      setSubscribers(subscriberData || []);
      setSuppliers(supplierData || []);
      setInvestors(Array.isArray(investorData) ? investorData : []);
      setManagers(Array.isArray(managerData) ? managerData : []);
    };

    loadSearchSources();
  }, []);

  const effectiveInvestors = useMemo(
    () => (investors.length > 0 ? investors : TEMP_INVESTORS),
    [investors]
  );

  const effectiveSuppliers = useMemo(
    () => (suppliers.length > 0 ? suppliers : TEMP_SUPPLIERS),
    [suppliers]
  );

  const effectiveManagers = useMemo(
    () => (managers.length > 0 ? managers : TEMP_MANAGERS),
    [managers]
  );

  const openResultDestination = (type: Category) => {
    setState(prev => ({
      ...prev,
      activeTab: type === 'subscribers'
        ? 'crm'
        : type === 'investors'
          ? 'investors'
          : type === 'suppliers'
            ? 'suppliers'
            : 'management'
    }));
  };

  const openItemSettings = (item: SearchResult) => {
    const targetSubTab = item.type === 'subscribers'
      ? 'subscribers'
      : item.type === 'investors'
        ? 'shareholders'
        : item.type === 'suppliers'
          ? 'suppliers'
          : 'managers';

    localStorage.setItem('sas4_active_subtab', targetSubTab);
    localStorage.setItem(SEARCH_SETTINGS_TARGET_KEY, JSON.stringify({
      type: item.type,
      targetSubTab,
      item: item.sourceData,
    }));

    setState(prev => ({
      ...prev,
      activeTab: 'management',
    }));
  };

  const database: SearchResult[] = useMemo(() => [
    ...subscribers.map((subscriber) => {
      const firstName = String(subscriber.firstName || subscriber.firstname || subscriber['الاسم الاول'] || '').trim();
      const lastName = String(subscriber.lastName || subscriber.lastname || subscriber['اسم العائلة'] || subscriber['الاسم الثاني'] || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || String(subscriber.name || subscriber.username || 'Subscriber').trim();
      const username = String(subscriber.username || subscriber['اسم الدخول'] || subscriber['اسم المستخدم'] || '').trim();
      const plan = String(subscriber.plan || subscriber.profile || subscriber.package || subscriber['الباقة'] || subscriber['سرعة الخط'] || '').trim();
      const phone = String(subscriber.phone || subscriber['رقم الموبايل'] || subscriber['الهاتف'] || '').trim();
      return {
        id: String(subscriber.id || username || fullName),
        name: fullName,
        type: 'subscribers' as Category,
        status: String(subscriber.status || subscriber['حالة الحساب'] || (isRTL ? 'غير محدد' : 'Unknown')),
        details: `${username || (isRTL ? 'بدون اسم دخول' : 'No username')} • ${plan || (isRTL ? 'بدون باقة' : 'No plan')}`,
        icon: User,
        routeTab: 'crm',
        scoreTerms: [
          fullName,
          firstName,
          lastName,
          username,
          plan,
          String(subscriber.city || subscriber['المدينة'] || ''),
          String(subscriber.email || subscriber['البريد الإلكتروني'] || ''),
        ].filter(Boolean),
        exactTerms: [fullName, firstName, lastName, username, String(subscriber.username || ''), String(subscriber['اسم الدخول'] || ''), String(subscriber['اسم المستخدم'] || '')].filter(Boolean),
        phoneTerms: buildPhoneSearchTerms(phone),
        sourceData: subscriber as Record<string, unknown>,
      };
    }),
    ...effectiveInvestors.map((investor) => ({
      id: investor.id,
      name: investor.name,
      type: 'investors' as Category,
      status: isRTL ? 'مستثمر' : 'Investor',
      details: `${isRTL ? 'الملكية' : 'Ownership'}: ${investor.ownership}`,
      icon: TrendingUp,
      routeTab: 'investors' as const,
      scoreTerms: [investor.name, investor.ownership, String(investor.shares), String(investor.investment)],
      exactTerms: [investor.name, investor.ownership],
      phoneTerms: [],
      sourceData: investor as unknown as Record<string, unknown>,
    })),
    ...effectiveSuppliers.map((supplier) => ({
      id: String(supplier.id || supplier.name || Math.random()),
      name: String(supplier.name || supplier['الاسم'] || 'Supplier'),
      type: 'suppliers' as Category,
      status: String(supplier.status || supplier['الحالة'] || (isRTL ? 'نشط' : 'Active')),
      details: String(supplier.note || supplier['ملاحظات'] || supplier['الرصيد'] || (isRTL ? 'مورد مرتبط بقاعدة البيانات' : 'Supplier record from the live database')),
      icon: Truck,
      routeTab: 'suppliers' as const,
      scoreTerms: [String(supplier.name || supplier['الاسم'] || ''), String(supplier.status || supplier['الحالة'] || ''), String(supplier.note || supplier['ملاحظات'] || '')].filter(Boolean),
      exactTerms: [String(supplier.name || supplier['الاسم'] || '')].filter(Boolean),
      phoneTerms: [],
      sourceData: supplier as Record<string, unknown>,
    })),
    ...effectiveManagers.map((manager, index) => {
      const firstName = String(manager['الاسم الاول'] || manager['الاسم الأول'] || '').trim();
      const lastName = String(manager['الاسم الثاني'] || manager['اسم العائلة'] || '').trim();
      const username = String(manager['اسم الدخول'] || manager.username || '').trim();
      const roleLabel = String(manager['الصلاحية'] || manager.role || (isRTL ? 'مدير' : 'Manager')).trim();
      const email = String(manager.email || '').trim();
      const displayName = `${firstName} ${lastName}`.trim() || username || email || `Manager ${index + 1}`;

      return {
      id: String(manager.id || username || email || index + 1),
      name: displayName,
      type: 'team' as Category,
      status: String(manager.status || (isRTL ? 'نشط' : 'Active')),
      details: `${username || (isRTL ? 'بدون اسم دخول' : 'No username')} • ${roleLabel}`,
      icon: ShieldCheck,
      routeTab: 'management' as const,
      scoreTerms: [displayName, firstName, lastName, username, email, roleLabel].filter(Boolean),
      exactTerms: [displayName, firstName, lastName, username, email].filter(Boolean),
      phoneTerms: [],
      sourceData: manager as Record<string, unknown>,
    };
    }),
  ], [effectiveInvestors, effectiveManagers, effectiveSuppliers, isRTL, subscribers]);

  const filteredResults = useMemo(() => {
    return database
      .map(item => {
        const match = getMatchScore(query, item);
        return { item, score: match.score, exact: match.exact };
      })
      .filter(({ item, score }) => {
        const matchesQuery = !query.trim() || score > 0;
        const matchesCategory = activeCategory === 'all' || item.type === activeCategory;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.item.name.localeCompare(b.item.name))
      .map(({ item }) => item);
  }, [query, activeCategory, database]);

  const exactMatches = useMemo(() => {
    if (!query.trim()) return [];
    const normalizedQuery = normalizeSearchText(query);
    const phoneQuery = normalizePhoneDigits(query);
    return filteredResults.filter((item) => (
      item.exactTerms.some((term) => normalizeSearchText(term) === normalizedQuery) ||
      (phoneQuery && item.phoneTerms.some((term) => term === phoneQuery || term.endsWith(phoneQuery) || phoneQuery.endsWith(term)))
    )).slice(0, 5);
  }, [filteredResults, query]);

  const subscriberInsights = useMemo(() => {
    const normalizedSubscribers = subscribers.map((subscriber) => {
      const firstName = String(subscriber.firstName || subscriber.firstname || subscriber['الاسم الاول'] || '').trim();
      const lastName = String(subscriber.lastName || subscriber.lastname || subscriber['اسم العائلة'] || subscriber['الاسم الثاني'] || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || String(subscriber.name || subscriber.username || 'Subscriber').trim();
      const expiryRaw = String(subscriber.expiry || subscriber['تاريخ الانتهاء'] || '').trim();
      const debt = Number(subscriber.debt || subscriber['عليه دين'] || 0) || 0;
      const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
      const daysToExpiry = expiryDate && !Number.isNaN(expiryDate.getTime())
        ? Math.floor((expiryDate.getTime() - Date.now()) / 86400000)
        : null;
      return {
        fullName,
        username: String(subscriber.username || subscriber['اسم الدخول'] || subscriber['اسم المستخدم'] || '').trim(),
        plan: String(subscriber.plan || subscriber['سرعة الخط'] || '').trim(),
        status: String(subscriber.status || subscriber['حالة الحساب'] || '').trim(),
        debt,
        daysToExpiry,
      };
    });

    const highestDebt = [...normalizedSubscribers].sort((a, b) => b.debt - a.debt)[0];
    const nearestExpiry = [...normalizedSubscribers]
      .filter((item) => item.daysToExpiry !== null && item.daysToExpiry >= 0)
      .sort((a, b) => (a.daysToExpiry ?? 99999) - (b.daysToExpiry ?? 99999))[0];

    return { highestDebt, nearestExpiry };
  }, [subscribers]);

  const smartInsights = useMemo(() => {
    const insights = [
      subscriberInsights.nearestExpiry
        ? {
            category: 'subscribers' as Category,
            id: 'nearest-expiry',
            title: isRTL ? 'أقرب اشتراك للانتهاء' : 'Nearest Expiry',
            description: subscriberInsights.nearestExpiry.fullName,
            meta: subscriberInsights.nearestExpiry.daysToExpiry === 0
              ? (isRTL ? 'ينتهي اليوم' : 'Expires today')
              : (isRTL ? `خلال ${subscriberInsights.nearestExpiry.daysToExpiry} يوم` : `In ${subscriberInsights.nearestExpiry.daysToExpiry} day(s)`),
            icon: Clock3,
            color: 'text-amber-500',
            onClick: () => openResultDestination('subscribers'),
          }
        : null,
      subscriberInsights.highestDebt && subscriberInsights.highestDebt.debt > 0
        ? {
            category: 'subscribers' as Category,
            id: 'highest-debt',
            title: isRTL ? 'أعلى مديونية' : 'Highest Debt',
            description: subscriberInsights.highestDebt.fullName,
            meta: subscriberInsights.highestDebt.debt.toString(),
            icon: Wallet,
            color: 'text-rose-500',
            onClick: () => setState(prev => ({ ...prev, activeTab: 'billing' })),
          }
        : null,
      effectiveInvestors.length > 0
        ? {
            category: 'investors' as Category,
            id: 'top-investor',
            title: isRTL ? 'أكبر مستثمر' : 'Top Investor',
            description: [...effectiveInvestors].sort((a, b) => b.shares - a.shares)[0].name,
            meta: [...effectiveInvestors].sort((a, b) => b.shares - a.shares)[0].ownership,
            icon: TrendingUp,
            color: 'text-violet-500',
            onClick: () => openResultDestination('investors'),
          }
        : null,
      effectiveSuppliers.length > 0
        ? {
            category: 'suppliers' as Category,
            id: 'supplier-count',
            title: isRTL ? 'الموردون النشطون' : 'Active Suppliers',
            description: isRTL ? 'ملخص موردي النظام' : 'Supplier overview',
            meta: String(effectiveSuppliers.length),
            icon: Truck,
            color: 'text-cyan-500',
            onClick: () => openResultDestination('suppliers'),
          }
        : null,
    ].filter(Boolean);

    const categoryFilteredInsights = activeCategory === 'all'
      ? insights
      : insights.filter((item) => item.category === activeCategory);

    if (!query.trim()) return categoryFilteredInsights;

    return [
      ...categoryFilteredInsights,
      {
        category: activeCategory,
        id: 'query-summary',
        title: isRTL ? 'أفضل مطابقة حالية' : 'Best Current Match',
        description: filteredResults[0]?.name || (isRTL ? 'لا توجد نتائج قوية' : 'No strong results'),
        meta: filteredResults[0]?.status || (isRTL ? 'بدون حالة' : 'No status'),
        icon: Sparkles,
        color: 'text-teal-500',
        onClick: () => filteredResults[0] && openResultDestination(filteredResults[0].type),
      },
    ];
  }, [activeCategory, effectiveInvestors, effectiveSuppliers, filteredResults, isRTL, openResultDestination, query, setState, subscriberInsights]);

  const knowledgeResults = useMemo(() => {
    return filteredResults.slice(0, 4).map((result) => ({
      title: result.name,
      desc: result.details,
      tags: [t.search.categories[result.type], result.status],
      type: result.type,
      routeTab: result.routeTab,
    }));
  }, [filteredResults, t.search.categories]);

  const shouldLimitResults = activeCategory === 'all' && !query.trim();
  const visibleResults = shouldLimitResults ? filteredResults.slice(0, resultLimit) : filteredResults;

  return (
    <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-8 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-2">
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 shadow-lg shadow-teal-500/10">
          <Search size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.search.globalSearch}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t.search.placeholder}</p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-6' : 'left-6'} text-slate-400 w-6 h-6`} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          className={`w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl py-5 ${isRTL ? 'pr-16 pl-32' : 'pl-16 pr-32'} text-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 shadow-xl transition-all text-slate-800 dark:text-slate-100`}
        />
        <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex gap-2`}>
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {isRTL ? 'مسح' : 'Clear'}
            </button>
          )}
          <button className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20">
            {t.search.searchBtn}
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-2">
        {(['all', 'subscribers', 'investors', 'suppliers', 'team'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === cat 
                ? 'bg-teal-500 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-teal-500/50'
            }`}
          >
            {t.search.categories[cat]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          {isRTL ? 'عرض النتائج' : 'Show Results'}
        </span>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          {[5, 10, 20, 50].map((limit) => (
            <button
              key={limit}
              onClick={() => setResultLimit(limit)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                resultLimit === limit
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {limit}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {smartInsights.map((insight) => {
            const Icon = insight.icon;
            return (
              <button
                key={insight.id}
                onClick={insight.onClick}
                className="glass-card p-5 text-start transition-all hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{insight.title}</div>
                    <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">{insight.description}</div>
                    <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{insight.meta}</div>
                  </div>
                  <div className={`rounded-2xl bg-slate-100 p-3 dark:bg-slate-800 ${insight.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {exactMatches.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-500 dark:text-slate-400">
              <Sparkles size={16} className="text-teal-500" />
              {isRTL ? 'مطابقات دقيقة' : 'Exact Matches'}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {exactMatches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openResultDestination(item.type)}
                  onDoubleClick={() => openItemSettings(item)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-start transition-all hover:border-teal-500/30 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
                >
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{item.name}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.details}</div>
                  </div>
                  <ArrowRight size={16} className={`text-teal-500 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Database Results Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Database size={18} className="text-teal-500" />
              {t.search.results}
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {visibleResults.length}{shouldLimitResults ? ` / ${filteredResults.length}` : ''} {isRTL ? 'سجلات' : 'Records'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/30">
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.name}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.type}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.status}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.details}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center">{t.search.table.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleResults.length > 0 ? visibleResults.map((item) => (
                  <tr key={item.id} onDoubleClick={() => openItemSettings(item)} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-teal-500/10 group-hover:text-teal-500 transition-colors">
                          <item.icon size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md">
                        {t.search.categories[item.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${item.status === 'Active' || item.status === 'نشط' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {item.details}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openResultDestination(item.type)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-teal-500/30 hover:text-teal-500 dark:border-slate-700"
                      >
                        {isRTL ? 'فتح' : 'Open'}
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                      {t.search.noResults}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Knowledge Base Section */}
        {knowledgeResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">{isRTL ? 'نتائج معرفية مرتبطة ببيانات النظام' : 'Knowledge Insights From Live System Data'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeResults.map((result, i) => (
                <button key={i} onClick={() => openResultDestination(result.type)} onDoubleClick={() => openItemSettings(filteredResults[i])} className="glass-card p-6 flex gap-4 hover:border-teal-500/30 cursor-pointer group transition-all hover:shadow-lg hover:shadow-teal-500/5 text-start">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl h-fit text-slate-500 dark:text-slate-400 group-hover:text-teal-500 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{result.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{result.desc}</p>
                    <div className="flex gap-2 mt-4">
                      {result.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-black text-teal-500">
                      {isRTL ? 'الانتقال للسجل' : 'Go to record'}
                      <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
