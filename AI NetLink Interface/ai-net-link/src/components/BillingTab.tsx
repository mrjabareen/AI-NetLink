import React from 'react';
import { motion } from 'motion/react';
import { CreditCard, Users, AlertCircle, Send, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';

interface BillingTabProps {
  state: AppState;
}

export default function BillingTab({ state }: BillingTabProps) {
  const isRTL = state.lang === 'ar';

  // Mock data - UI placeholders only. Real data comes from user's database.
  const unpaidUsers = [
    { id: 'SUB-8821', name: 'Ahmed Al-Farsi', service: 'B.O.I Enterprise', amount: 450, daysOverdue: 12 },
    { id: 'SUB-9932', name: 'TechCorp Solutions', service: 'B.O.I Dedicated', amount: 1200, daysOverdue: 5 },
    { id: 'SUB-1024', name: 'Sarah Connor', service: 'Hotspot Premium', amount: 45, daysOverdue: 2 },
  ];

  const churnRisks = [
    { id: 'SUB-4412', name: 'Global Logistics Inc.', risk: 85, reason: state.lang === 'en' ? 'Frequent disconnects (5 this week)' : 'انقطاعات متكررة (5 هذا الأسبوع)' },
    { id: 'SUB-5521', name: 'Khalid Abdullah', risk: 72, reason: state.lang === 'en' ? 'High latency during peak hours' : 'زمن وصول عالي في أوقات الذروة' },
  ];

  return (
    <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="text-emerald-500" size={32} />
          {state.lang === 'en' ? 'Billing & Churn Prediction' : 'الفوترة وتوقع الإلغاء'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {state.lang === 'en' ? 'Manage unpaid subscriptions and monitor users at risk of canceling.' : 'إدارة الاشتراكات غير المدفوعة ومراقبة المستخدمين المعرضين لخطر الإلغاء.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-12">
        
        {/* Unpaid Subscriptions */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              {state.lang === 'en' ? 'Unpaid Subscriptions' : 'الاشتراكات غير المدفوعة'}
            </h3>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
              {unpaidUsers.length} {state.lang === 'en' ? 'Pending' : 'قيد الانتظار'}
            </span>
          </div>
          
          <div className="space-y-3 flex-1">
            {unpaidUsers.map(user => (
              <div key={user.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">{user.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.service} • <span className="text-amber-600 dark:text-amber-400 font-medium">{user.daysOverdue} {state.lang === 'en' ? 'days overdue' : 'أيام متأخرة'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(user.amount, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                  <button className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors cursor-pointer" title={state.lang === 'en' ? 'Send Reminder' : 'إرسال تذكير'}>
                    <Send size={16} className={isRTL ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Churn Prediction */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingDown size={20} className="text-rose-500" />
              {state.lang === 'en' ? 'Churn Prediction (AI)' : 'توقع الإلغاء (الذكاء الاصطناعي)'}
            </h3>
            <span className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldAlert size={12} /> {state.lang === 'en' ? 'High Risk' : 'خطر عالي'}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {churnRisks.map(user => (
              <div key={user.id} className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.name}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{user.id}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">{formatNumber(user.risk)}% {state.lang === 'en' ? 'Risk' : 'خطر'}</span>
                  </div>
                </div>
                
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: `${user.risk}%` }} />
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-[#09090B] p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p>{user.reason}</p>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors">
                    {state.lang === 'en' ? 'Create Support Ticket' : 'إنشاء تذكرة دعم'}
                  </button>
                  <button className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors">
                    {state.lang === 'en' ? 'Offer Discount' : 'تقديم خصم'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
