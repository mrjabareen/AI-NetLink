import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Truck, Package, ShoppingCart, DollarSign, Clock, CheckCircle2, AlertCircle, Plus, Search, Filter, MoreVertical, ExternalLink } from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';

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

export default function SuppliersTab({ state }: SuppliersTabProps) {
  const isRTL = state.lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

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
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(24)}</h4>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'طلبات قيد المعالجة' : 'Pending Orders'}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(8)}</h4>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مشتريات الشهر' : 'Monthly Spend'}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(42500, state.currency, state.lang, state.numberSettings.decimalPlaces)}</h4>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Supplier List */}
        <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden min-h-0">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={isRTL ? 'بحث عن مورد...' : 'Search suppliers...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
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
                {suppliers.map(supplier => (
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
                        {supplier.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معلق' : 'Pending')}
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
