import React from 'react';
import { Clock3 } from 'lucide-react';
import { getSystemDashboardMetrics } from '../api';
import { AppState } from '../types';

type SystemClockBadgeProps = {
  state: AppState;
  compact?: boolean;
  className?: string;
};

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatIsoTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

export default function SystemClockBadge({ state, compact = false, className = '' }: SystemClockBadgeProps) {
  const isRTL = state.lang === 'ar';
  const [now, setNow] = React.useState<Date | null>(null);
  const [offsetMs, setOffsetMs] = React.useState(0);
  const [isSynced, setIsSynced] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const syncServerTime = async () => {
      try {
        const metrics = await getSystemDashboardMetrics();
        const serverDate = new Date(metrics?.timestamp || Date.now());
        if (!mounted || Number.isNaN(serverDate.getTime())) return;
        setOffsetMs(serverDate.getTime() - Date.now());
        setNow(serverDate);
        setIsSynced(true);
      } catch (error) {
        if (!mounted) return;
        setNow(new Date());
        setIsSynced(false);
      }
    };

    void syncServerTime();
    const tick = window.setInterval(() => {
      setNow(new Date(Date.now() + offsetMs));
    }, 1000);
    const resync = window.setInterval(() => {
      void syncServerTime();
    }, 60000);

    return () => {
      mounted = false;
      window.clearInterval(tick);
      window.clearInterval(resync);
    };
  }, [offsetMs]);

  if (!now) return null;

  if (compact) {
    return (
      <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-sm px-3 py-2 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock3 size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {isRTL ? 'ساعة النظام' : 'System Clock'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-slate-900 dark:text-white font-mono" dir="ltr">
                {formatIsoTime(now)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
                {formatIsoDate(now)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed top-5 z-[101] ${isRTL ? 'right-5' : 'left-5'} max-w-[220px] ${className}`}>
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock3 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {isRTL ? 'ساعة النظام' : 'System Clock'}
            </p>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white font-mono" dir="ltr">
              {formatIsoTime(now)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
              {formatIsoDate(now)}
            </p>
            <p className={`mt-1 text-[10px] font-bold ${isSynced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isSynced ? (isRTL ? 'متزامنة مع الخادم' : 'Synced with server') : (isRTL ? 'وضع احتياطي محلي' : 'Local fallback')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
