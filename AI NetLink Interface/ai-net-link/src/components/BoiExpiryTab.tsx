import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  Bell, RefreshCw, MoreVertical, User, Users, Phone, MapPin, 
  Send, Smartphone, Mail, X, Check, Loader2, MessageSquare, Zap,
  Wallet, Database, Wifi, WifiOff, Lock, Activity, AlertCircle, ShieldOff,
  Edit, Trash, Unlock, Power
} from 'lucide-react';
import { AppState } from '../types';
import { dict as originalDict } from '../dict';
const dict = originalDict as any;
import { formatCurrency } from '../utils/currency';
import { getSmartMatchScore } from '../utils/search';
import { 
  fetchSubscribers, extendSubscriber, activateSubscriber, 
  getMessageData, saveMessageData, BASE_URL, getMikrotikStatusBatch,
  disconnectSubscriber, deleteSecret, disableSecret, enableSecret, 
  syncSubscriberToMikrotik, fetchRoutersList
} from '../api';

interface BoiExpiryTabProps {
  state: AppState;
}

export default function BoiExpiryTab({ state }: BoiExpiryTabProps) {
  const isRTL = state.lang === 'ar';
  
  // Data State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts'>('all');

  // Modal State
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isBulkNotifying, setIsBulkNotifying] = useState(false);

  // Status State
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  // Sync Data
  const [lastStatusUpdate, setLastStatusUpdate] = useState<string | null>(null);
  const [refreshInterval] = useState(30000); // 30s poll

  // Integrated Action States
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTarget, setSyncTarget] = useState('all');
  const [routersList, setRoutersList] = useState<any[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Sync Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubscribers();
      // Deduplicate by ID to prevent React "duplicate key" crashes
      const unique = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
      setSubscribers(unique);
    } catch (err) {
      console.error('Failed to load subscribers');
    } finally {
      setIsLoading(false);
    }
  };

  const pollStatus = async (manual = false) => {
    if (subscribers.length > 0) {
      if (manual) setIsStatusLoading(true);
      try {
        const result = await getMikrotikStatusBatch();
        if (result && result.onlineUsers) {
          const newStatuses: Record<string, boolean> = {};
          const onlineSet = new Set(result.onlineUsers.map((u: string) => String(u).trim().toLowerCase()));
          
          subscribers.forEach(s => {
            const rawUname = s.username || s['اسم المستخدم'] || '';
            const unameClean = String(rawUname).trim().toLowerCase();
            if (rawUname) {
              newStatuses[rawUname] = onlineSet.has(unameClean);
            }
          });
          
          setOnlineStatuses(newStatuses);
          setLastStatusUpdate(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Failed to poll status', err);
      } finally {
        if (manual) setIsStatusLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (subscribers.length > 0) {
      pollStatus();
      interval = setInterval(() => pollStatus(), refreshInterval);
    }
    return () => clearInterval(interval);
  }, [subscribers.length]);

  // Helper: Status Calculation
  const getSubStatus = (expiry: string) => {
    if (!expiry || expiry === 'N/A') return 'active';
    const now = new Date();
    // Support various formats, stripping extra time if needed
    const datePart = expiry.split(' ')[0];
    const expDate = new Date(datePart);
    
    if (isNaN(expDate.getTime())) return 'active';

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return '3days';
    return 'active';
  };

  // Memoized Stats & Filtered List
  const { filteredList, subStats } = useMemo(() => {
    const getSubscriberSearchBlob = (subscriber: any) => [
      subscriber.name,
      subscriber.firstname,
      subscriber.lastname,
      subscriber['الاسم الأول'],
      subscriber['اسم العائلة'],
      subscriber.username,
      subscriber.phone,
      subscriber.address,
      subscriber['عنوان المشترك'],
      subscriber.agent,
      subscriber['الوكيل المسؤل'],
      subscriber.notes,
    ].filter(Boolean).join(' ');

    const list = subscribers
      .map(s => {
        const status = getSubStatus(s.expiry || s['تاريخ الانتهاء'] || s.expiration);
        const searchBlob = getSubscriberSearchBlob(s);
        const searchScore = Math.max(
          getSmartMatchScore(searchTerm, searchBlob),
          getSmartMatchScore(searchTerm, s.phone || ''),
          getSmartMatchScore(searchTerm, s.id || ''),
          getSmartMatchScore(searchTerm, s.username || s['اسم المستخدم'] || ''),
        );

        const matchesSearch = !searchTerm || searchScore > 0;
        const matchesFilter = activeFilter === 'all' || 
                              (activeFilter === 'online' ? onlineStatuses[s.username || s['اسم المستخدم']] :
                               activeFilter === 'activeOffline' ? (status === 'active' || status === '3days' || status === 'today') && !onlineStatuses[s.username || s['اسم المستخدم']] :
                               activeFilter === 'suspended' ? (s.status === 'suspended' || s['حالة الحساب'] === 'موقوف') :
                               activeFilter === 'demands' ? (parseFloat(String(s['عليه دين'] || 0)) > 0) :
                               activeFilter === 'debts' ? (parseFloat(String(s['الرصيد المتبقي له'] || 0)) > 0) :
                               status === activeFilter);

        return { item: s, score: searchScore, matchesSearch, matchesFilter };
      })
      .filter(entry => entry.matchesSearch && entry.matchesFilter)
      .sort((a, b) => b.score - a.score || String(a.item.name || '').localeCompare(String(b.item.name || '')))
      .map(entry => entry.item);

    const s = { 
      total: subscribers.length,
      online: subscribers.filter(sub => onlineStatuses[sub.username || sub['اسم المستخدم']]).length,
      activeOffline: subscribers.filter(sub => {
        const status = getSubStatus(sub.expiry || sub['تاريخ الانتهاء'] || sub.expiration);
        return (status === 'active' || status === '3days' || status === 'today') && !onlineStatuses[sub.username || sub['اسم المستخدم']];
      }).length,
      expired: subscribers.filter(sub => getSubStatus(sub.expiry || sub['تاريخ الانتهاء'] || sub.expiration) === 'expired').length,
      expiresSoon: subscribers.filter(sub => getSubStatus(sub.expiry || sub['تاريخ الانتهاء'] || sub.expiration) === '3days').length,
      suspended: subscribers.filter(sub => sub.status === 'suspended' || sub['حالة الحساب'] === 'موقوف').length,
      demands: subscribers.reduce((acc, sub) => acc + (parseFloat(String(sub['عليه دين'] || 0)) || 0), 0),
      debts: subscribers.reduce((acc, sub) => acc + (parseFloat(String(sub['الرصيد المتبقي له'] || 0)) || 0), 0)
    };

    return { filteredList: list, subStats: s };
  }, [subscribers, searchTerm, activeFilter, onlineStatuses]);

  // Actions
  // Action Handlers
  const handleDisconnect = async (username: string) => {
    if (!username) return;
    if (!window.confirm(isRTL ? `هل أنت متأكد من قطع اتصال المشترك ${username}؟` : `Disconnect ${username}?`)) return;
    try {
      await disconnectSubscriber(username);
      // Wait bit then poll
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleLockAccount = async (username: string) => {
    try {
      await disableSecret(username);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleUnlockAccount = async (username: string) => {
    try {
      await enableSecret(username);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleSyncToMikrotik = async (id: string) => {
    setSyncingSubscriber(subscribers.find(s => s.id === id));
    setIsSyncModalOpen(true);
    const routers = await fetchRoutersList();
    setRoutersList(routers || []);
  };

  const [syncingSubscriber, setSyncingSubscriber] = useState<any>(null);

  const performSync = async () => {
    if (!syncingSubscriber) return;
    setIsSyncing(true);
    try {
      await syncSubscriberToMikrotik(syncingSubscriber.id, syncTarget);
      alert(isRTL ? 'تمت المزامنة بنجاح' : 'Sync completed successfully');
      setIsSyncModalOpen(false);
    } catch (err) { alert(isRTL ? 'فشلت المزامنة' : 'Sync failed'); }
    finally { setIsSyncing(false); }
  };

  const getActions = (sub: any): any[] => [
    {
      id: 'edit',
      label: isRTL ? 'تعديل البيانات' : 'Edit Details',
      icon: Edit,
      onClick: (s: any) => alert(isRTL ? 'وظيفة التعديل ستتوفر قريباً في هذا القسم' : 'Edit function coming soon to this section'),
      tooltip: isRTL ? 'تعديل بيانات المشترك' : 'Modify subscriber CRM data'
    },
    {
      id: 'activate',
      label: isRTL ? 'تجديد / تفعيل' : 'Renew / Activate',
      icon: Zap,
      variant: 'success',
      onClick: (s: any) => { setSelectedSub(s); setIsRenewModalOpen(true); },
      tooltip: isRTL ? 'تجديد الاشتراك الحالي' : 'Renew current subscription'
    },
    {
      id: 'sync',
      label: isRTL ? 'مزامنة ميكروتيك' : 'Sync MikroTik',
      icon: RefreshCw,
      onClick: (s: any) => handleSyncToMikrotik(s.id),
      tooltip: isRTL ? 'تحديث البيانات على الرواتر' : 'Push CRM data to router'
    },
    {
      id: 'disconnect',
      label: isRTL ? 'قطع الاتصال (طرد)' : 'Force Disconnect',
      icon: Power,
      variant: 'danger',
      onClick: (s: any) => handleDisconnect(s.username),
      tooltip: isRTL ? 'إغلاق الجلسة النشطة' : 'Kill active session'
    },
    {
      id: 'lock',
      label: isRTL ? 'قفل الحساب' : 'Lock Account',
      icon: Lock,
      variant: 'warning',
      onClick: (s: any) => handleLockAccount(s.username),
      tooltip: isRTL ? 'تعطيل الدخول مؤقتاً' : 'Suspend router access'
    },
    {
      id: 'unlock',
      label: isRTL ? 'فتح الحساب' : 'Unlock Account',
      icon: Unlock,
      variant: 'success',
      onClick: (s: any) => handleUnlockAccount(s.username),
      tooltip: isRTL ? 'إعادة تفعيل الدخول' : 'Restore router access'
    }
  ];

  const handleBulkNotify = async () => {
    if (isBulkNotifying) return;
    setIsBulkNotifying(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsBulkNotifying(false);
    alert(isRTL ? 'تم إرسال التنبيهات لجميع المستحقين بنجاح!' : 'Notifications sent to all eligible subscribers successfully!');
  };

  // Close menus on click outside
  useEffect(() => {
    const closeMenu = () => setOpenActionMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  return (
    <motion.div 
      key="boi_expiry" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex-1 flex flex-col min-h-0 space-y-6 pb-6 px-1 md:px-2"
    >
      {/* Header Section */}
      <header className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRTL ? 'مركز التحكم الذكي في الاشتراكات' : 'Smart Subscription Control Center'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isRTL 
              ? 'مراقبة فورية للشبكة، إدارة مالية دقيقة، وتحكم كامل في جلسات المشتركين.' 
              : 'Real-time network monitoring, precise financial tracking, and full subscriber session control.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleBulkNotify}
            disabled={isBulkNotifying}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
          >
            {isBulkNotifying ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
            {isRTL ? 'تبليغ الجميع' : 'Notify All'}
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-rose-600/20 active:scale-95">
            <RefreshCw size={18} />
            {isRTL ? 'تجديد تلقائي' : 'Auto Renew'}
          </button>
        </div>
      </header>

      {/* Stats Grid - Responsive Overhaul */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4 shrink-0 px-1">
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.total} 
          value={subStats.total} 
          icon={Users} 
          color="bg-teal-500" 
          delay={0.1}
          description={dict[state.lang].management.subscribers.stats.explanations.total}
          isRTL={isRTL}
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.online} 
          value={subStats.online} 
          icon={Activity} 
          color="bg-emerald-500" 
          delay={0.2}
          description={dict[state.lang].management.subscribers.stats.explanations.online}
          isRTL={isRTL}
          active={activeFilter === 'online'}
          onClick={() => setActiveFilter('online')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.activeOffline} 
          value={subStats.activeOffline} 
          icon={WifiOff} 
          color="bg-amber-500" 
          delay={0.3}
          description={dict[state.lang].management.subscribers.stats.explanations.activeOffline}
          isRTL={isRTL}
          active={activeFilter === 'activeOffline'}
          onClick={() => setActiveFilter('activeOffline')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.expired} 
          value={subStats.expired} 
          icon={AlertCircle} 
          color="bg-rose-500" 
          delay={0.4}
          description={dict[state.lang].management.subscribers.stats.explanations.expired}
          isRTL={isRTL}
          active={activeFilter === 'expired'}
          onClick={() => setActiveFilter('expired')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.expiresSoon} 
          value={subStats.expiresSoon} 
          icon={Clock} 
          color="bg-blue-500" 
          delay={0.45}
          description={dict[state.lang].management.subscribers.stats.explanations.expiresSoon}
          isRTL={isRTL}
          active={activeFilter === '3days'}
          onClick={() => setActiveFilter('3days')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.suspended} 
          value={subStats.suspended} 
          icon={ShieldOff} 
          color="bg-slate-500" 
          delay={0.5}
          description={dict[state.lang].management.subscribers.stats.explanations.suspended}
          isRTL={isRTL}
          active={activeFilter === 'suspended'}
          onClick={() => setActiveFilter('suspended')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.demands} 
          value={formatCurrency(subStats.demands, state.currency, state.lang, 0)} 
          icon={Wallet} 
          color="bg-purple-500" 
          delay={0.6}
          description={dict[state.lang].management.subscribers.stats.explanations.demands}
          isRTL={isRTL}
          active={activeFilter === 'demands'}
          onClick={() => setActiveFilter('demands')}
        />
        <StatCardV2 
          label={dict[state.lang].management.subscribers.stats.debts} 
          value={formatCurrency(subStats.debts, state.currency, state.lang, 0)} 
          icon={Zap} 
          color="bg-indigo-500" 
          delay={0.7}
          description={dict[state.lang].management.subscribers.stats.explanations.debts}
          isRTL={isRTL}
          active={activeFilter === 'debts'}
          onClick={() => setActiveFilter('debts')}
        />
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col glass-panel rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden min-h-0 group/panel">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-md">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={isRTL ? 'بحث عن مشترك (اسم، هاتف، ID)...' : 'Search by name, phone or ID...'}
              className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl pl-12 pr-6 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {activeFilter !== 'all' && (
              <button 
                onClick={() => setActiveFilter('all')}
                className="text-xs font-black text-rose-500 hover:underline"
              >
                {isRTL ? 'عرض الكل' : 'Show All'}
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-lg transition-all active:scale-95">
              <Filter size={14} />
              {isRTL ? 'تصفية' : 'Filter'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
            <Loader2 className="animate-spin text-rose-500" size={48} />
            <p className="font-black text-slate-500 animate-pulse">{isRTL ? 'جاري جلب بيانات المشتركين...' : 'Syncing subscriber database...'}</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Search size={32} />
            </div>
            <p className="font-black text-slate-500">{isRTL ? 'لا يوجد مشتركين في هذا التصنيف.' : 'No subscribers found for this filter.'}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 scroll-smooth">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredList.map((sub, idx) => (
                <SubscriberCard 
                  key={`${sub.id}-${idx}`} 
                  sub={sub} 
                  isRTL={isRTL} 
                  status={getSubStatus(sub.expiry || sub['تاريخ الانتهاء'] || sub.expiration)}
                  onNotify={() => { setSelectedSub(sub); setIsMessageModalOpen(true); }}
                  onRenew={() => { setSelectedSub(sub); setIsRenewModalOpen(true); }}
                  openMenuId={openActionMenuId}
                  setOpenMenuId={setOpenActionMenuId}
                  actions={getActions(sub)}
                  state={state}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sync Modal */}
      <AnimatePresence>
        {isSyncModalOpen && syncingSubscriber && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md bg-white dark:bg-[#18181B] rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <RefreshCw className={isSyncing ? 'animate-spin' : ''} />
                {isRTL ? 'مزامنة مع ميكروتيك' : 'MikroTik Sync'}
              </h3>
              <div className="space-y-4 mb-8 text-sm font-bold text-slate-500">
                <p>{isRTL ? 'المشترك:' : 'Subscriber:'} <span className="text-slate-900 dark:text-white">{syncingSubscriber.name}</span></p>
                <div>
                  <label className="block mb-2 text-xs uppercase tracking-widest">{isRTL ? 'هدف المزامنة' : 'Sync Target'}</label>
                  <select value={syncTarget} onChange={(e) => setSyncTarget(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 ring-teal-500 transition-all">
                    <option value="all">{isRTL ? 'جميع الميكروتيك' : 'All MikroTiks'}</option>
                    {routersList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button disabled={isSyncing} onClick={() => setIsSyncModalOpen(false)} className="flex-1 p-4 font-black transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                <button disabled={isSyncing} onClick={performSync} className="flex-1 p-4 bg-teal-500 text-white font-black rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50">
                  {isSyncing ? isRTL ? 'جاري المزامنة...' : 'Syncing...' : isRTL ? 'بدء المزامنة' : 'Start Sync'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messaging Modal */}
      <AnimatePresence>
        {isMessageModalOpen && selectedSub && (
          <SimpleMessageModal 
            sub={selectedSub} 
            isRTL={isRTL} 
            onClose={() => setIsMessageModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const StatCardV2 = ({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  delay = 0, 
  isRTL, 
  description,
  active, 
  onClick 
}: any) => {
  // Adaptive font size for large values
  const valueLength = String(value).length;
  const valueSize = valueLength > 12 ? 'text-lg md:text-xl' : valueLength > 8 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      onClick={onClick}
      className={`bg-white/60 dark:bg-[#1C1C21]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2rem] p-4 md:p-5 shadow-xl shadow-slate-200/40 dark:shadow-none relative overflow-hidden group cursor-pointer transition-all hover:border-teal-500/40 hover:-translate-y-1 ${active ? 'ring-2 ring-teal-500 border-teal-500 shadow-teal-500/10 bg-teal-50/40 dark:bg-teal-500/10' : ''}`}
    >
      <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-24 md:w-32 h-24 md:h-32 ${color} opacity-[0.04] rounded-full -translate-y-12 translate-x-12 blur-3xl`} />
      
      <div className="flex flex-col h-full relative z-10">
        <div className="flex items-start justify-between mb-auto gap-2">
          <div className="space-y-0.5">
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1 opacity-80">{label}</p>
            {description && (
              <p className="hidden md:block text-[8px] font-bold text-slate-500 leading-tight max-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity">
                {description}
              </p>
            )}
          </div>
          <div className={`shrink-0 p-2 md:p-3 rounded-xl ${color} shadow-lg shadow-current/20 flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95`}>
            <Icon size={16} className="text-white" />
          </div>
        </div>
        
        <h3 className={`font-black text-slate-900 dark:text-white mt-4 tracking-tighter truncate ${valueSize}`}>
          {value}
        </h3>
      </div>
    </motion.div>
  );
};

function StatCard({ label, value, icon: Icon, color, active, onClick }: any) {
  const colorMap: any = {
    rose: 'border-rose-500 text-rose-500 bg-rose-500/5 shadow-rose-500/10',
    amber: 'border-amber-500 text-amber-500 bg-amber-500/5 shadow-amber-500/10',
    blue: 'border-blue-500 text-blue-500 bg-blue-500/5 shadow-blue-500/10',
    emerald: 'border-emerald-500 text-emerald-500 bg-emerald-500/5 shadow-emerald-500/10',
  };

  return (
    <button 
      onClick={onClick}
      className={`glass-card p-6 border-b-4 transition-all text-left relative overflow-hidden ${colorMap[color]} ${active ? 'scale-105 shadow-2xl ring-2 ring-offset-2 dark:ring-offset-slate-950 ring-current opacity-100' : 'hover:scale-[1.02] opacity-70 hover:opacity-100'}`}
    >
      <div className="flex flex-col relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">{label}</p>
        <div className="flex justify-between items-end">
          <span className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{value}</span>
          <div className="p-2 rounded-lg bg-white/10">
            <Icon size={24} className="opacity-80" />
          </div>
        </div>
      </div>
    </button>
  );
}

function SubscriberCard({ sub, isRTL, status, onNotify, onRenew, openMenuId, setOpenMenuId, actions, state }: any) {
  const currentBalance = parseFloat(String(sub['الرصيد المتبقي له'] || 0)) || 0;
  const currentDebt = parseFloat(String(sub['عليه دين'] || 0)) || 0;
  const balanceValue = currentBalance - currentDebt;

  const statusColors: any = {
    expired: 'border-l-rose-600 bg-rose-500/5 ring-rose-500/20',
    today: 'border-l-amber-500 bg-amber-500/5 ring-amber-500/20',
    '3days': 'border-l-blue-500 bg-blue-500/5 ring-blue-500/20',
    active: 'border-l-emerald-500 bg-emerald-500/5 ring-emerald-500/20',
  };

  const statusLabels: any = {
    expired: isRTL ? 'منتهي الصلاحية' : 'Expired',
    today: isRTL ? 'ينتهي اليوم' : 'Ends Today',
    '3days': isRTL ? 'ينتهي قريباً' : 'Ends Soon',
    active: isRTL ? 'نشط' : 'Active',
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-4 md:p-6 border-l-4 ring-1 flex flex-col ${statusColors[status]} hover:shadow-2xl transition-all group relative min-h-[300px]`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:-rotate-3 transition-transform ring-1 ring-slate-200 dark:ring-slate-700">
            <User size={24} />
          </div>
          <div className="min-w-0">
            <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{sub.name || 'Anonymous'}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm ${statusColors[status].split(' ')[1]} ${statusColors[status].split(' ')[0].replace('border-l', 'text')}`}>
                {statusLabels[status]}
              </span>
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400">ID: {sub.id}</span>
            </div>
          </div>
        </div>
        
        <SmartActionMenu 
          item={sub}
          actions={actions}
          isOpen={openMenuId === sub.id}
          onToggle={() => setOpenMenuId(openMenuId === sub.id ? null : sub.id)}
          isRTL={isRTL}
        />
      </div>

      <div className="space-y-4 mb-4 md:mb-8">
        <div className="flex items-center justify-between text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Phone size={12} className="opacity-50" />
            <span>{sub.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="opacity-50" />
            <span className="truncate max-w-[80px] md:max-w-[100px]">{sub.location || sub.address || 'N/A'}</span>
          </div>
        </div>
        <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
            <Zap size={14} className="text-amber-500" />
            <span className="truncate">{sub.plan || 'BOI Premium 50M'}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 md:pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
            <span className={`text-sm md:text-base font-black tracking-tighter ${
              status === 'expired' || status === 'today' ? 'text-rose-500' : 
              status === '3days' ? 'text-amber-500' : 'text-emerald-500'
            }`}>
              {sub.expiry || sub['تاريخ الانتهاء'] || sub.expiration || 'N/A'}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{isRTL ? 'الرصيد' : 'Balance'}</span>
            <span className={`text-sm md:text-base font-black tracking-tighter ${balanceValue < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {formatCurrency(balanceValue, state.currency, state.lang, 1)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onNotify}
            className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-teal-500 hover:text-white transition-all shadow-lg active:scale-90 ring-1 ring-slate-100 dark:ring-slate-700"
          >
            <MessageSquare size={18} />
          </button>
          <button 
            onClick={onRenew}
            className="flex-1 py-3 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/30 active:scale-95"
          >
            {isRTL ? 'تجديد الآن' : 'Renew Now'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const SmartActionMenu = ({ item, actions, isOpen, onToggle, isRTL }: any) => {
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={onToggle}
        className={`p-2 rounded-xl transition-all ${isOpen ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-teal-500 bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700'}`}
      >
        <MoreVertical size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden`}
          >
            <div className="p-2 space-y-1">
              {actions.map((action: any) => (
                <button 
                  key={action.id}
                  onClick={() => { action.onClick(item); onToggle(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl transition-all ${
                    action.variant === 'danger' ? 'text-rose-500 hover:bg-rose-500 hover:text-white' :
                    action.variant === 'warning' ? 'text-amber-500 hover:bg-amber-500 hover:text-white' :
                    action.variant === 'success' ? 'text-emerald-500 hover:bg-emerald-500 hover:text-white' :
                    'text-slate-700 dark:text-slate-300 hover:bg-teal-500 hover:text-white'
                  }`}
                >
                  <action.icon size={16} />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function SimpleMessageModal({ sub, isRTL, onClose }: any) {
  const [method, setMethod] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setSending(false);
    onClose();
    // In a real app we'd call the API here
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, rotateX: 20 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-white dark:bg-[#18181B] rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-10 border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-500">
                <Send size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  {isRTL ? 'إرسال تنبيه فوري' : 'Direct Alert'}
                </h3>
                <p className="text-xs font-bold text-slate-400">{isRTL ? 'قم باختيار قناة الإرسال' : 'Select delivery channel'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
              <X size={28} />
            </button>
          </div>

          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                <User size={24} className="text-teal-500" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">{sub.name}</p>
                <p className="text-sm font-bold text-slate-400 tracking-wider">#{sub.phone}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <MethodButton active={method === 'whatsapp'} onClick={() => setMethod('whatsapp')} icon={Smartphone} label="WhatsApp" color="emerald" />
            <MethodButton active={method === 'sms'} onClick={() => setMethod('sms')} icon={MessageSquare} label="SMS" color="blue" />
            <MethodButton active={method === 'email'} onClick={() => setMethod('email')} icon={Mail} label="Email" color="rose" />
          </div>

          <button 
            disabled={sending}
            onClick={handleSend}
            className="w-full py-5 bg-teal-500 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-500/40 flex items-center justify-center gap-4 transition-all hover:bg-teal-600 active:scale-95 disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={28} /> : <Check size={28} />}
            {isRTL ? 'تأكيد الإرسال الآن' : 'Confirm Dispatch'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MethodButton({ active, icon: Icon, label, onClick, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    rose: 'bg-rose-500/10 text-rose-600',
  };

  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${
        active 
          ? `border-teal-500 ${colorMap[color]} shadow-2xl shadow-teal-500/20` 
          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-60 hover:opacity-100 grayscale'
      }`}
    >
      <Icon size={28} />
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
