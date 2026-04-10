import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, AlertCircle, Send, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import { AppState, BaseSubscriberRecord } from '../types';
import { fetchSubscribers } from '../api';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';

interface BillingTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type BillingSubscriber = BaseSubscriberRecord & {
  fullName: string;
  username: string;
  debtAmount: number;
  expiryText: string;
  daysOverdue: number;
  churnRisk: number;
  churnReason: string;
};

const getSubscriberName = (subscriber: BaseSubscriberRecord) => {
  const firstName = String(subscriber.firstName || subscriber.firstname || subscriber['الاسم الاول'] || '').trim();
  const lastName = String(subscriber.lastName || subscriber.lastname || subscriber['اسم العائلة'] || subscriber['الاسم الثاني'] || '').trim();
  return `${firstName} ${lastName}`.trim() || String(subscriber.name || subscriber.username || 'Subscriber').trim();
};

const getDaysDifference = (rawDate: string) => {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.floor((Date.now() - parsed.getTime()) / 86400000);
};

export default function BillingTab({ state, setState }: BillingTabProps) {
  const isRTL = state.lang === 'ar';
  const [subscribers, setSubscribers] = useState<BillingSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBillingData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSubscribers();
        const mapped = (data || []).map((subscriber: BaseSubscriberRecord) => {
          const debtAmount = Number(subscriber.debt || subscriber.balanceDue || subscriber['عليه دين'] || 0) || 0;
          const expiryText = String(subscriber.expiry || subscriber.expiration || subscriber['تاريخ انتهاء الاشتراك'] || subscriber['تاريخ النهاية'] || '').trim();
          const daysOverdue = expiryText ? Math.max(0, getDaysDifference(expiryText)) : 0;
          const statusText = String(subscriber.status || subscriber['حالة الحساب'] || '').toLowerCase();
          const churnRisk = Math.min(98, (debtAmount > 0 ? 45 : 10) + (daysOverdue * 6) + (statusText.includes('expired') || statusText.includes('منتهي') ? 20 : 0));

          return {
            ...subscriber,
            fullName: getSubscriberName(subscriber),
            username: String(subscriber.username || subscriber['اسم الدخول'] || subscriber['اسم المستخدم'] || '').trim(),
            debtAmount,
            expiryText: expiryText || (isRTL ? 'غير متوفر' : 'Unavailable'),
            daysOverdue,
            churnRisk,
            churnReason: debtAmount > 0
              ? (isRTL ? `مديونية قائمة بقيمة ${debtAmount}` : `Outstanding debt of ${debtAmount}`)
              : (isRTL ? 'الاشتراك قريب من الانتهاء أو منتهي بالفعل' : 'Subscription is near expiry or already expired'),
          };
        });

        setSubscribers(mapped);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingData();
  }, [isRTL]);

  const unpaidUsers = useMemo(
    () => subscribers.filter((subscriber) => subscriber.debtAmount > 0).sort((a, b) => b.debtAmount - a.debtAmount).slice(0, 8),
    [subscribers]
  );

  const churnRisks = useMemo(
    () => subscribers.filter((subscriber) => subscriber.churnRisk >= 40).sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 8),
    [subscribers]
  );

  return (
    <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="text-emerald-500" size={32} />
          {state.lang === 'en' ? 'Billing & Churn Prediction' : 'الفوترة وتوقع الإلغاء'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {state.lang === 'en' ? 'Manage real unpaid subscriptions and monitor subscribers at risk using live system data.' : 'إدارة الاشتراكات غير المدفوعة ومراقبة المشتركين المعرّضين للخطر بالاعتماد على بيانات النظام الحقيقية.'}
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
            {isLoading ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 p-4 text-sm font-bold text-slate-500">
                {isRTL ? 'جاري تحميل بيانات الفوترة...' : 'Loading billing data...'}
              </div>
            ) : unpaidUsers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 p-4 text-sm font-bold text-slate-500">
                {isRTL ? 'لا توجد مديونيات حالية على المشتركين.' : 'There are no outstanding subscriber balances right now.'}
              </div>
            ) : unpaidUsers.map(user => (
              <div key={user.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.fullName}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">{user.username || user.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.plan || (isRTL ? 'بدون باقة' : 'No plan')} • <span className="text-amber-600 dark:text-amber-400 font-medium">{user.daysOverdue} {state.lang === 'en' ? 'days overdue' : 'أيام متأخرة'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(user.debtAmount, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                  <button onClick={() => setState(prev => ({ ...prev, activeTab: 'management' }))} className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors cursor-pointer" title={state.lang === 'en' ? 'Open subscriber management' : 'فتح إدارة المشترك'}>
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
            {isLoading ? (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5 p-4 text-sm font-bold text-slate-500">
                {isRTL ? 'جاري تحليل المخاطر...' : 'Analyzing churn risk...'}
              </div>
            ) : churnRisks.length === 0 ? (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5 p-4 text-sm font-bold text-slate-500">
                {isRTL ? 'لا توجد حالات مرتفعة الخطورة حالياً.' : 'No high-risk churn cases at the moment.'}
              </div>
            ) : churnRisks.map(user => (
              <div key={user.id} className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.fullName}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{user.username || user.id}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">{formatNumber(user.churnRisk)}% {state.lang === 'en' ? 'Risk' : 'خطر'}</span>
                  </div>
                </div>
                
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: `${user.churnRisk}%` }} />
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-[#09090B] p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p>{user.churnReason}</p>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setState(prev => ({ ...prev, activeTab: 'management' }))} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-colors">
                    {state.lang === 'en' ? 'Open Subscriber' : 'فتح المشترك'}
                  </button>
                  <button onClick={() => setState(prev => ({ ...prev, activeTab: 'crm' }))} className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors">
                    {state.lang === 'en' ? 'Open CRM' : 'فتح CRM'}
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
