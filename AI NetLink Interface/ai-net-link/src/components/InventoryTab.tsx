import React from 'react';
import { motion } from 'motion/react';
import { Package, MapPin, AlertTriangle, Truck, Wrench, CheckCircle2 } from 'lucide-react';
import { AppState } from '../types';
import { formatNumber } from '../utils/format';

interface InventoryTabProps {
  state: AppState;
}

export default function InventoryTab({ state }: InventoryTabProps) {
  const isRTL = state.lang === 'ar';

  // Mock data - UI placeholders only. Real data comes from user's database.
  const warehouses = [
    { id: 'WH-RYD', name: state.lang === 'en' ? 'Riyadh Main Hub' : 'المستودع الرئيسي - الرياض', routers: 450, switches: 120, aps: 890, status: 'healthy' },
    { id: 'WH-JED', name: state.lang === 'en' ? 'Jeddah Distribution' : 'مركز التوزيع - جدة', routers: 32, switches: 15, aps: 45, status: 'warning' },
  ];

  const alerts = [
    { id: 'ALT-001', device: 'Core Switch CS-99', location: 'Dammam Data Center', issue: state.lang === 'en' ? 'Power supply failure' : 'فشل في مزود الطاقة', replacements: 3 },
    { id: 'ALT-002', device: 'Edge Router ER-04', location: 'Tabuk Node', issue: state.lang === 'en' ? 'Thermal warning' : 'تحذير حراري', replacements: 12 },
  ];

  return (
    <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Package className="text-blue-500" size={32} />
          {state.lang === 'en' ? 'Smart Inventory & Field Ops' : 'المخزون الذكي والعمليات الميدانية'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {state.lang === 'en' ? 'Track hardware stock levels and dispatch field teams for broken devices.' : 'تتبع مستويات مخزون الأجهزة وإرسال الفرق الميدانية للأجهزة المعطلة.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-12">
        
        {/* Warehouse Stock */}
        <div className="glass-card p-6 flex flex-col lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" />
            {state.lang === 'en' ? 'Warehouse Stock Levels' : 'مستويات المخزون في المستودعات'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map(wh => (
              <div key={wh.id} className={`p-5 rounded-xl border ${wh.status === 'warning' ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-500/5' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{wh.name}</h4>
                    <span className="text-xs text-slate-500 font-mono">{wh.id}</span>
                  </div>
                  {wh.status === 'warning' ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white dark:bg-[#18181B] p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white mb-1">{formatNumber(wh.routers)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{state.lang === 'en' ? 'Routers' : 'راوترات'}</span>
                  </div>
                  <div className="bg-white dark:bg-[#18181B] p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white mb-1">{formatNumber(wh.switches)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{state.lang === 'en' ? 'Switches' : 'سويتشات'}</span>
                  </div>
                  <div className="bg-white dark:bg-[#18181B] p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white mb-1">{formatNumber(wh.aps)}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{state.lang === 'en' ? 'APs' : 'نقاط بث'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardware Alerts & Dispatch */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Wrench size={20} className="text-rose-500" />
              {state.lang === 'en' ? 'Hardware Alerts' : 'تنبيهات الأجهزة'}
            </h3>
            <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
              {formatNumber(alerts.length)}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{alert.device}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {alert.location}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-[#09090B] p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30 mb-3">
                  <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{alert.issue}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {state.lang === 'en' ? `${formatNumber(alert.replacements)} replacements available in nearest warehouse.` : `${formatNumber(alert.replacements)} أجهزة بديلة متوفرة في أقرب مستودع.`}
                  </p>
                </div>
                
                <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                  <Truck size={14} />
                  {state.lang === 'en' ? 'Dispatch Field Team' : 'إرسال فريق ميداني'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
