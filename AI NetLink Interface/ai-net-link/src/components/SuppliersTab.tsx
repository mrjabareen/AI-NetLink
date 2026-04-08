import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Truck, Package, ShoppingCart, DollarSign, Clock, CheckCircle2, AlertCircle, Plus, Search, Filter, MoreVertical, ExternalLink } from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';
import { getSmartMatchScore } from '../utils/search';

interface SuppliersTabProps {
  state: AppState;
}

const suppliers = [
  { id: 1, name: 'Ubiquiti Networks', category: 'Wireless Equipment', status: 'active', rating: 4.8, lastOrder: '2026-03-20' },
  { id: 2, name: 'MikroTik', category: 'Routers & Switches', status: 'active', rating: 4.5, lastOrder: '2026-03-22' },
  { id: 3, name: 'TP-Link Business', category: 'Access Points', status: 'active', rating: 4.2, lastOrder: '2026-03-15' },
  { id: 4, name: 'Cisco Systems', category: 'Core Infrastructure', status: 'pending', rating: 4.9, lastOrder: '2026-03-25' },
];

const orders = [
  { id: 'ORD-9921', supplier: 'Ubiquiti', item: 'LiteBeam M5', qty: 50, total: 4500, status: 'shipped', date: '2026-03-26' },
  { id: 'ORD-9922', supplier: 'MikroTik', item: 'CCR2004 Router', qty: 5, total: 3200, status: 'processing', date: '2026-03-27' },
  { id: 'ORD-9923', supplier: 'TP-Link', item: 'EAP660 Access Point', qty: 20, total: 2800, status: 'delivered', date: '2026-03-24' },
];

type SupplierRecord = (typeof suppliers)[number];

type SupplierAdvancedFilters = {
  status: string;
  category: string;
  rating: string;
  lastOrder: string;
};

type AdvancedFilterOption = {
  value: string;
  label: string;
};

type AdvancedFilterField = {
  key: keyof SupplierAdvancedFilters;
  label: string;
  options: AdvancedFilterOption[];
};

const DEFAULT_SUPPLIER_FILTERS: SupplierAdvancedFilters = {
  status: 'all',
  category: 'all',
  rating: 'all',
  lastOrder: 'all',
};

const toUniqueOptions = (values: string[], allLabel: string): AdvancedFilterOption[] => [
  { value: 'all', label: allLabel },
  ...Array.from(new Set(values.filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value })),
];

const getDaysSinceDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
};

export default function SuppliersTab({ state }: SuppliersTabProps) {
  const isRTL = state.lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SupplierAdvancedFilters>(DEFAULT_SUPPLIER_FILTERS);

  const totalSpend = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), []);
  const activeSupplierCount = useMemo(() => suppliers.filter((supplier) => supplier.status === 'active').length, []);
  const pendingOrderCount = useMemo(() => orders.filter((order) => order.status !== 'delivered').length, []);

  const getSupplierStatusLabel = (status: SupplierRecord['status']) => {
    if (status === 'active') return isRTL ? 'نشط' : 'Active';
    if (status === 'pending') return isRTL ? 'معلق' : 'Pending';
    return status;
  };

  const getSupplierRatingBucket = (rating: number) => {
    if (rating >= 4.7) return 'elite';
    if (rating >= 4.3) return 'trusted';
    return 'standard';
  };

  const getSupplierLastOrderBucket = (lastOrder: string) => {
    const days = getDaysSinceDate(lastOrder);
    if (days <= 7) return 'week';
    if (days <= 30) return 'month';
    return 'older';
  };

  const filterFields = useMemo<AdvancedFilterField[]>(() => [
    {
      key: 'status',
      label: isRTL ? 'الحالة' : 'Status',
      options: [
        { value: 'all', label: isRTL ? 'كل الحالات' : 'All statuses' },
        ...toUniqueOptions(
          suppliers.map((supplier) => supplier.status),
          isRTL ? 'كل الحالات' : 'All statuses',
        ).slice(1).map((option) => ({
          value: option.value,
          label: getSupplierStatusLabel(option.value as SupplierRecord['status']),
        })),
      ],
    },
    {
      key: 'category',
      label: isRTL ? 'الفئة' : 'Category',
      options: toUniqueOptions(
        suppliers.map((supplier) => supplier.category),
        isRTL ? 'كل الفئات' : 'All categories',
      ),
    },
    {
      key: 'rating',
      label: isRTL ? 'التقييم' : 'Rating',
      options: [
        { value: 'all', label: isRTL ? 'كل التقييمات' : 'All ratings' },
        { value: 'elite', label: isRTL ? 'ممتاز 4.7+' : 'Elite 4.7+' },
        { value: 'trusted', label: isRTL ? 'جيد جدا 4.3+' : 'Trusted 4.3+' },
        { value: 'standard', label: isRTL ? 'قياسي أقل من 4.3' : 'Standard below 4.3' },
      ],
    },
    {
      key: 'lastOrder',
      label: isRTL ? 'آخر طلب' : 'Last Order',
      options: [
        { value: 'all', label: isRTL ? 'كل الفترات' : 'All periods' },
        { value: 'week', label: isRTL ? 'خلال 7 أيام' : 'Within 7 days' },
        { value: 'month', label: isRTL ? 'خلال 30 يومًا' : 'Within 30 days' },
        { value: 'older', label: isRTL ? 'أقدم من 30 يومًا' : 'Older than 30 days' },
      ],
    },
  ], [isRTL]);

  const activeAdvancedFilterCount = useMemo(
    () => Object.values(advancedFilters).filter((value) => value !== 'all').length,
    [advancedFilters],
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .map((supplier) => ({
        supplier,
        score: Math.max(
          getSmartMatchScore(searchTerm, supplier.name),
          getSmartMatchScore(searchTerm, supplier.category),
          getSmartMatchScore(searchTerm, supplier.status),
          getSmartMatchScore(searchTerm, getSupplierStatusLabel(supplier.status)),
          getSmartMatchScore(searchTerm, String(supplier.id)),
        ),
      }))
      .filter(({ supplier, score }) => {
        if (searchTerm && score <= 0) return false;
        if (advancedFilters.status !== 'all' && supplier.status !== advancedFilters.status) return false;
        if (advancedFilters.category !== 'all' && supplier.category !== advancedFilters.category) return false;
        if (advancedFilters.rating !== 'all' && getSupplierRatingBucket(supplier.rating) !== advancedFilters.rating) return false;
        if (advancedFilters.lastOrder !== 'all' && getSupplierLastOrderBucket(supplier.lastOrder) !== advancedFilters.lastOrder) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score || a.supplier.name.localeCompare(b.supplier.name))
      .map(({ supplier }) => supplier);
  }, [advancedFilters, searchTerm, isRTL]);

  const resetFilters = () => {
    setSearchTerm('');
    setAdvancedFilters(DEFAULT_SUPPLIER_FILTERS);
  };

  const activeFilterChips = useMemo(() => {
    return filterFields.flatMap((field) => {
      const value = advancedFilters[field.key];
      if (!value || value === 'all') return [];
      const option = field.options.find((item) => item.value === value);
      return option ? [`${field.label}: ${option.label}`] : [];
    });
  }, [advancedFilters, filterFields]);

  return (
    <motion.div 
      key="suppliers" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex-1 flex flex-col min-h-0 space-y-6"
    >
      <header className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Truck className="text-blue-500" size={28} />
            {isRTL ? 'إدارة الموردين' : 'Supplier Management'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isRTL ? 'إدارة سلسلة التوريد، المشتريات، وعلاقات الموردين للأجهزة والشبكات.' : 'Manage supply chain, procurement, and vendor relations for hardware and networking.'}
          </p>
        </div>
        
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
          <Plus size={18} />
          {isRTL ? 'إضافة مورد جديد' : 'Add New Supplier'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'إجمالي الموردين' : 'Total Suppliers'}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(suppliers.length)}</h4>
            <p className="text-[11px] text-slate-500 mt-1">{formatNumber(activeSupplierCount)} {isRTL ? 'موردين نشطين' : 'active suppliers'}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'طلبات قيد المعالجة' : 'Pending Orders'}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(pendingOrderCount)}</h4>
            <p className="text-[11px] text-slate-500 mt-1">{formatNumber(orders.length)} {isRTL ? 'إجمالي الطلبات الحالية' : 'orders tracked'}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مشتريات الشهر' : 'Monthly Spend'}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalSpend, state.currency, state.lang, state.numberSettings.decimalPlaces)}</h4>
            <p className="text-[11px] text-slate-500 mt-1">{isRTL ? 'مجموع الطلبات المعروضة' : 'sum of tracked orders'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Supplier List */}
        <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden min-h-0">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder={isRTL ? 'بحث بالاسم أو الفئة أو الكود...' : 'Search by name, category, or ID...'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    showFilters || activeAdvancedFilterCount > 0
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Filter size={16} />
                  <span>{isRTL ? 'بحث متقدم' : 'Advanced Search'}</span>
                  {activeAdvancedFilterCount > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-white/20 text-xs font-black flex items-center justify-center">
                      {activeAdvancedFilterCount}
                    </span>
                  )}
                </button>
                {(searchTerm || activeAdvancedFilterCount > 0) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isRTL ? 'مسح البحث' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 p-4 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isRTL ? 'فلترة الموردين' : 'Supplier Filters'}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isRTL ? 'اجمع بين البحث النصي والفلاتر للحصول على نتائج أدق.' : 'Combine text search with structured filters for precise results.'}
                    </p>
                  </div>
                  {activeAdvancedFilterCount > 0 && (
                    <button
                      onClick={() => setAdvancedFilters(DEFAULT_SUPPLIER_FILTERS)}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                      {isRTL ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
                    </button>
                  )}
                </div>

                {activeFilterChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeFilterChips.map((chip) => (
                      <span key={chip} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs font-bold">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {filterFields.map((field) => (
                    <label key={field.key} className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {field.label}
                      </span>
                      <select
                        value={advancedFilters[field.key]}
                        onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'المورد' : 'Supplier'}</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الفئة' : 'Category'}</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'آخر طلب' : 'Last Order'}</th>
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-500 font-bold text-lg">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{supplier.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < Math.floor(supplier.rating) ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-base font-medium text-slate-600 dark:text-slate-400">{supplier.category}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        supplier.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                      }`}>
                        {getSupplierStatusLabel(supplier.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-base text-slate-500 font-mono">{supplier.lastOrder}</td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2.5 text-slate-400 hover:text-blue-500 transition-colors">
                        <ExternalLink size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                      {isRTL ? 'لا توجد نتائج مطابقة لخيارات البحث الحالية.' : 'No suppliers match the current search and filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Sidebar */}
        <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-4">
          <div className="glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 flex flex-col shrink-0">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-500" />
              {isRTL ? 'الطلبات الأخيرة' : 'Recent Orders'}
            </h3>
            <div className="space-y-4 flex-1">
              {orders.map(order => (
                <div key={order.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{order.item}</p>
                      <p className="text-xs text-slate-500 mt-1">{order.supplier} • {formatNumber(order.qty)} units</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 
                      order.status === 'shipped' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600' : 
                      'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-mono text-slate-400">{order.id}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(order.total, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {isRTL ? 'عرض جميع الطلبات' : 'View All Orders'}
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shrink-0">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              {isRTL ? 'تنبيهات المخزون' : 'Inventory Alerts'}
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-xs font-bold">Low Stock: LiteBeam M5</p>
                <p className="text-[10px] opacity-80 mt-1">Only 12 units remaining in main warehouse.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-xs font-bold">Price Update: MikroTik</p>
                <p className="text-[10px] opacity-80 mt-1">New price list available for Q2 2026.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
