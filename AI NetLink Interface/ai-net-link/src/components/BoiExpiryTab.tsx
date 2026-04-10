import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  Bell, RefreshCw, MoreVertical, User, Users, Phone, MapPin, 
  Send, Smartphone, Mail, X, Check, Loader2, MessageSquare, Zap,
  Wallet, Database, Wifi, WifiOff, Lock, Activity, AlertCircle, ShieldOff,
  Edit, Trash, Unlock, Power
} from 'lucide-react';
import { AppState, BaseSubscriberRecord, RouterRecord } from '../types';
import { dict as originalDict } from '../dict';
const dict = originalDict as any;
import { formatCurrency } from '../utils/currency';
import { formatTime } from '../utils/format';
import { getSmartMatchScore } from '../utils/search';
import { 
  fetchSubscribers, extendSubscriber, activateSubscriber, updateSubscriber,
  getMessageData, saveMessageData, BASE_URL, getMikrotikStatusBatch,
  disconnectSubscriber, deleteSecret, disableSecret, enableSecret, 
  syncSubscriberToMikrotik, fetchRoutersList
} from '../api';
import { toastError, toastInfo, toastSuccess } from '../utils/notify';
import AppConfirmDialog from './AppConfirmDialog';

interface BoiExpiryTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

type SubscriberRecord = BaseSubscriberRecord & {
  id: string;
  address?: string;
  expiration?: string;
};

type ActionVariant = 'default' | 'danger' | 'warning' | 'success';

type MenuAction = {
  id: string;
  label: string;
  icon: IconComponent;
  variant?: ActionVariant;
  onClick: (subscriber: SubscriberRecord) => void;
  tooltip: string;
};

type SubscriberStatus = 'expired' | 'today' | '3days' | 'active';

type StatCardColor = 'rose' | 'amber' | 'blue' | 'emerald';
type MethodColor = 'emerald' | 'blue' | 'rose';

const SEARCH_SETTINGS_TARGET_KEY = 'sas4_search_settings_target';

interface SubscriberCardProps {
  sub: SubscriberRecord;
  isRTL: boolean;
  status: SubscriberStatus;
  onNotify: () => void;
  onRenew: () => void;
  onOpenSettings: () => void;
  openMenuId: string | null;
  setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  actions: MenuAction[];
  state: AppState;
}

export default function BoiExpiryTab({ state, setState }: BoiExpiryTabProps) {
  const isRTL = state.lang === 'ar';
  
  // Data State
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts'>('all');

  // Modal State
  const [selectedSub, setSelectedSub] = useState<SubscriberRecord | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isBulkNotifying, setIsBulkNotifying] = useState(false);
  const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
  const [isBulkRenewConfirmOpen, setIsBulkRenewConfirmOpen] = useState(false);
  const [isBulkRenewing, setIsBulkRenewing] = useState(false);
  const [bulkRenewFilter, setBulkRenewFilter] = useState<'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts'>('expired');
  const [bulkRenewDays, setBulkRenewDays] = useState(30);
  const [bulkRenewMethods, setBulkRenewMethods] = useState<Set<string>>(new Set(['whatsapp']));
  const [bulkRenewTemplate, setBulkRenewTemplate] = useState('');
  const [bulkRenewMessage, setBulkRenewMessage] = useState('');
  const [bulkNotifyFilter, setBulkNotifyFilter] = useState<'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts'>('expired');
  const [bulkNotifyMethods, setBulkNotifyMethods] = useState<Set<string>>(new Set(['whatsapp']));
  const [bulkNotifyTemplate, setBulkNotifyTemplate] = useState('');
  const [bulkNotifyMessage, setBulkNotifyMessage] = useState('');
  const [terminateCandidate, setTerminateCandidate] = useState<SubscriberRecord | null>(null);
  const [messageData, setMessageData] = useState<{ templates: Array<{ id?: string; name?: string; title?: string; content?: string; body?: string }>; groups: any[] }>({ templates: [], groups: [] });

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
  const [routersList, setRoutersList] = useState<RouterRecord[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [disconnectCandidate, setDisconnectCandidate] = useState<string | null>(null);

  // Sync Data
  const fetchSubscribersWithRetry = async (attempts = 6, delayMs = 800) => {
    let latest: SubscriberRecord[] = [];

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const data = await fetchSubscribers();
      latest = Array.isArray(data) ? data as SubscriberRecord[] : [];

      if (latest.length > 0 || attempt === attempts) {
        return latest;
      }

      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    return latest;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubscribersWithRetry();
      // Deduplicate by ID to prevent React "duplicate key" crashes
      const unique = Array.from(new Map((data as SubscriberRecord[]).map((item) => [item.id, item])).values());
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
          setLastStatusUpdate(formatTime());
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
    const loadMessageTemplates = async () => {
      const data = await getMessageData();
      setMessageData({
        templates: Array.isArray(data?.templates) ? data.templates : [],
        groups: Array.isArray(data?.groups) ? data.groups : [],
      });
    };

    loadMessageTemplates();
  }, []);

  const getTemplateText = (templateId: string) => {
    if (!templateId) return '';
    const selectedTemplate = messageData.templates.find((template) => String(template.id || template.name || template.title || '') === templateId);
    return String(selectedTemplate?.text || selectedTemplate?.content || selectedTemplate?.body || '').trim();
  };

  const sendBulkMessages = async (
    targets: SubscriberRecord[],
    methods: Set<string>,
    messageText: string,
    emailSubject: string
  ) => {
    if (!messageText.trim()) {
      throw new Error(isRTL ? 'نص الرسالة فارغ.' : 'Message text is empty.');
    }

    if (methods.size === 0) {
      throw new Error(isRTL ? 'يجب اختيار قناة إرسال واحدة على الأقل.' : 'Select at least one delivery channel.');
    }

    const mobileTargets = targets.map((sub) => String(sub.phone || sub['الهاتف'] || '').trim()).filter(Boolean);
    const emailTargets = targets.map((sub) => String(sub.email || sub['البريد الإلكتروني'] || '').trim()).filter(Boolean);
    const requests: Promise<{ type: string; ok: boolean; message?: string }>[] = [];

    if (methods.has('whatsapp') && mobileTargets.length > 0) {
      requests.push(
        fetch(`${BASE_URL}/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(async (res) => ({ type: 'WhatsApp', ok: res.ok, message: res.ok ? undefined : JSON.stringify(await res.json().catch(() => ({})))}))
      );
    }

    if (methods.has('sms') && mobileTargets.length > 0) {
      requests.push(
        fetch(`${BASE_URL}/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(async (res) => ({ type: 'SMS', ok: res.ok, message: res.ok ? undefined : JSON.stringify(await res.json().catch(() => ({})))}))
      );
    }

    if (methods.has('email') && emailTargets.length > 0) {
      requests.push(
        fetch(`${BASE_URL}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailTargets, subject: emailSubject, text: messageText })
        }).then(async (res) => ({ type: 'Email', ok: res.ok, message: res.ok ? undefined : JSON.stringify(await res.json().catch(() => ({})))}))
      );
    }

    if (requests.length === 0) {
      throw new Error(isRTL ? 'لا توجد بيانات صالحة للإرسال عبر القنوات المحددة.' : 'No valid recipient data found for the selected channels.');
    }

    const results = await Promise.all(requests);
    const failed = results.filter((result) => !result.ok);
    if (failed.length === results.length) {
      throw new Error(failed.map((item) => `${item.type}: ${item.message || 'failed'}`).join(' | '));
    }

    return results;
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
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

  const matchesSubscriberFilter = (subscriber: SubscriberRecord, filter: typeof activeFilter) => {
    const status = getSubStatus(subscriber.expiry || subscriber['تاريخ الانتهاء'] || subscriber.expiration);
    const username = subscriber.username || subscriber['اسم المستخدم'];

    if (filter === 'all') return true;
    if (filter === 'online') return Boolean(onlineStatuses[username]);
    if (filter === 'activeOffline') return (status === 'active' || status === '3days' || status === 'today') && !onlineStatuses[username];
    if (filter === 'suspended') return subscriber.status === 'suspended' || subscriber['حالة الحساب'] === 'موقوف';
    if (filter === 'demands') return (parseFloat(String(subscriber['عليه دين'] || 0)) || 0) > 0;
    if (filter === 'debts') return (parseFloat(String(subscriber['الرصيد المتبقي له'] || 0)) || 0) > 0;
    return status === filter;
  };

  // Memoized Stats & Filtered List
  const { filteredList, subStats } = useMemo(() => {
    const getSubscriberSearchBlob = (subscriber: SubscriberRecord) => [
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
    setDisconnectCandidate(username);
  };

  const confirmDisconnect = async () => {
    if (!disconnectCandidate) return;
    const username = disconnectCandidate;
    try {
      await disconnectSubscriber(username);
      // Wait bit then poll
      setTimeout(() => pollStatus(false), 2000);
      toastSuccess(isRTL ? `تم قطع اتصال ${username} بنجاح.` : `${username} disconnected successfully.`, isRTL ? 'تمت العملية' : 'Disconnected');
    } catch (err) {
      console.error(err);
      toastError(isRTL ? 'فشل قطع الاتصال.' : 'Failed to disconnect subscriber.', isRTL ? 'فشل العملية' : 'Operation Failed');
    } finally {
      setDisconnectCandidate(null);
    }
  };

  const handleLockAccount = async (username: string) => {
    if (!username) return;
    try {
      await disableSecret(username);
      setSubscribers((prev) => prev.map((sub) => (
        String(sub.username || sub['اسم المستخدم'] || '').trim() === username
          ? { ...sub, status: 'suspended', 'حالة الحساب': 'موقوف' }
          : sub
      )));
      setTimeout(() => pollStatus(false), 2000);
      toastSuccess(isRTL ? `تم تجميد الحساب ${username}.` : `${username} account suspended successfully.`, isRTL ? 'تم التجميد' : 'Account Suspended');
    } catch (err) {
      console.error(err);
      toastError(isRTL ? 'فشل تجميد الحساب.' : 'Failed to suspend account.', isRTL ? 'فشل العملية' : 'Operation Failed');
    }
  };

  const handleUnlockAccount = async (username: string) => {
    if (!username) return;
    try {
      await enableSecret(username);
      setSubscribers((prev) => prev.map((sub) => (
        String(sub.username || sub['اسم المستخدم'] || '').trim() === username
          ? { ...sub, status: 'active', 'حالة الحساب': 'مفعل' }
          : sub
      )));
      setTimeout(() => pollStatus(false), 2000);
      toastSuccess(isRTL ? `تم إعادة تفعيل الحساب ${username}.` : `${username} account reactivated successfully.`, isRTL ? 'تم التفعيل' : 'Account Reactivated');
    } catch (err) {
      console.error(err);
      toastError(isRTL ? 'فشل إعادة تفعيل الحساب.' : 'Failed to reactivate account.', isRTL ? 'فشل العملية' : 'Operation Failed');
    }
  };

  const handleTerminateSubscription = async (sub: SubscriberRecord) => {
    const username = String(sub.username || sub['اسم المستخدم'] || '').trim();
    const expiredDate = new Date(Date.now() - 86400000);
    const expiryValue = `${expiredDate.getFullYear()}-${String(expiredDate.getMonth() + 1).padStart(2, '0')}-${String(expiredDate.getDate()).padStart(2, '0')}`;
    try {
      if (username) {
        await disconnectSubscriber(username).catch(() => null);
        await disableSecret(username).catch(() => null);
      }

      await updateSubscriber(String(sub.id), {
        ...sub,
        status: 'expired',
        'حالة الحساب': 'منتهي',
        expiry: expiryValue,
        expiration: expiryValue,
        'تاريخ الانتهاء': expiryValue,
        'تاريخ انتهاء الاشتراك': expiryValue,
        expiry_time: '00:00:00',
        'وقت الانتهاء': '00:00:00',
      });

      await loadData();
      toastSuccess(
        isRTL ? `تم إنهاء اشتراك ${sub.name || username}.` : `Subscription for ${sub.name || username} has been terminated.`,
        isRTL ? 'تم إنهاء الاشتراك' : 'Subscription Terminated'
      );
    } catch (error) {
      console.error(error);
      toastError(
        isRTL ? 'فشل إنهاء الاشتراك.' : 'Failed to terminate subscription.',
        isRTL ? 'فشل العملية' : 'Operation Failed'
      );
    }
  };

  const handleSyncToMikrotik = async (id: string) => {
    setSyncingSubscriber(subscribers.find(s => s.id === id));
    setIsSyncModalOpen(true);
    const routers = await fetchRoutersList();
    setRoutersList(routers || []);
  };

  const [syncingSubscriber, setSyncingSubscriber] = useState<SubscriberRecord | null>(null);

  const openSubscriberSettings = (sub: SubscriberRecord) => {
    localStorage.setItem('sas4_active_subtab', 'subscribers');
    localStorage.setItem(SEARCH_SETTINGS_TARGET_KEY, JSON.stringify({
      type: 'subscribers',
      targetSubTab: 'subscribers',
      item: sub,
    }));
    setState(prev => ({ ...prev, activeTab: 'management' }));
  };

  const autoRenewTargets = useMemo(
    () => subscribers.filter((sub) => matchesSubscriberFilter(sub, bulkRenewFilter)),
    [subscribers, bulkRenewFilter, onlineStatuses]
  );

  const bulkNotifyTargets = useMemo(
    () => subscribers.filter((sub) => matchesSubscriberFilter(sub, bulkNotifyFilter)),
    [subscribers, bulkNotifyFilter, onlineStatuses]
  );

  const handleOpenBulkRenew = () => {
    setBulkRenewFilter(activeFilter === 'all' ? 'expired' : activeFilter);
    setBulkRenewTemplate('');
    setBulkRenewMethods(new Set(['whatsapp']));
    setBulkRenewMessage('');
    setIsBulkRenewConfirmOpen(true);
  };

  const confirmBulkRenew = async () => {
    if (autoRenewTargets.length === 0) {
      setIsBulkRenewConfirmOpen(false);
      return;
    }

    setIsBulkRenewing(true);
    try {
      const results = await Promise.allSettled(
        autoRenewTargets.map((sub) => extendSubscriber(String(sub.id), { unit: 'days', value: bulkRenewDays }, 'all'))
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      await loadData();
      setIsBulkRenewConfirmOpen(false);

      if (failedCount === 0) {
        toastSuccess(
          isRTL ? `تم تجديد ${successCount} مشتركاً لمدة ${bulkRenewDays} يوماً.` : `Renewed ${successCount} subscribers for ${bulkRenewDays} days.`,
          isRTL ? 'اكتمل التجديد' : 'Renewal Completed'
        );
      } else {
        toastInfo(
          isRTL ? `تم تجديد ${successCount} وفشل ${failedCount}.` : `Renewed ${successCount} and failed ${failedCount}.`,
          isRTL ? 'نتيجة التجديد' : 'Renewal Result'
        );
      }

      const selectedMessage = (bulkRenewTemplate ? getTemplateText(bulkRenewTemplate) : bulkRenewMessage).trim();
      if (selectedMessage) {
        await sendBulkMessages(
          autoRenewTargets,
          bulkRenewMethods,
          selectedMessage,
          isRTL ? 'إشعار تجديد اشتراك' : 'Subscription Renewal Notice'
        );
      }
    } catch (error) {
      console.error(error);
      toastError(
        isRTL ? 'فشل تنفيذ التجديد التلقائي.' : 'Failed to execute bulk auto renew.',
        isRTL ? 'فشل التجديد' : 'Renewal Failed'
      );
    } finally {
      setIsBulkRenewing(false);
    }
  };

  const performSync = async () => {
    if (!syncingSubscriber) return;
    setIsSyncing(true);
    try {
      await syncSubscriberToMikrotik(syncingSubscriber.id, syncTarget);
      toastSuccess(isRTL ? 'تمت المزامنة بنجاح.' : 'Sync completed successfully.', isRTL ? 'اكتملت المزامنة' : 'Sync Completed');
      setIsSyncModalOpen(false);
    } catch (err) { toastError(isRTL ? 'فشلت المزامنة.' : 'Sync failed.', isRTL ? 'فشلت المزامنة' : 'Sync Failed'); }
    finally { setIsSyncing(false); }
  };

  const getActions = (sub: SubscriberRecord): MenuAction[] => [
    {
      id: 'edit',
      label: isRTL ? 'تعديل البيانات' : 'Edit Details',
      icon: Edit,
      onClick: (s: SubscriberRecord) => openSubscriberSettings(s),
      tooltip: isRTL ? 'تعديل بيانات المشترك' : 'Modify subscriber CRM data'
    },
    {
      id: 'activate',
      label: isRTL ? 'تجديد / تفعيل' : 'Renew / Activate',
      icon: Zap,
      variant: 'success',
      onClick: (s: SubscriberRecord) => { setSelectedSub(s); setIsRenewModalOpen(true); },
      tooltip: isRTL ? 'تجديد الاشتراك الحالي' : 'Renew current subscription'
    },
    {
      id: 'sync',
      label: isRTL ? 'مزامنة ميكروتيك' : 'Sync MikroTik',
      icon: RefreshCw,
      onClick: (s: SubscriberRecord) => handleSyncToMikrotik(s.id),
      tooltip: isRTL ? 'تحديث البيانات على الرواتر' : 'Push CRM data to router'
    },
    {
      id: 'disconnect',
      label: isRTL ? 'قطع الاتصال (طرد)' : 'Force Disconnect',
      icon: Power,
      variant: 'danger',
      onClick: (s: SubscriberRecord) => handleDisconnect(s.username || ''),
      tooltip: isRTL ? 'إغلاق الجلسة النشطة' : 'Kill active session'
    },
    {
      id: 'lock',
      label: isRTL ? 'قفل الحساب' : 'Lock Account',
      icon: Lock,
      variant: 'warning',
      onClick: (s: SubscriberRecord) => handleLockAccount(s.username || ''),
      tooltip: isRTL ? 'تعطيل الدخول مؤقتاً' : 'Suspend router access'
    },
    {
      id: 'unlock',
      label: isRTL ? 'فتح الحساب' : 'Unlock Account',
      icon: Unlock,
      variant: 'success',
      onClick: (s: SubscriberRecord) => handleUnlockAccount(s.username || ''),
      tooltip: isRTL ? 'إعادة تفعيل الدخول' : 'Restore router access'
    },
    {
      id: 'terminate',
      label: isRTL ? 'إنهاء الاشتراك' : 'Terminate Subscription',
      icon: Trash,
      variant: 'danger',
      onClick: (s: SubscriberRecord) => setTerminateCandidate(s),
      tooltip: isRTL ? 'طرد العميل وتعطيله وتحويله إلى منتهي الاشتراك' : 'Disconnect, suspend, and mark the subscriber as expired'
    }
  ];

  const handleBulkNotify = async () => {
    const effectiveMessage = (bulkNotifyTemplate ? getTemplateText(bulkNotifyTemplate) : bulkNotifyMessage).trim();

    if (!effectiveMessage) {
      toastInfo(isRTL ? 'اكتب نص الرسالة قبل الإرسال.' : 'Write the message before sending.', isRTL ? 'رسالة مطلوبة' : 'Message Required');
      return;
    }
    if (bulkNotifyTargets.length === 0) {
      toastInfo(isRTL ? 'لا يوجد مشتركون ضمن الفلتر المحدد.' : 'There are no subscribers in the selected filter.', isRTL ? 'لا توجد عناصر' : 'No Targets');
      return;
    }
    if (isBulkNotifying) return;
    setIsBulkNotifying(true);
    try {
      await sendBulkMessages(
        bulkNotifyTargets,
        bulkNotifyMethods,
        effectiveMessage,
        isRTL ? 'إشعار من النظام' : 'System Notification'
      );

      setIsBulkNotifyModalOpen(false);
      toastSuccess(isRTL ? `تم إرسال التنبيه إلى ${bulkNotifyTargets.length} مشترك.` : `Sent notifications to ${bulkNotifyTargets.length} subscribers.`, isRTL ? 'اكتمل الإرسال' : 'Notifications Sent');
    } catch (error) {
      console.error(error);
      toastError(isRTL ? 'فشل إرسال التنبيهات.' : 'Failed to send bulk notifications.', isRTL ? 'فشل الإرسال' : 'Send Failed');
    } finally {
      setIsBulkNotifying(false);
    }
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
      className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar space-y-6 pb-6 px-1 md:px-2"
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
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              setBulkNotifyFilter(activeFilter === 'all' ? 'expired' : activeFilter);
              setBulkNotifyMethods(new Set(['whatsapp']));
              setBulkNotifyTemplate('');
              setBulkNotifyMessage(isRTL ? 'نذكركم بضرورة مراجعة حالة الاشتراك واتخاذ الإجراء المناسب.' : 'Reminder to review your subscription status and take the required action.');
              setIsBulkNotifyModalOpen(true);
            }}
            disabled={isBulkNotifying}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
          >
            {isBulkNotifying ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
            {isRTL ? 'تبليغ الجميع' : 'Notify All'}
          </button>
          <button onClick={handleOpenBulkRenew} disabled={isBulkRenewing} className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-rose-600/20 active:scale-95 disabled:opacity-50">
            <RefreshCw size={18} />
            {isBulkRenewing ? (isRTL ? 'جاري التجديد...' : 'Renewing...') : (isRTL ? 'تجديد تلقائي' : 'Auto Renew')}
          </button>
        </div>
      </header>

      {/* Stats Grid - Responsive Overhaul */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-3 md:gap-4 shrink-0 px-1">
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
      <div className="flex-1 flex flex-col glass-panel rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden min-h-[28rem] group/panel">
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
                  onOpenSettings={() => openSubscriberSettings(sub)}
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

      <AppConfirmDialog
        open={Boolean(disconnectCandidate)}
        onClose={() => setDisconnectCandidate(null)}
        onConfirm={confirmDisconnect}
        title={isRTL ? 'قطع اتصال المشترك' : 'Disconnect Subscriber'}
        description={isRTL ? `سيتم قطع اتصال ${disconnectCandidate || ''} مؤقتًا وإجباره على إعادة الاتصال.` : `${disconnectCandidate || ''} will be disconnected temporarily and forced to reconnect.`}
        confirmLabel={isRTL ? 'تأكيد قطع الاتصال' : 'Confirm Disconnect'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="warning"
        isRTL={isRTL}
      />

      <AppConfirmDialog
        open={Boolean(terminateCandidate)}
        onClose={() => setTerminateCandidate(null)}
        onConfirm={() => {
          if (!terminateCandidate) return;
          void handleTerminateSubscription(terminateCandidate);
          setTerminateCandidate(null);
        }}
        title={isRTL ? 'إنهاء الاشتراك' : 'Terminate Subscription'}
        description={isRTL ? `سيتم إنهاء اشتراك ${terminateCandidate?.name || terminateCandidate?.username || ''} وطرده وتعطيله وتحويله إلى منتهي الاشتراك.` : `${terminateCandidate?.name || terminateCandidate?.username || ''} will be disconnected, suspended, and marked as expired.`}
        confirmLabel={isRTL ? 'تأكيد الإنهاء' : 'Confirm Termination'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="danger"
        isRTL={isRTL}
      />

      <AnimatePresence>
        {isBulkNotifyModalOpen && (
          <BulkNotifyModal
            isRTL={isRTL}
            targetFilter={bulkNotifyFilter}
            onTargetFilterChange={setBulkNotifyFilter}
            targetCount={bulkNotifyTargets.length}
            methods={bulkNotifyMethods}
            onMethodsChange={setBulkNotifyMethods}
            templateValue={bulkNotifyTemplate}
            onTemplateChange={(value) => {
              setBulkNotifyTemplate(value);
              setBulkNotifyMessage(getTemplateText(value));
            }}
            templates={messageData.templates}
            message={bulkNotifyMessage}
            onMessageChange={setBulkNotifyMessage}
            onClose={() => setIsBulkNotifyModalOpen(false)}
            onConfirm={handleBulkNotify}
            busy={isBulkNotifying}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkRenewConfirmOpen && (
          <BulkRenewModal
            isRTL={isRTL}
            targetFilter={bulkRenewFilter}
            onTargetFilterChange={setBulkRenewFilter}
            targetCount={autoRenewTargets.length}
            renewDays={bulkRenewDays}
            onRenewDaysChange={setBulkRenewDays}
            methods={bulkRenewMethods}
            onMethodsChange={setBulkRenewMethods}
            templateValue={bulkRenewTemplate}
            onTemplateChange={(value) => {
              setBulkRenewTemplate(value);
              setBulkRenewMessage(getTemplateText(value));
            }}
            templates={messageData.templates}
            message={bulkRenewMessage}
            onMessageChange={setBulkRenewMessage}
            onClose={() => setIsBulkRenewConfirmOpen(false)}
            onConfirm={confirmBulkRenew}
            busy={isBulkRenewing}
          />
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

      <AnimatePresence>
        {isRenewModalOpen && selectedSub && (
          <SimpleRenewModal
            sub={selectedSub}
            isRTL={isRTL}
            onClose={() => setIsRenewModalOpen(false)}
            onCompleted={async () => {
              setIsRenewModalOpen(false);
              await loadData();
            }}
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
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
  isRTL: boolean;
  description?: string;
  active: boolean;
  onClick: () => void;
}) => {
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

function StatCard({ label, value, icon: Icon, color, active, onClick }: {
  label: string;
  value: string | number;
  icon: IconComponent;
  color: StatCardColor;
  active: boolean;
  onClick: () => void;
}) {
  const colorMap: Record<StatCardColor, string> = {
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

const SubscriberCard: React.FC<SubscriberCardProps> = ({ sub, isRTL, status, onNotify, onRenew, onOpenSettings, openMenuId, setOpenMenuId, actions, state }) => {
  const currentBalance = parseFloat(String(sub['الرصيد المتبقي له'] || 0)) || 0;
  const currentDebt = parseFloat(String(sub['عليه دين'] || 0)) || 0;
  const balanceValue = currentBalance - currentDebt;

  const statusColors: Record<SubscriberStatus, string> = {
    expired: 'border-l-rose-600 bg-rose-500/5 ring-rose-500/20',
    today: 'border-l-amber-500 bg-amber-500/5 ring-amber-500/20',
    '3days': 'border-l-blue-500 bg-blue-500/5 ring-blue-500/20',
    active: 'border-l-emerald-500 bg-emerald-500/5 ring-emerald-500/20',
  };

  const statusLabels: Record<SubscriberStatus, string> = {
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
      onDoubleClick={onOpenSettings}
      title={isRTL ? 'دبل كليك لفتح إعدادات المشترك' : 'Double-click to open subscriber settings'}
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
};

const SmartActionMenu = ({ item, actions, isOpen, onToggle, isRTL }: {
  item: SubscriberRecord;
  actions: MenuAction[];
  isOpen: boolean;
  onToggle: () => void;
  isRTL: boolean;
}) => {
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
              {actions.map((action) => (
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

function SimpleMessageModal({ sub, isRTL, onClose }: {
  sub: SubscriberRecord;
  isRTL: boolean;
  onClose: () => void;
}) {
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

function MethodButton({ active, icon: Icon, label, onClick, color }: {
  active: boolean;
  icon: IconComponent;
  label: string;
  onClick: () => void;
  color: MethodColor;
}) {
  const colorMap: Record<MethodColor, string> = {
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

function SimpleRenewModal({ sub, isRTL, onClose, onCompleted }: {
  sub: SubscriberRecord;
  isRTL: boolean;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [loadingAction, setLoadingAction] = useState<'extend30' | 'extend7' | 'activateToday' | 'activateMonth' | null>(null);

  const runAction = async (action: 'extend30' | 'extend7' | 'activateToday' | 'activateMonth') => {
    setLoadingAction(action);
    try {
      if (action === 'extend30') {
        await extendSubscriber(String(sub.id), { unit: 'days', value: 30 }, 'all');
        toastSuccess(isRTL ? 'تم تجديد الاشتراك لمدة 30 يوماً.' : 'Subscription renewed for 30 days.', isRTL ? 'تم التجديد' : 'Renewed');
      } else if (action === 'extend7') {
        await extendSubscriber(String(sub.id), { unit: 'days', value: 7 }, 'all');
        toastSuccess(isRTL ? 'تم تمديد الاشتراك لمدة 7 أيام.' : 'Subscription extended for 7 days.', isRTL ? 'تم التمديد' : 'Extended');
      } else if (action === 'activateToday') {
        await activateSubscriber(String(sub.id), 'today', 'all');
        toastSuccess(isRTL ? 'تم تفعيل الاشتراك ابتداءً من اليوم.' : 'Subscription activated starting today.', isRTL ? 'تم التفعيل' : 'Activated');
      } else {
        await activateSubscriber(String(sub.id), 'month_start', 'all');
        toastSuccess(isRTL ? 'تمت إعادة التفعيل من بداية الشهر.' : 'Subscription reactivated from the start of the month.', isRTL ? 'تم التفعيل' : 'Activated');
      }

      await onCompleted();
    } catch (error) {
      console.error(error);
      toastError(isRTL ? 'فشلت عملية التجديد أو التفعيل.' : 'Renew/activate action failed.', isRTL ? 'فشل العملية' : 'Action Failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }} className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#18181B]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-500">
              <Zap size={14} />
              {isRTL ? 'تجديد / تفعيل المشترك' : 'Renew / Activate Subscriber'}
            </div>
            <h3 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{sub.name || sub.username || sub.id}</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{isRTL ? 'اختر الإجراء المناسب مباشرة من هنا.' : 'Choose the appropriate renewal or activation action.'}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button disabled={loadingAction !== null} onClick={() => runAction('extend30')} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-start transition-all hover:border-rose-400 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10">
            <div className="text-sm font-black text-rose-600 dark:text-rose-300">{isRTL ? 'تجديد 30 يوماً' : 'Renew 30 Days'}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{isRTL ? 'تمديد مباشر لمدة شهر كامل.' : 'Direct extension for a full month.'}</div>
          </button>
          <button disabled={loadingAction !== null} onClick={() => runAction('extend7')} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-start transition-all hover:border-amber-400 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="text-sm font-black text-amber-600 dark:text-amber-300">{isRTL ? 'تمديد 7 أيام' : 'Extend 7 Days'}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{isRTL ? 'خيار سريع للحالات القصيرة.' : 'Quick option for short grace periods.'}</div>
          </button>
          <button disabled={loadingAction !== null} onClick={() => runAction('activateToday')} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-start transition-all hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-300">{isRTL ? 'تفعيل من اليوم' : 'Activate From Today'}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{isRTL ? 'إعادة تفعيل الاشتراك من تاريخ اليوم.' : 'Reactivate starting from today.'}</div>
          </button>
          <button disabled={loadingAction !== null} onClick={() => runAction('activateMonth')} className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-start transition-all hover:border-blue-400 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-500/20 dark:bg-blue-500/10">
            <div className="text-sm font-black text-blue-600 dark:text-blue-300">{isRTL ? 'تفعيل من أول الشهر' : 'Activate From Month Start'}</div>
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{isRTL ? 'إعادة ضبط التفعيل إلى بداية الشهر الحالي.' : 'Reset activation to the beginning of the current month.'}</div>
          </button>
        </div>

        {loadingAction && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            <Loader2 className="animate-spin" size={16} />
            {isRTL ? 'جاري تنفيذ العملية...' : 'Processing action...'}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BulkRenewModal({
  isRTL,
  targetFilter,
  onTargetFilterChange,
  targetCount,
  renewDays,
  onRenewDaysChange,
  methods,
  onMethodsChange,
  templateValue,
  onTemplateChange,
  templates,
  message,
  onMessageChange,
  onClose,
  onConfirm,
  busy,
}: {
  isRTL: boolean;
  targetFilter: 'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts';
  onTargetFilterChange: (value: 'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts') => void;
  targetCount: number;
  renewDays: number;
  onRenewDaysChange: (value: number) => void;
  methods: Set<string>;
  onMethodsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  templateValue: string;
  onTemplateChange: (value: string) => void;
  templates: Array<{ id?: string; name?: string; title?: string; text?: string; content?: string; body?: string }>;
  message: string;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 16 }} className="relative z-10 w-full max-w-2xl rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-[#09090B]">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{isRTL ? 'التجديد التلقائي الجماعي' : 'Bulk Auto Renew'}</h3>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'الفئة المستهدفة' : 'Target Filter'}</label>
            <select value={targetFilter} onChange={(e) => onTargetFilterChange(e.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900/50">
              <option value="expired">{isRTL ? 'المنتهي اشتراكهم' : 'Expired'}</option>
              <option value="today">{isRTL ? 'ينتهي اليوم' : 'Expires Today'}</option>
              <option value="3days">{isRTL ? 'ينتهي خلال 3 أيام' : 'Expires In 3 Days'}</option>
              <option value="active">{isRTL ? 'النشطون' : 'Active'}</option>
              <option value="online">{isRTL ? 'المتصلون الآن' : 'Online Now'}</option>
              <option value="activeOffline">{isRTL ? 'نشط لكن غير متصل' : 'Active Offline'}</option>
              <option value="suspended">{isRTL ? 'الموقوفون' : 'Suspended'}</option>
              <option value="demands">{isRTL ? 'عليهم مطالبات' : 'With Demands'}</option>
              <option value="debts">{isRTL ? 'لهم أرصدة' : 'With Balances'}</option>
              <option value="all">{isRTL ? 'الكل' : 'All'}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'عدد الأيام' : 'Renew Days'}</label>
            <input type="number" min={1} max={365} value={renewDays} onChange={(e) => onRenewDaysChange(Math.max(1, Number(e.target.value) || 30))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900/50" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'قنوات إشعار ما بعد التجديد' : 'Post-Renew Delivery Channels'}</label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('whatsapp') ? next.delete('whatsapp') : next.add('whatsapp'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('whatsapp') ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <MessageSquare size={24} /> <span className="text-[10px]">WhatsApp</span>
              </button>
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('sms') ? next.delete('sms') : next.add('sms'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('sms') ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <Smartphone size={24} /> <span className="text-[10px]">SMS</span>
              </button>
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('email') ? next.delete('email') : next.add('email'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('email') ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <Mail size={24} /> <span className="text-[10px]">Email</span>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'قالب الرسالة المحفوظ' : 'Saved Message Template'}</label>
            <select value={templateValue} onChange={(e) => onTemplateChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900/50">
              <option value="">{isRTL ? 'بدون رسالة إضافية' : 'No extra message'}</option>
              {templates.map((template, index) => (
                <option key={String(template.id || template.name || template.title || index)} value={String(template.id || template.name || template.title || '')}>
                  {template.title || template.name || `${isRTL ? 'قالب' : 'Template'} ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'نص الإشعار بعد التجديد' : 'Post-Renew Message Text'}</label>
            <textarea value={message} onChange={(e) => onMessageChange(e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-800 dark:bg-slate-900/50" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            {isRTL ? `سيتم استهداف ${targetCount} مشترك حالياً.` : `${targetCount} subscribers will be targeted currently.`}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? (isRTL ? 'جاري التنفيذ...' : 'Running...') : (isRTL ? 'تنفيذ التجديد' : 'Start Renewing')}</button>
        </div>
      </motion.div>
    </div>
  );
}

function BulkNotifyModal({
  isRTL,
  targetFilter,
  onTargetFilterChange,
  targetCount,
  methods,
  onMethodsChange,
  templateValue,
  onTemplateChange,
  templates,
  message,
  onMessageChange,
  onClose,
  onConfirm,
  busy,
}: {
  isRTL: boolean;
  targetFilter: 'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts';
  onTargetFilterChange: (value: 'all' | 'expired' | 'today' | '3days' | 'active' | 'online' | 'activeOffline' | 'suspended' | 'demands' | 'debts') => void;
  targetCount: number;
  methods: Set<string>;
  onMethodsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
  templateValue: string;
  onTemplateChange: (value: string) => void;
  templates: Array<{ id?: string; name?: string; title?: string; text?: string; content?: string; body?: string }>;
  message: string;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 16 }} className="relative z-10 w-full max-w-2xl rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-[#09090B]">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{isRTL ? 'إعداد تبليغ الجميع' : 'Bulk Notify Setup'}</h3>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'الفئة المستهدفة' : 'Target Filter'}</label>
            <select value={targetFilter} onChange={(e) => onTargetFilterChange(e.target.value as any)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900/50">
              <option value="expired">{isRTL ? 'المنتهي اشتراكهم' : 'Expired'}</option>
              <option value="today">{isRTL ? 'ينتهي اليوم' : 'Expires Today'}</option>
              <option value="3days">{isRTL ? 'ينتهي خلال 3 أيام' : 'Expires In 3 Days'}</option>
              <option value="active">{isRTL ? 'النشطون' : 'Active'}</option>
              <option value="online">{isRTL ? 'المتصلون الآن' : 'Online Now'}</option>
              <option value="activeOffline">{isRTL ? 'نشط لكن غير متصل' : 'Active Offline'}</option>
              <option value="suspended">{isRTL ? 'الموقوفون' : 'Suspended'}</option>
              <option value="demands">{isRTL ? 'عليهم مطالبات' : 'With Demands'}</option>
              <option value="debts">{isRTL ? 'لهم أرصدة' : 'With Balances'}</option>
              <option value="all">{isRTL ? 'الكل' : 'All'}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'قناة الإرسال' : 'Delivery Channel'}</label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('whatsapp') ? next.delete('whatsapp') : next.add('whatsapp'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('whatsapp') ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <MessageSquare size={24} /> <span className="text-[10px]">WhatsApp</span>
              </button>
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('sms') ? next.delete('sms') : next.add('sms'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('sms') ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <Smartphone size={24} /> <span className="text-[10px]">SMS</span>
              </button>
              <button onClick={() => onMethodsChange(prev => { const next = new Set(prev); next.has('email') ? next.delete('email') : next.add('email'); return next; })} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${methods.has('email') ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                <Mail size={24} /> <span className="text-[10px]">Email</span>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'قالب الرسالة المحفوظ' : 'Saved Message Template'}</label>
            <select value={templateValue} onChange={(e) => onTemplateChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900/50">
              <option value="">{isRTL ? 'رسالة مخصصة يدوياً' : 'Custom Manual Message'}</option>
              {templates.map((template, index) => (
                <option key={String(template.id || template.name || template.title || index)} value={String(template.id || template.name || template.title || '')}>
                  {template.title || template.name || `${isRTL ? 'قالب' : 'Template'} ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{isRTL ? 'نص الرسالة' : 'Message Text'}</label>
            <textarea value={message} onChange={(e) => onMessageChange(e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium dark:border-slate-800 dark:bg-slate-900/50" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
            {isRTL ? `سيتم تجهيز الإرسال إلى ${targetCount} مشترك.` : `Delivery will be prepared for ${targetCount} subscribers.`}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{busy ? (isRTL ? 'جاري التجهيز...' : 'Preparing...') : (isRTL ? 'تنفيذ التبليغ' : 'Prepare Notifications')}</button>
        </div>
      </motion.div>
    </div>
  );
}
