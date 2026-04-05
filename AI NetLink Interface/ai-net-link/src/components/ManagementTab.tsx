import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Truck, ShieldCheck, Search, Plus, Edit2, Trash2, X, Save, CheckCircle2, AlertCircle, UserPlus, Filter, Briefcase, UserCog, PieChart, RefreshCw, Activity, Globe, Wifi, WifiOff, Router, Zap, LogOut, Power, MoreVertical, Lock, Unlock, ShieldOff, Edit, Trash, Calendar, Send, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import { formatNumber, normalizeDigits } from '../utils/format';
import { formatCurrency } from '../utils/currency';
import { fetchSubscribers, fetchSuppliers, fetchInvestors, addSubscriber, updateSubscriber, deleteSubscriber, addSupplier, updateSupplier, deleteSupplier, fetchManagersRaw, addManager, updateManager, deleteManager, addInvestor, updateInvestor, deleteInvestor, directorsApi, deputiesApi, iptvApi, getMikrotikStatus, getMikrotikStatusBatch, disconnectSubscriber, disconnectAllSubscribers, deleteSecret, disableSecret, enableSecret, syncSubscriberToMikrotik, fetchRoutersList, fetchProfiles, activateSubscriber, extendSubscriber, getMessageData, saveMessageData, BASE_URL } from '../api';
import { smartMatch } from '../utils/search';

interface ManagementTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type ManagementSubTab = 'subscribers' | 'suppliers' | 'shareholders' | 'directors' | 'deputies' | 'admins' | 'iptv';

interface MenuAction {
  id: string;
  label: string;
  icon: any;
  onClick: (item: any) => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  tooltip: string;
}

const SmartActionMenu = ({ 
  item, 
  actions, 
  isOpen, 
  onToggle, 
  isRTL, 
  isLastRows 
}: { 
  item: any; 
  actions: MenuAction[]; 
  isOpen: boolean; 
  onToggle: () => void; 
  isRTL: boolean;
  isLastRows: boolean;
}) => {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  return (
    <div className="relative inline-block text-right" onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={onToggle}
        className={`p-2 rounded-xl transition-all ${isOpen ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10'}`}
      >
        <MoreVertical size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: isLastRows ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, y: isLastRows ? -10 : 10 }}
            exit={{ opacity: 0, scale: 0.95, y: isLastRows ? -20 : 20 }}
            className={`absolute ${isRTL ? 'left-0' : 'right-0'} ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'} w-64 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden`}
          >
            <div className="p-2 space-y-1">
              {actions.map((action, idx) => (
                <div key={action.id} className="relative">
                  <button 
                    onMouseEnter={() => setHoveredAction(action.id)}
                    onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => { action.onClick(item); onToggle(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${
                      action.variant === 'danger' ? 'text-rose-500 hover:bg-rose-500 hover:text-white' :
                      action.variant === 'warning' ? 'text-amber-500 hover:bg-amber-500 hover:text-white' :
                      action.variant === 'success' ? 'text-emerald-500 hover:bg-emerald-500 hover:text-white' :
                      'text-slate-700 dark:text-slate-300 hover:bg-teal-500 hover:text-white'
                    }`}
                  >
                    <action.icon size={18} />
                    <span>{action.label}</span>
                  </button>
                  
                  {/* Premium Tooltip Card */}
                  <AnimatePresence>
                    {hoveredAction === action.id && (
                      <motion.div
                        initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                        animate={{ opacity: 1, x: isRTL ? 20 : -20 }}
                        exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
                        className={`absolute top-0 ${isRTL ? 'left-full ml-4' : 'right-full mr-4'} w-48 p-3 bg-slate-900 text-white rounded-xl shadow-xl z-[110] text-[10px] border border-slate-700 pointer-events-none`}
                      >
                        <div className="font-black mb-1 text-teal-400 uppercase tracking-tighter">{isRTL ? 'تلميح' : 'Info'}</div>
                        <p className="leading-relaxed opacity-90">{action.tooltip}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ManagementTab({ state, setState }: ManagementTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  
  const userPermissions = state.currentUser?.permissions || [];
  const hasPermission = (perm: string) => state.role === 'super_admin' || userPermissions.includes('all') || userPermissions.includes(perm);

  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>(() => {
    if (hasPermission('view_subscribers')) return 'subscribers';
    if (hasPermission('view_iptv')) return 'iptv';
    if (hasPermission('view_suppliers')) return 'suppliers';
    if (hasPermission('view_shareholders')) return 'shareholders';
    if (hasPermission('view_directors')) return 'directors';
    if (hasPermission('view_deputies')) return 'deputies';
    if (hasPermission('view_admins')) return 'admins';
    return 'subscribers';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState<any>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showName, setShowName] = useState(true);
  const [showChannel, setShowChannel] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activationOption, setActivationOption] = useState<'today' | 'first_of_month'>('today');
  const [isActivating, setIsActivating] = useState(false);
  const [subToActivate, setSubToActivate] = useState<any>(null);
  const [activationTarget, setActivationTarget] = useState('all');

  // ─── MIKROTIK SYNC STATE ────────────────────────────────────────────────────
  // ─── NETWORK PROFILES (for plan dropdown) ─────────────────────────────────
  const [networkProfiles, setNetworkProfiles] = useState<any[]>([]);

  const loadNetworkProfiles = async () => {
    try {
      const profiles = await fetchProfiles();
      setNetworkProfiles(profiles || []);
    } catch (e) {
      setNetworkProfiles([]);
    }
  };

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncingSubscriber, setSyncingSubscriber] = useState<any>(null);
  const [syncTarget, setSyncTarget] = useState('all');
  const [routersList, setRoutersList] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: any[] } | null>(null);

  const SUBSCRIBER_COLUMNS = [
    { id: 'id', label: isRTL ? 'المعرف' : 'ID', defaultVisible: true },
    { id: 'firstname', label: isRTL ? 'الاسم الأول' : 'First Name', defaultVisible: true },
    { id: 'lastname', label: isRTL ? 'اسم العائلة' : 'Last Name', defaultVisible: true },
    { id: 'username', label: isRTL ? 'اسم المستخدم' : 'Username', defaultVisible: true },
    { id: 'phone', label: isRTL ? 'الهاتف' : 'Phone', defaultVisible: true },
    { id: 'idNumber', label: isRTL ? 'رقم الهوية' : 'ID Number', defaultVisible: false, key: 'رقم الهوية' },
    { id: 'password', label: isRTL ? 'كلمة المرور' : 'Password', defaultVisible: false, key: 'كلمة المرور' },
    { id: 'status', label: isRTL ? 'حالة الحساب' : 'Status', defaultVisible: true },
    { id: 'plan', label: isRTL ? 'الباقة' : 'Plan', defaultVisible: true },
    { id: 'balance', label: isRTL ? 'الرصيد' : 'Balance', defaultVisible: true },
    { id: 'debt', label: isRTL ? 'عليه دين' : 'Debt', defaultVisible: false, key: 'عليه دين' },
    { id: 'paid', label: isRTL ? 'قام بتسديد' : 'Paid', defaultVisible: false, key: 'قام بتسديد' },
    { id: 'bill', label: isRTL ? 'قيمة الفاتورة' : 'Bill Value', defaultVisible: false, key: 'قيمة الفاتورة' },
    { id: 'agent', label: isRTL ? 'الوكيل' : 'Agent', defaultVisible: false, key: 'الوكيل المسؤل' },
    { id: 'subType', label: isRTL ? 'نوع الاشتراك' : 'Subscription Type', defaultVisible: false, key: 'نوع الاشتراك' },
    { id: 'startDate', label: isRTL ? 'تاريخ الابتداء' : 'Start Date', defaultVisible: false, key: 'تاريخ بداية العقد مع الشركة' },
    { id: 'expiry', label: isRTL ? 'تاريخ الانتهاء' : 'Expiry Date', defaultVisible: true },
    { id: 'expiry_time', label: isRTL ? 'وقت الانتهاء' : 'Expiry Time', defaultVisible: true },
    { id: 'address', label: isRTL ? 'العنوان' : 'Address', defaultVisible: false, key: 'عنوان المشترك' },
    { id: 'city', label: isRTL ? 'المدينة' : 'City', defaultVisible: false, key: 'city' },
    { id: 'email', label: isRTL ? 'البريد الإلكتروني' : 'Email', defaultVisible: false, key: 'email' },
    { id: 'ip_litebeam', label: isRTL ? 'IP اللايت بيم' : 'IP', defaultVisible: false, key: 'ip_litebeam' },
    { id: 'mac_litebeam', label: isRTL ? 'ماك ادرس لايت بيم' : 'MAC Address Lightbeam', defaultVisible: false, key: 'mac_litebeam' },
    { id: 'live', label: isRTL ? 'حالة الاتصال' : 'Connection Status', defaultVisible: true },
    { id: 'notes', label: isRTL ? 'ملاحظات' : 'Notes', defaultVisible: false, key: 'ملاحظات اخرى' }
  ];

  const SUPPLIER_FIELDS = [
    { key: 'كود', label: isRTL ? 'كود' : 'Code', nameField: false },
    { key: 'اسم المورد', label: isRTL ? 'اسم المورد' : 'Supplier Name', nameField: true },
    { key: 'مدين', label: isRTL ? 'مدين' : 'Debt', nameField: false },
    { key: 'مسدد', label: isRTL ? 'مسدد' : 'Paid', nameField: false },
    { key: 'الرصيد', label: isRTL ? 'الرصيد' : 'Balance', nameField: false },
    { key: 'ملاحظات', label: isRTL ? 'ملاحظات' : 'Notes', nameField: false }
  ];

  const MANAGER_FIELDS = [
    { key: 'اسم الدخول', label: isRTL ? 'اسم الدخول' : 'Username', nameField: true },
    { key: 'الاسم الاول', label: isRTL ? 'الاسم الاول' : 'First Name', nameField: true },
    { key: 'الاسم الثاني', label: isRTL ? 'الاسم الثاني' : 'Last Name', nameField: true },
    { key: 'الصلاحية', label: isRTL ? 'الصلاحية' : 'Role', nameField: false },
    { key: 'الرصيد', label: isRTL ? 'الرصيد' : 'Balance', nameField: false },
    { key: 'القروض', label: isRTL ? 'القروض' : 'Loans', nameField: false },
    { key: 'تابع لـ', label: isRTL ? 'تابع لـ' : 'Parent', nameField: false },
    { key: 'المجموعة', label: isRTL ? 'المجموعة' : 'Group', nameField: false },
    { key: 'عدد المشتركين', label: isRTL ? 'عدد المشتركين' : 'Subscribers', nameField: false },
    { key: 'النقاط', label: isRTL ? 'النقاط' : 'Points', nameField: false },
    { key: 'نسبة الخصم', label: isRTL ? 'نسبة الخصم' : 'Discount', nameField: false },
    { key: 'تاريخ الانشاء', label: isRTL ? 'تاريخ الانشاء' : 'Created At', nameField: false },
    { key: 'المدينة', label: isRTL ? 'المدينة' : 'City', nameField: false }
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SUBSCRIBER_COLUMNS.forEach(col => initial[col.id] = col.defaultVisible);
    return initial;
  });

  // ─── LIVE DATA FROM API ─────────────────────────────────────────────────────
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  // Directors, Deputies, IPTV — Now live via API
  const [directors, setDirectors] = useState<any[]>([]);
  const [deputies, setDeputies] = useState<any[]>([]);
  const [iptvSubscribers, setIptvSubscribers] = useState<any[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [lastStatusUpdate, setLastStatusUpdate] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // Default 30s
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [failedRouters, setFailedRouters] = useState<string[]>([]);
  const [onlineNamesList, setOnlineNamesList] = useState<string[]>([]);
  const [routerDiagnostics, setRouterDiagnostics] = useState<Record<string, any>>({});
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [debugSearchTerm, setDebugSearchTerm] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState<Record<string, boolean>>({});
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendingSub, setExtendingSub] = useState<any>(null);
  const [extensionTarget, setExtensionTarget] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<{unit: 'hours' | 'days', value: number} | null>(null);

  // Messaging System
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messagingSub, setMessagingSub] = useState<any>(null);
  const [messageTypes, setMessageTypes] = useState<Set<string>>(new Set(['whatsapp']));
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const getActions = (item: any): MenuAction[] => {
    const actions: MenuAction[] = [];
    
    // Check main edit permission
    const canManageTabs = 
      (activeSubTab === 'subscribers' && hasPermission('manage_subscribers')) ||
      (activeSubTab === 'iptv' && hasPermission('manage_iptv')) ||
      (activeSubTab === 'suppliers' && hasPermission('manage_suppliers')) ||
      (activeSubTab === 'shareholders' && hasPermission('manage_shareholders')) ||
      (activeSubTab === 'directors' && hasPermission('manage_directors')) ||
      (activeSubTab === 'deputies' && hasPermission('manage_deputies')) ||
      (activeSubTab === 'admins' && hasPermission('manage_admins'));

    if (!canManageTabs) return [];

    // Common Actions
    actions.push({
      id: 'edit',
      label: isRTL ? 'تعديل البيانات' : 'Edit CRM Details',
      icon: Edit,
      onClick: (item) => handleEdit(item),
      tooltip: isRTL ? 'تعديل بيانات المشترك والملف الشخصي' : 'Modify subscriber CRM data and profile information.'
    });

    if (activeSubTab === 'subscribers') {
      actions.push(
        {
          id: 'activate',
          label: isRTL ? 'تفعيل الاشتراك' : 'Smart Activate',
          icon: Zap,
          variant: 'success',
          onClick: (item) => {
            setSubToActivate(item);
            setActivationTarget('all');
            setIsActivateModalOpen(true);
            // Ensure routers are loaded for the dropdown
            if (routersList.length === 0) openSyncModal(null); 
          },
          tooltip: isRTL ? 'تفعيل الاشتراك وحساب تاريخ الانتهاء تلقائياً' : 'Calculate expiry and activate based on profile duration.'
        },
        {
          id: 'extend',
          label: isRTL ? 'تمديد الصلاحية' : 'Extend Service',
          icon: Calendar,
          variant: 'warning',
          onClick: async (item) => {
            setExtendingSub(item);
            setExtensionTarget('all');
            setSelectedDuration(null);
            // Pre-fetch routers for extension modal
            const routers = await fetchRoutersList();
            setRoutersList(routers || []);
            setIsExtendModalOpen(true);
          },
          tooltip: isRTL ? 'تمديد الخدمة لساعات أو أيام إضافية' : 'Grant extra hours or days until payment.'
        },
        {
          id: 'sync',
          label: isRTL ? 'مزامنة للاشتراك' : 'Sync to MikroTik',
          icon: RefreshCw,
          onClick: (item) => openSyncModal(item),
          tooltip: isRTL ? 'تحديث بيانات المشترك على أجهزة الميكروتيك' : 'Push current CRM settings to MikroTik routers.'
        },
        {
          id: 'disconnect',
          label: isRTL ? 'طرد (قطع الاتصال)' : 'Force Disconnect',
          icon: Power,
          variant: 'danger',
          onClick: (item) => handleDisconnect(item.username),
          tooltip: isRTL ? 'قطع اتصال المستخدم الحالي من المايكروتيك' : 'Forcefully remove the active session from MikroTik.'
        },
        {
          id: 'disable',
          label: isRTL ? 'تعطيل الحساب' : 'Disable on Router',
          icon: Lock,
          variant: 'warning',
          onClick: (item) => handleDisableSecret(item.username),
          tooltip: isRTL ? 'إيقاف الحساب مؤقتاً في المايكروتيك' : 'Suspend the account credentials on the router.'
        },
        {
          id: 'enable',
          label: isRTL ? 'تفعيل الحساب' : 'Enable on Router',
          icon: Unlock,
          variant: 'success',
          onClick: (item) => handleEnableSecret(item.username),
          tooltip: isRTL ? 'إعادة تفعيل الحساب في المايكروتيك' : 'Restore access credentials on the router.'
        },
        {
          id: 'delete-secret',
          label: isRTL ? 'حذف من المايكروتيك' : 'Delete from Router',
          icon: ShieldOff,
          variant: 'danger',
          onClick: (item) => handleDeleteSecret(item.username),
          tooltip: isRTL ? 'حذف بيانات تسجيل الدخول من المايكروتيك فقط' : 'Remove only the credentials from MikroTik, keeping CRM data.'
        },
        {
          id: 'send-message',
          label: isRTL ? 'إرسال رسالة (واتساب/رسالة/بريد)' : 'Send Notification (WA/SMS/Email)',
          icon: Send,
          variant: 'warning',
          onClick: (item) => {
            setMessagingSub(item);
            setMessageText('');
            setSelectedTemplate('');
            setIsMessageModalOpen(true);
            loadMsgTemplates();
          },
          tooltip: isRTL ? 'إرسال إشعار تذكيري للمشترك عبر القنوات المفضلة' : 'Notify the user via WhatsApp, SMS, or Email manually.'
        }
      );
    }
    
    // Global Delete
    actions.push({
      id: 'delete',
      label: isRTL ? 'حذف نهائي' : 'Delete (Full)',
      icon: Trash,
      variant: 'danger',
      onClick: (item) => handleDelete(item.id),
      tooltip: isRTL ? 'حذف المستخدم نهائياً من قاعدة البيانات' : 'Permanently remove the entity from the system.'
    });

    return actions;
  };
  
  // Close menu on click outside
  React.useEffect(() => {
    const handleClick = () => setOpenActionMenuId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  // ─── UNIFIED DATA FETCH (runs on sub-tab switch) ──────────────────────────────
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        if (activeSubTab === 'subscribers') {
          const subs = await fetchSubscribers();
          if (subs && subs.length > 0) setSubscribers(subs);
          else setApiError('القائمة فارغة أو يبدو أن الخادم لم يعثر على بيانات.');
        } else if (activeSubTab === 'suppliers') {
          const data = await fetchSuppliers();
          if (data && data.length > 0) setSuppliers(data);
          else setApiError('لم يتم العثور على موردين في قاعدة البيانات.');
        } else if (activeSubTab === 'shareholders') {
          const data = await fetchInvestors();
          if (data && data.length > 0) setShareholders(data);
          else setApiError('لم يتم العثور على مساهمين في قاعدة البيانات.');
        } else if (activeSubTab === 'admins') {
          const data = await fetchManagersRaw();
          if (data && data.length > 0) setManagers(data);
          else setApiError('لم يتم العثور على مدراء في قاعدة البيانات.');
        } else if (activeSubTab === 'directors') {
          const data = await directorsApi.fetch();
          if (data && data.length > 0) setDirectors(data);
          else setApiError('لم يتم العثور على أفراد الإدارة.');
        } else if (activeSubTab === 'deputies') {
          const data = await deputiesApi.fetch();
          if (data && data.length > 0) {
             setDeputies(data.map((d: any) => ({ ...d, name: d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() })));
          }
          else setApiError('لم يتم العثور على نواب.');
        } else if (activeSubTab === 'iptv') {
          const data = await iptvApi.fetch();
          if (data && data.length > 0) setIptvSubscribers(data);
          else setApiError('لم يتم العثور على اشتراكات IPTV.');
        }
      } catch (err: any) {
        console.error('Failed to load data', err);
        setApiError('فشل الاتصال بالخادم. يرجى التأكد من تشغيل npm run api');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeSubTab]);

  // ─── AUTOMATIC ONLINE STATUS POLLING ─────────────────────────────────────────
  const pollStatus = async (manual = false) => {
    if (activeSubTab === 'subscribers' && subscribers.length > 0) {
      if (manual) setIsStatusLoading(true);
      try {
        const result = await getMikrotikStatusBatch();
        if (result && result.onlineUsers) {
          const newStatuses: Record<string, boolean> = {};
          
          // Normalize found users for easier matching
          const onlineSet = new Set(result.onlineUsers.map((u: string) => String(u).trim().toLowerCase()));
          
          subscribers.forEach(s => {
            const rawUname = s.username || s['اسم المستخدم'] || '';
            const unameClean = String(rawUname).trim().toLowerCase();
            
            // Map the status to BOTH the original username and the cleaned version if they differ
            if (rawUname) {
              const isOnline = onlineSet.has(unameClean);
              newStatuses[rawUname] = isOnline;
              if (rawUname !== unameClean) {
                newStatuses[unameClean] = isOnline;
              }
            }
          });
          
          setOnlineStatuses(newStatuses);
          setLastStatusUpdate(new Date().toLocaleTimeString());
          setFailedRouters(result.failedRouters || []);
          setOnlineNamesList(result.onlineUsers || []);
          setRouterDiagnostics(result.resultsPerRouter || {});
        }
      } catch (err) {
        console.error('Failed to poll status batch', err);
      } finally {
        if (manual) setIsStatusLoading(false);
      }
    }
  };

  React.useEffect(() => {
    let interval: any;

    if (activeSubTab === 'subscribers' && refreshInterval > 0) {
      // Initial poll
      pollStatus();
      // Regular interval
      interval = setInterval(() => pollStatus(), refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSubTab, refreshInterval, subscribers.length]);

  const handleDisconnect = async (username: string) => {
    if (!username) return;
    if (!window.confirm(isRTL ? `هل أنت متأكد من قطع اتصال المشترك ${username}؟ سيؤدي ذلك لإعادة اتصاله من جديد.` : `Are you sure you want to disconnect ${username}? This will force them to reconnect.`)) return;

    setIsDisconnecting(prev => ({ ...prev, [username]: true }));
    try {
      const result = await disconnectSubscriber(username);
      if (result && result.itemsRemoved > 0) {
        // Immediate poll to update status
        setTimeout(() => pollStatus(false), 2000); // Wait 2s for router to clear
      } else {
        alert(isRTL ? 'لم يتم العثور على جلسة نشطة لهذا المشترك.' : result.message);
      }
    } catch (err) {
      console.error('Disconnect failed', err);
    } finally {
      setIsDisconnecting(prev => ({ ...prev, [username]: false }));
    }
  };

  const handleDeleteSecret = async (username: string) => {
    if (!username) return;
    if (!window.confirm(isRTL ? `هل أنت متأكد من حذف حساب المشترك ${username} من المايكروتيك فقط؟ (سيبقى في النظام)` : `Delete ${username} from MikroTik only? (Will stay in CRM)`)) return;
    
    setIsStatusLoading(true);
    try {
      const res = await deleteSecret(username);
      alert(isRTL ? `تم حذف ${res.itemsRemoved} سيكريت.` : `Deleted ${res.itemsRemoved} secret(s).`);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
    finally { setIsStatusLoading(false); }
  };

  const handleDisableSecret = async (username: string) => {
    setIsStatusLoading(true);
    try {
      await disableSecret(username);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
    finally { setIsStatusLoading(false); }
  };

  const handleEnableSecret = async (username: string) => {
    setIsStatusLoading(true);
    try {
      await enableSecret(username);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) { console.error(err); }
    finally { setIsStatusLoading(false);    }
  };

  const handleActivateSubscriber = async () => {
    if (!subToActivate) return;
    setIsActivating(true);
    try {
      const data = await activateSubscriber(subToActivate.id, activationOption, activationTarget);
      if (data.success) {
        alert(data.message || (isRTL ? `تم تفعيل المشترك بنجاح حتى: ${data.displayExpiry}` : `Activated successfully until: ${data.displayExpiry}`));
        setIsActivateModalOpen(false);
        window.location.reload(); 
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleDisconnectAll = async () => {
    const confirm1 = window.confirm(isRTL 
      ? 'هل أنت متأكد من قطع الاتصال عن جميع المشتركين النشطين حالياً؟' 
      : 'Are you sure you want to disconnect ALL currently active subscribers?');
    if (!confirm1) return;

    const confirm2 = window.confirm(isRTL 
      ? 'تحذير: هذا الإجراء سيقطع الإنترنت عن الجميع مؤقتاً. هل تود المتابعة؟' 
      : 'WARNING: This will disconnect everyone temporarily. Do you want to proceed?');
    if (!confirm2) return;

    setIsStatusLoading(true);
    try {
      const result = await disconnectAllSubscribers();
      alert(isRTL ? `تم تنفيذ العملية. تم طرد ${result.itemsRemoved} جلسة.` : `Operation complete. ${result.itemsRemoved} sessions disconnected.`);
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) {
      console.error('Bulk disconnect failed', err);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const checkLiveStatus = async (username: string) => {
    if (!username) return;
    const status = await getMikrotikStatus(username);
    if (status) {
      setOnlineStatuses(prev => ({ ...prev, [username]: status.online }));
    }
  };

  const openSyncModal = async (item: any) => {
    setSyncingSubscriber(item);
    setSyncTarget('all');
    setSyncResult(null);
    setIsSyncModalOpen(true);
    // Load routers list
    const routers = await fetchRoutersList();
    setRoutersList(routers);
  };

  const handleSyncSubscriber = async () => {
    if (!syncingSubscriber) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncSubscriberToMikrotik(syncingSubscriber.id, syncTarget);
      setSyncResult({ success: true, message: res.message, details: res.data });
    } catch (err: any) {
      // err.details contains per-router error breakdown from the server
      setSyncResult({
        success: false,
        message: err.message || (isRTL ? 'فشلت المزامنة' : 'Sync failed'),
        details: err.details || []
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadMsgTemplates = async () => {
    try {
      const data = await getMessageData();
      setTemplates(data.templates || []);
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async () => {
    if (!messagingSub || !messageText.trim()) return;
    if (messageTypes.size === 0) {
      alert(isRTL ? 'يجب تفعيل قناة إرسال واحدة على الأقل' : 'Please enable at least one gateway');
      return;
    }

    setIsSendingMessage(true);
    const mobileTargets = messagingSub.phone ? [messagingSub.phone] : [];
    const emailTargets = messagingSub.email ? [messagingSub.email] : [];
    const promises = [];

    if (messageTypes.has('whatsapp') && mobileTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(r => r.json()).catch(e => ({ error: e.message }))
      );
    }

    if (messageTypes.has('sms') && mobileTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(r => r.json()).catch(e => ({ error: e.message }))
      );
    }

    if (messageTypes.has('email') && emailTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailTargets, text: messageText, subject: isRTL ? 'إشعار من نت لينك (NetLink)' : 'Notification from NetLink' })
        }).then(r => r.json()).catch(e => ({ error: e.message }))
      );
    }

    try {
      await Promise.all(promises);
      alert(isRTL ? 'تم إرسال الرسالة بنجاح عبر القنوات المحددة' : 'Message dispatched successfully');
      setIsMessageModalOpen(false);
    } catch (e) {
      alert(isRTL ? 'حدث خطأ أثناء الإرسال' : 'Error sending message');
    } finally {
      setIsSendingMessage(false);
    }
  };


  const admins = managers;
  const buildEmptyFromFields = (fields: { key: string }[]) => {
    const result: Record<string, any> = {};
    fields.forEach(field => {
      result[field.key] = '';
    });
    return result;
  };

  const handleEdit = (item: any) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
    if (activeSubTab === 'subscribers') loadNetworkProfiles();
  };

  const handleAdd = () => {
    let item: any = { id: `${activeSubTab.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}` };
    if (activeSubTab === 'subscribers') {
      item = { ...item, name: '', plan: '', status: 'active', expiry: new Date().toISOString().split('T')[0], balance: 0 };
      loadNetworkProfiles();
    } else if (activeSubTab === 'suppliers') {
      item = { ...item, ...buildEmptyFromFields(SUPPLIER_FIELDS) };
    } else if (activeSubTab === 'shareholders') {
      item = { ...item, name: '', shares: 0, ownership: '0%', status: 'active', joinDate: new Date().toISOString().split('T')[0], investment: 0, dividends: 0 };
    } else if (activeSubTab === 'directors') {
      item = { ...item, name: '', email: '', username: '', password: '', role: 'super_admin', status: 'active', permissions: 'all' };
    } else if (activeSubTab === 'deputies') {
      item = { ...item, firstName: '', lastName: '', address: '', idNumber: '', position: 'فني صيانة ميداني', department: 'الدعم الفني', phone: '', hireDate: new Date().toISOString().split('T')[0], salary: 0, assignedZone: '', status: 'active' };
    } else if (activeSubTab === 'admins') {
      item = { ...item, ...buildEmptyFromFields(MANAGER_FIELDS) };
    } else if (activeSubTab === 'iptv') {
      item = { ...item, name: '', phone: '', host: 'iptv.netlink.ai', username: '', password: '', status: 'active', expiry: new Date().toISOString().split('T')[0], price: 0, platform: '', notes: '', channelNumber: '' };
    }
    setNewItem(item);
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (activeSubTab === 'subscribers') {
      try {
        setIsLoading(true);
        await addSubscriber(newItem);
        const data = await fetchSubscribers();
        setSubscribers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة المشترك' : 'Failed to add subscriber');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'suppliers') {
      try {
        setIsLoading(true);
        await addSupplier(newItem);
        const data = await fetchSuppliers();
        setSuppliers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة المورد' : 'Failed to add supplier');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'shareholders') {
      try {
        setIsLoading(true);
        await addInvestor(newItem);
        const data = await fetchInvestors();
        if (data) setShareholders(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة المساهم' : 'Failed to add shareholder');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'directors') {
      try { setIsLoading(true); await directorsApi.add(newItem); const data = await directorsApi.fetch(); if(data) setDirectors(data); } catch(err) { setApiError('Failed to add director'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'deputies') {
      try { setIsLoading(true); await deputiesApi.add(newItem); const data = await deputiesApi.fetch(); if(data) setDeputies(data); } catch(err) { setApiError('Failed to add deputy'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'admins') {
      try {
        setIsLoading(true);
        await addManager(newItem);
        const data = await fetchManagersRaw();
        setManagers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة المدير' : 'Failed to add manager');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'iptv') {
      try { setIsLoading(true); await iptvApi.add(newItem); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError('Failed to add IPTV sub'); } finally { setIsLoading(false); }
    }
    setIsAddModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this?')) {
      if (activeSubTab === 'subscribers') {
        try {
          setIsLoading(true);
          await deleteSubscriber(id);
          const data = await fetchSubscribers();
          setSubscribers(data);
        } catch (err) {
          setApiError(isRTL ? 'فشل حذف المشترك' : 'Failed to delete subscriber');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'suppliers') {
        try {
          setIsLoading(true);
          await deleteSupplier(id);
          const data = await fetchSuppliers();
          setSuppliers(data);
        } catch (err) {
          setApiError(isRTL ? 'فشل حذف المورد' : 'Failed to delete supplier');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'shareholders') {
        try {
          setIsLoading(true);
          await deleteInvestor(id);
          const data = await fetchInvestors();
          if (data) setShareholders(data);
        } catch (err) {
          setApiError(isRTL ? 'فشل حذف المساهم' : 'Failed to delete shareholder');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'directors') {
        try { setIsLoading(true); await directorsApi.remove(id); const data = await directorsApi.fetch(); if(data) setDirectors(data); } catch(err) { setApiError('Failed to delete director'); } finally { setIsLoading(false); }
      } else if (activeSubTab === 'deputies') {
        try { setIsLoading(true); await deputiesApi.remove(id); const data = await deputiesApi.fetch(); if(data) setDeputies(data); } catch(err) { setApiError('Failed to delete deputy'); } finally { setIsLoading(false); }
      } else if (activeSubTab === 'admins') {
        try {
          setIsLoading(true);
          await deleteManager(id);
          const data = await fetchManagersRaw();
          setManagers(data);
        } catch (err) {
          setApiError(isRTL ? 'فشل حذف المدير' : 'Failed to delete manager');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'iptv') {
        try { setIsLoading(true); await iptvApi.remove(id); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError('Failed to delete IPTV sub'); } finally { setIsLoading(false); }
      }
    }
  };

  const handleExtendSubscriber = async (duration: { unit: 'hours' | 'days', value: number }) => {
    if (!extendingSub) return;
    try {
      setIsLoading(true);
      await extendSubscriber(extendingSub.id, duration, extensionTarget);
      const data = await fetchSubscribers();
      setSubscribers(data);
      setIsExtendModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setApiError(isRTL ? 'فشل تمديد الصلاحية' : 'Failed to extend service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (activeSubTab === 'subscribers') {
      try {
        setIsLoading(true);
        await updateSubscriber(editingItem.id, editingItem);
        const data = await fetchSubscribers();
        setSubscribers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل تعديل المشترك' : 'Failed to replace subscriber');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'suppliers') {
      try {
        setIsLoading(true);
        await updateSupplier(editingItem.id, editingItem);
        const data = await fetchSuppliers();
        setSuppliers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل تعديل المورد' : 'Failed to update supplier');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'shareholders') {
      try {
        setIsLoading(true);
        await updateInvestor(editingItem.id, editingItem);
        const data = await fetchInvestors();
        if (data) setShareholders(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل تعديل المساهم' : 'Failed to replace shareholder');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'directors') {
      try { setIsLoading(true); await directorsApi.update(editingItem.id, editingItem); const data = await directorsApi.fetch(); if(data) setDirectors(data); } catch(err) { setApiError('Failed to update director'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'deputies') {
      try { setIsLoading(true); await deputiesApi.update(editingItem.id, editingItem); const data = await deputiesApi.fetch(); if(data) setDeputies(data); } catch(err) { setApiError('Failed to update deputy'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'admins') {
      try {
        setIsLoading(true);
        await updateManager(editingItem.id, editingItem);
        const data = await fetchManagersRaw();
        setManagers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل تعديل المدير' : 'Failed to update manager');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'iptv') {
      try { setIsLoading(true); await iptvApi.update(editingItem.id, editingItem); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError('Failed to update IPTV sub'); } finally { setIsLoading(false); }
    }
    
    setIsEditModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredData = () => {
    let data: any[] = [];
    if (activeSubTab === 'subscribers') {
      data = subscribers.filter(s => smartMatch(searchTerm, s.name) || smartMatch(searchTerm, String(s.id)));
      if (statusFilter !== 'all') {
        data = data.filter(s => s.status === statusFilter);
      }
    } else if (activeSubTab === 'suppliers') {
      data = suppliers.filter((s: any) => {
        const values = SUPPLIER_FIELDS.map(f => String(s[f.key] || '')).join(' ');
        return smartMatch(searchTerm, values) || smartMatch(searchTerm, String(s.id));
      });
    } else if (activeSubTab === 'shareholders') {
      data = shareholders.filter(s => smartMatch(searchTerm, s.name) || smartMatch(searchTerm, String(s.id)));
    } else if (activeSubTab === 'directors') {
      data = directors.filter(s => smartMatch(searchTerm, s.name) || smartMatch(searchTerm, s.position));
    } else if (activeSubTab === 'deputies') {
      data = deputies.filter(s => smartMatch(searchTerm, s.name) || smartMatch(searchTerm, s.position));
    } else if (activeSubTab === 'iptv') {
      data = iptvSubscribers.filter(s => smartMatch(searchTerm, s.name) || smartMatch(searchTerm, s.username));
    } else {
      data = admins.filter((a: any) => {
        const values = MANAGER_FIELDS.map(f => String(a[f.key] || '')).join(' ');
        return smartMatch(searchTerm, values) || smartMatch(searchTerm, String(a.id));
      });
    }
    return data;
  };

  return (
    <motion.div 
      key="management" 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.98 }} 
      className="flex-1 flex flex-col min-h-0 space-y-6"
    >
      <header className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldCheck className="text-teal-500" size={32} />
            {t.management.title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.management.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={t.search.placeholder}
              className="w-full bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 bg-white dark:bg-[#09090B] border rounded-xl transition-colors ${showFilters ? 'border-teal-500 text-teal-500' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-500'}`}
          >
            <Filter size={20} />
          </button>
        </div>
      </header>

      {/* Filters Panel - Only show relevant filters per tab */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-4">
              
              {/* Dynamic Columns Configuration for Subscribers */}
              {activeSubTab === 'subscribers' && (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isRTL ? 'الأعمدة المرئية:' : 'Visible Columns:'}
                    </h4>
                    <div className="flex gap-3 text-xs">
                      <button 
                        onClick={() => setVisibleColumns(SUBSCRIBER_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}))}
                        className="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-bold transition-colors"
                      >
                        {isRTL ? 'تحديد الكل' : 'Select All'}
                      </button>
                      <button 
                        onClick={() => setVisibleColumns(SUBSCRIBER_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: false }), {}))}
                        className="text-rose-600 hover:text-rose-700 font-bold transition-colors"
                      >
                        {isRTL ? 'إلغاء الكل' : 'Clear All'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {SUBSCRIBER_COLUMNS.map(col => (
                      <label key={col.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[col.id] || false} 
                          onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.id]: e.target.checked })} 
                          className="rounded text-teal-500 focus:ring-teal-500 w-4 h-4 bg-white dark:bg-[#09090B] border-slate-300 dark:border-slate-700" 
                        />
                        <span className="truncate" title={col.label}>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggles for other tabs - ONLY render if not subscribers */}
              {activeSubTab !== 'subscribers' && (
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-teal-500 focus:ring-teal-500" />
                      {isRTL ? 'إظهار الاسم' : 'Show Name'}
                    </label>
                  </div>
                  {activeSubTab === 'iptv' && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={showChannel} onChange={(e) => setShowChannel(e.target.checked)} className="rounded text-teal-500 focus:ring-teal-500" />
                        {isRTL ? 'إظهار رقم القناة' : 'Show Channel Number'}
                      </label>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-Tabs Navigation */}
      <div className="flex overflow-x-auto custom-scrollbar gap-2 p-1 bg-slate-100 dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-slate-800 w-full shrink-0">
        {hasPermission('view_subscribers') && (
          <button 
            onClick={() => setActiveSubTab('subscribers')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'subscribers' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Users size={18} />
            {t.management.tabs.subscribers}
          </button>
        )}
        {hasPermission('view_iptv') && (
          <button 
            onClick={() => setActiveSubTab('iptv')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'iptv' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <PieChart size={18} />
            {t.management.tabs.iptv}
          </button>
        )}
        {hasPermission('view_suppliers') && (
          <button 
            onClick={() => setActiveSubTab('suppliers')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'suppliers' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Truck size={18} />
            {t.management.tabs.suppliers}
          </button>
        )}
        {hasPermission('view_shareholders') && (
          <button 
            onClick={() => setActiveSubTab('shareholders')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'shareholders' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <PieChart size={18} />
            {t.management.tabs.shareholders}
          </button>
        )}
        {hasPermission('view_directors') && (
          <button 
            onClick={() => setActiveSubTab('directors')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'directors' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Briefcase size={18} />
            {t.management.tabs.directors}
          </button>
        )}
        {hasPermission('view_deputies') && (
          <button 
            onClick={() => setActiveSubTab('deputies')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'deputies' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <UserCog size={18} />
            {t.management.tabs.deputies}
          </button>
        )}
        {hasPermission('view_admins') && (
          <button 
            onClick={() => setActiveSubTab('admins')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'admins' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <ShieldCheck size={18} />
            {t.management.tabs.admins}
          </button>
        )}
      </div>

      {/* Main List Area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {activeSubTab === 'subscribers' && t.management.subscribers.title}
            {activeSubTab === 'iptv' && t.management.iptv.title}
            {activeSubTab === 'suppliers' && t.management.suppliers.title}
            {activeSubTab === 'shareholders' && t.management.tabs.shareholders}
            {activeSubTab === 'directors' && t.management.tabs.directors}
            {activeSubTab === 'deputies' && t.management.tabs.deputies}
            {activeSubTab === 'admins' && t.management.admins.title}
          </h3>
          {(activeSubTab === 'subscribers' && hasPermission('manage_subscribers')) ||
           (activeSubTab === 'iptv' && hasPermission('manage_iptv')) ||
           (activeSubTab === 'suppliers' && hasPermission('manage_suppliers')) ||
           (activeSubTab === 'shareholders' && hasPermission('manage_shareholders')) ||
           (activeSubTab === 'directors' && hasPermission('manage_directors')) ||
           (activeSubTab === 'deputies' && hasPermission('manage_deputies')) ||
           (activeSubTab === 'admins' && hasPermission('manage_admins')) ? (
            <div className="flex items-center gap-2">
              {activeSubTab === 'subscribers' && (
                <button
                  onClick={handleDisconnectAll}
                  disabled={isStatusLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-xl transition-all font-bold text-sm"
                  title={isRTL ? 'طرد جميع المشتركين المتصلين' : 'Disconnect all active subscribers'}
                >
                  <Power size={18} />
                  <span>{isRTL ? 'طرد الجميع' : 'Disconnect All'}</span>
                </button>
              )}
              <button 
                onClick={handleAdd}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
              >
                <Plus size={16} />
                {activeSubTab === 'subscribers' && t.management.subscribers.add}
                {activeSubTab === 'iptv' && t.management.iptv.add}
                {activeSubTab === 'suppliers' && t.management.suppliers.add}
                {activeSubTab === 'shareholders' && (isRTL ? 'إضافة مساهم' : 'Add Shareholder')}
                {activeSubTab === 'directors' && (isRTL ? 'إضافة مدير' : 'Add Director')}
                {activeSubTab === 'deputies' && (isRTL ? 'إضافة نائب' : 'Add Deputy')}
                {activeSubTab === 'admins' && t.management.admins.add}
              </button>
            </div>
          ) : null}
        </div>

        {apiError && (
          <div className="mx-4 mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-3 font-bold">
            <AlertCircle size={20} />
            {apiError}
          </div>
        )}

        {isLoading && (
          <div className="mx-4 mt-4 p-4 text-slate-500 flex items-center justify-center gap-3 font-bold">
            جاري جلب البيانات من الخادم...
          </div>
        )}

        {/* ─── LIVE STATUS CONTROLS (Only for Subscribers) ─── */}
        {activeSubTab === 'subscribers' && subscribers.length > 0 && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-slate-50 to-white dark:from-[#111114] dark:to-[#09090B] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Manual Refresh Button */}
              <button 
                onClick={() => pollStatus(true)}
                disabled={isStatusLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isStatusLoading 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                  : 'bg-white dark:bg-[#18181B] text-teal-600 dark:text-teal-400 border border-teal-500/20 hover:border-teal-500/50 hover:bg-teal-50 dark:hover:bg-teal-500/5'
                }`}
              >
                <RefreshCw size={14} className={isStatusLoading ? 'animate-spin' : ''} />
                {isRTL ? 'تحديث الحالة الآن' : 'Refresh Status Now'}
              </button>

              {/* Interval Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                  {isRTL ? 'سرعة التحديث:' : 'Refresh Rate:'}
                </span>
                <select 
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value={0}>{isRTL ? 'يدوي فقط' : 'Manual Only'}</option>
                  <option value={5000}>{isRTL ? 'كل 5 ثوانٍ' : 'Every 5s'}</option>
                  <option value={15000}>{isRTL ? 'كل 15 ثانية' : 'Every 15s'}</option>
                  <option value={30000}>{isRTL ? 'كل 30 ثانية' : 'Every 30s'}</option>
                  <option value={60000}>{isRTL ? 'كل دقيقة' : 'Every 1m'}</option>
                  <option value={300000}>{isRTL ? 'كل 5 دقائق' : 'Every 5m'}</option>
                </select>
              </div>
            </div>

            {/* Last Update Info */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <div className={`w-1.5 h-1.5 rounded-full ${isStatusLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {isRTL ? 'آخر تحديث للحالة:' : 'Last Status Check:'}
              </span>
              <span className="text-[10px] font-mono font-black text-slate-700 dark:text-slate-200">
                {lastStatusUpdate || (isRTL ? 'لم يتم بعد' : 'Never')}
              </span>
            </div>

            {/* Debug Button */}
            {activeSubTab === 'subscribers' && (
              <button 
                onClick={() => setIsDebugModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-900 transition-all text-[10px] font-bold"
              >
                <Search size={12} />
                {isRTL ? 'عرض الأسماء المكتشفة' : 'Show Found Names'}
              </button>
            )}
          </div>
        )}

        {/* Failed Routers Warning */}
        {activeSubTab === 'subscribers' && failedRouters.length > 0 && (
          <div className="mx-4 mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertCircle size={18} className="shrink-0" />
            <div className="text-xs font-bold">
              {isRTL 
                ? `تنبيه: فشل الاتصال بـ ${failedRouters.length} من أجهزة المايكروتيك (${failedRouters.join(', ')}). قد تكون حالة بعض المشتركين غير دقيقة.`
                : `Warning: Failed to connect to ${failedRouters.length} router(s) (${failedRouters.join(', ')}). Some statuses may be inaccurate.`
              }
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#09090B] z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {activeSubTab === 'subscribers' && (
                  <>
                    {SUBSCRIBER_COLUMNS.map(col => visibleColumns[col.id] && (
                      <th key={col.id} className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{col.label}</th>
                    ))}
                  </>
                )}
                {activeSubTab === 'suppliers' && (
                  <>
                    {SUPPLIER_FIELDS.filter(field => showName || !field.nameField).map(field => (
                      <th key={field.key} className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{field.label}</th>
                    ))}
                  </>
                )}
                {activeSubTab === 'shareholders' && (
                  <>
                    {showName && <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.subscribers.table.name}</th>}
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'الأسهم' : 'Shares'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'نسبة الملكية' : 'Ownership %'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'الأرباح المستلمة' : 'Dividends Paid'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'تاريخ الانضمام' : 'Join Date'}</th>
                  </>
                )}
                {activeSubTab === 'directors' && (
                  <>
                    {showName && <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.subscribers.table.name}</th>}
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'إسم المستخدم' : 'Username'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'الصلاحية (الرتبة)' : 'Role'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.subscribers.table.status}</th>
                  </>
                )}
                {activeSubTab === 'deputies' && (
                  <>
                    {showName && <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.subscribers.table.name}</th>}
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'المنصب والقسم' : 'Position / Dept'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'رقم الهاتف' : 'Phone'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'المنطقة' : 'Zone'}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.subscribers.table.status}</th>
                  </>
                )}
                {activeSubTab === 'admins' && (
                  <>
                    {MANAGER_FIELDS.filter(field => showName || !field.nameField).map(field => (
                      <th key={field.key} className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{field.label}</th>
                    ))}
                  </>
                )}
                {activeSubTab === 'iptv' && (
                  <>
                    {showName && <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.name}</th>}
                    {showChannel && <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'رقم القناة' : 'Channel Number'}</th>}
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.phone}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.provider}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.username}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.expiry}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.price}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.management.iptv.table.status}</th>
                    <th className="px-6 py-5 text-sm font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</th>
                  </>
                )}
                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData().map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  {activeSubTab === 'subscribers' && (
                    <>
                      {SUBSCRIBER_COLUMNS.map(col => {
                        if (!visibleColumns[col.id]) return null;
                        switch (col.id) {
                          case 'id': return <td key={col.id} className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400 font-mono">{item.id || item.username || '-'}</td>;
                          case 'firstname': return <td key={col.id} className="px-6 py-6 text-base font-bold text-slate-800 dark:text-slate-200">{item.firstname || item.name || '-'}</td>;
                          case 'lastname': return <td key={col.id} className="px-6 py-6 text-base font-bold text-slate-800 dark:text-slate-200">{item.lastname || ''}</td>;
                          case 'username': return <td key={col.id} className="px-6 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">{item.username || ''}</td>;
                          case 'phone': return <td key={col.id} className="px-6 py-6 text-sm font-mono text-slate-600 dark:text-slate-400">{item.phone || item['رقم الموبايل'] || '-'}</td>;
                          case 'idNumber': return <td key={col.id} className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400 font-mono">{item.idNumber || item['رقم الهوية'] || '-'}</td>;
                          case 'password': return <td key={col.id} className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400 font-mono">{item.password || item['كلمة المرور'] || '-'}</td>;
                          case 'status': return (
                            <td key={col.id} className="px-6 py-6">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                item.status === 'active' || item['حالة الحساب'] === 'مفعل' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                              }`}>
                                {t.management.subscribers.statuses[item.status] || item['حالة الحساب'] || item.status}
                              </span>
                            </td>
                          );
                          case 'plan': return <td key={col.id} className="px-6 py-6 text-base font-medium text-slate-600 dark:text-slate-400">{item.plan || item['سرعة الخط'] || '-'}</td>;
                          case 'balance': return <td key={col.id} className="px-6 py-6 text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(parseFloat(item.balance || item['الرصيد المتبقي له'] || 0), state.currency, state.lang)}</td>;
                          case 'debt': return <td key={col.id} className="px-6 py-6 text-base font-bold text-rose-600 dark:text-rose-400">{formatCurrency(parseFloat(item['عليه دين'] || 0), state.currency, state.lang)}</td>;
                          case 'paid': return <td key={col.id} className="px-6 py-6 text-base font-bold text-teal-600 dark:text-teal-400">{formatCurrency(parseFloat(item['قام بتسديد'] || 0), state.currency, state.lang)}</td>;
                          case 'bill': return <td key={col.id} className="px-6 py-6 text-sm font-medium text-slate-600 dark:text-slate-400">{item['قيمة الفاتورة'] || '-'}</td>;
                          case 'agent': return <td key={col.id} className="px-6 py-6 text-sm font-medium text-slate-700 dark:text-slate-300">{item.agent || item['الوكيل المسؤل'] || '-'}</td>;
                          case 'subType': return <td key={col.id} className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400">{item['نوع الاشتراك'] || '-'}</td>;
                          case 'startDate': return <td key={col.id} className="px-6 py-6 text-sm text-slate-500 font-mono">{item['تاريخ بداية العقد مع الشركة'] || '-'}</td>;
                          case 'expiry': return <td key={col.id} className="px-6 py-6 text-sm text-slate-500 font-mono">{item.expiry || item['تاريخ ناهية الاشتراك'] || '-'}</td>;
                          case 'address': return <td key={col.id} className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400">{item.address || item['عنوان المشترك'] || '-'}</td>;
                          case 'city': return <td key={col.id} className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400">{item.city || '-'}</td>;
                          case 'email': return <td key={col.id} className="px-6 py-6 text-sm text-slate-500">{item.email || '-'}</td>;
                          case 'ip_litebeam': return <td key={col.id} className="px-6 py-6 text-sm font-mono text-slate-600 dark:text-slate-400">{item.ip || item['ip_litebeam'] || '-'}</td>;
                          case 'mac_litebeam': return <td key={col.id} className="px-6 py-6 text-sm font-mono text-slate-600 dark:text-slate-400">{item.mac || item['mac_litebeam'] || '-'}</td>;
                          case 'live': return (
                            <td key={col.id} className="px-6 py-6">
                              <div className="flex items-center justify-center">
                                {onlineStatuses[item.username] === true ? (
                                  <span 
                                    className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20 shadow-sm cursor-help"
                                    title={isRTL ? `آخر تحديث: ${lastStatusUpdate}` : `Last checked: ${lastStatusUpdate}`}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                    {isRTL ? 'متصل' : 'Online'}
                                  </span>
                                ) : onlineStatuses[item.username] === false ? (
                                  <span 
                                    className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 cursor-help opacity-70 hover:opacity-100 transition-opacity"
                                    title={isRTL ? `تم البحث في الروترات ولم يتم العثور على اسم المستخدم: ${item.username}` : `Searched routers, no match for: ${item.username}`}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                                    {isRTL ? 'أوفلاين' : 'Offline'}
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] animate-pulse">
                                    <Activity size={12} className="animate-spin-slow" />
                                    <span>{isRTL ? 'جار الفحص...' : 'Checking...'}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                          case 'notes': return <td key={col.id} className="px-6 py-6 text-sm text-slate-500 dark:text-slate-500 truncate max-w-[200px]" title={item.notes || item['ملاحظات اخرى'] || ''}>{item.notes || item['ملاحظات اخرى'] || '-'}</td>;
                          default: return null;
                        }
                      })}
                    </>
                  )}
                  {activeSubTab === 'suppliers' && (
                    <>
                      {SUPPLIER_FIELDS.filter(field => showName || !field.nameField).map(field => (
                        <td key={field.key} className="px-6 py-6 text-base text-slate-600 dark:text-slate-400">
                          {item[field.key] ?? ''}
                        </td>
                      ))}
                    </>
                  )}
                  {activeSubTab === 'shareholders' && (
                    <>
                      {showName && (
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-sm">
                              {item.name.charAt(0)}
                            </div>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const newShares = Math.max(0, item.shares - 100);
                              setShareholders(prev => prev.map(s => s.id === item.id ? { ...s, shares: newShares } : s));
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition-colors"
                          >
                            -
                          </button>
                          <span className="text-base font-bold text-slate-800 dark:text-slate-200 min-w-[80px] text-center">
                            {formatNumber(item.shares)}
                          </span>
                          <button 
                            onClick={() => {
                              const newShares = item.shares + 100;
                              setShareholders(prev => prev.map(s => s.id === item.id ? { ...s, shares: newShares } : s));
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-base font-bold text-slate-600 dark:text-slate-400">{item.ownership}</td>
                      <td className="px-6 py-6 text-base font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.investment, state.currency, state.lang)}
                      </td>
                      <td className="px-6 py-6 text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.dividends, state.currency, state.lang)}
                      </td>
                      <td className="px-6 py-6 text-base text-slate-500 font-mono">{item.joinDate}</td>
                    </>
                  )}
                  {activeSubTab === 'directors' && (
                    <>
                      {showName && (
                        <td className="px-6 py-6 font-bold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </td>
                      )}
                      <td className="px-6 py-6 text-sm text-slate-600 dark:text-slate-400">{item.username}</td>
                      <td className="px-6 py-6 text-sm font-mono text-slate-500">{item.email}</td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                          item.role === 'super_admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                        }`}>
                          {item.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          item.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                        }`}>
                          {item.status === 'active' ? t.settings.ai.active : t.settings.ai.inactive}
                        </span>
                      </td>
                    </>
                  )}
                  {activeSubTab === 'deputies' && (
                    <>
                      {showName && (
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm`}>
                              {item.firstName ? item.firstName.charAt(0) : (item.name ? item.name.charAt(0) : '')}
                            </div>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {item.firstName || item.lastName ? `${item.firstName || ''} ${item.lastName || ''}`.trim() : item.name}
                            </p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-slate-800 dark:text-slate-200">{item.position}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{item.department}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-base font-mono text-slate-600 dark:text-slate-400">{item.phone || '-'}</td>
                      <td className="px-6 py-6 text-base font-medium text-slate-600 dark:text-slate-400">{item.assignedZone || '-'}</td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          item.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                        }`}>
                          {item.status === 'active' ? t.settings.ai.active : t.settings.ai.inactive}
                        </span>
                      </td>
                    </>
                  )}
                  {activeSubTab === 'iptv' && (
                    <>
                      {showName && (
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 font-bold text-sm">
                              {item.name.charAt(0)}
                            </div>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                          </div>
                        </td>
                      )}
                      {showChannel && (
                        <td className="px-6 py-6 text-base font-bold text-slate-800 dark:text-slate-200">
                          {item.channelNumber || '-'}
                        </td>
                      )}
                      <td className="px-6 py-6 text-base font-mono text-slate-600 dark:text-slate-400">{item.phone}</td>
                      <td className="px-6 py-6 text-base font-medium text-slate-600 dark:text-slate-400">{item.platform}</td>
                      <td className="px-6 py-6 text-base font-mono text-slate-600 dark:text-slate-400">{item.username}</td>
                      <td className="px-6 py-6 text-base font-mono text-slate-500">{item.expiry}</td>
                      <td className="px-6 py-6 text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(item.price, state.currency, state.lang)}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          item.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 
                          item.status === 'suspended' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                          'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                        }`}>
                          {t.management.iptv.statuses[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={item.notes}>
                        {item.notes || '-'}
                      </td>
                    </>
                  )}
                  {activeSubTab === 'admins' && (
                    <>
                      {MANAGER_FIELDS.filter(field => showName || !field.nameField).map(field => (
                        <td key={field.key} className="px-6 py-6 text-base text-slate-600 dark:text-slate-400">
                          {item[field.key] ?? ''}
                        </td>
                      ))}
                    </>
                  )}
                  <td className="px-6 py-6 text-right">
                    <SmartActionMenu 
                      item={item}
                      actions={getActions(item)}
                      isOpen={openActionMenuId === item.id}
                      onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                      isRTL={isRTL}
                      isLastRows={filteredData().indexOf(item) >= Math.max(0, filteredData().length - 4)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/20"
          >
            <CheckCircle2 size={24} />
            <span className="font-bold">{t.management.success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Debug Names Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDebugModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDebugModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity size={24} className="text-teal-500" />
                  {isRTL ? 'الأسماء المكتشفة على المايكروتيك' : 'Names Found on MikroTik'}
                </h3>
                <button onClick={() => setIsDebugModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder={isRTL ? 'ابحث في القائمة...' : 'Search names...'} value={debugSearchTerm} onChange={(e) => setDebugSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-[#050505] p-4 rounded-2xl border border-slate-200 dark:border-slate-900 font-mono text-sm custom-scrollbar">
                  {/* Technical Summary Header */}
                  {Object.keys(routerDiagnostics).length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Router size={14} />
                        {isRTL ? 'حالة الروترات الفنية' : 'Router Technical Status'}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.values(routerDiagnostics).map((rd: any, idx) => (
                          <div key={idx} className="p-3 bg-white dark:bg-[#111114] border border-slate-200 dark:border-slate-800 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-teal-600 dark:text-teal-400">{rd.name}</span>
                              {rd.connectionError ? (
                                <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20 font-bold">Offline: {rd.connectionError}</span>
                              ) : (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">Connected</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[11px] mb-2">
                              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                <span className="text-slate-500">PPPoE Active:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-200">{rd.pppCount}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                <span className="text-slate-500">Hotspot Active:</span>
                                <span className="font-bold text-slate-900 dark:text-slate-200">{rd.hotspotCount}</span>
                              </div>
                            </div>
                            {rd.rawSample && (
                              <details className="mt-2 text-[10px]">
                                <summary className="cursor-pointer text-blue-500 hover:underline font-bold mb-1">
                                  {isRTL ? 'عرض عينة البيانات الخام' : 'Show RAW Data Sample'}
                                </summary>
                                <pre className="bg-slate-100 dark:bg-black p-2 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 overflow-x-auto">
                                  {JSON.stringify(rd.rawSample, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Users size={14} />
                    {isRTL ? 'قائمة الأسماء' : 'Username List'}
                  </h4>
                  
                  {onlineNamesList.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">{isRTL ? 'لم يتم اكتشاف أي أسماء بعد.' : 'No names detected yet.'}</div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {onlineNamesList.filter(name => name.toLowerCase().includes(debugSearchTerm.toLowerCase())).map((name, i) => (
                        <div key={i} className="px-3 py-1 bg-white dark:bg-[#111114] border border-slate-100 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 truncate text-[11px]" title={name}>
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs text-slate-500 italic">
                  {isRTL ? `المجموع: ${onlineNamesList.length} اسم متصل حالياً.` : `Total: ${onlineNamesList.length} names currently online.`}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MikroTik Sync Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isSyncModalOpen && syncingSubscriber && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsSyncModalOpen(false); setSyncResult(null); }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <Router size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {isRTL ? 'مزامنة مع جهاز MikroTik' : 'Sync to MikroTik'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {syncingSubscriber.username || syncingSubscriber.name || syncingSubscriber.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsSyncModalOpen(false); setSyncResult(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Subscriber Info Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shrink-0">
                    {(syncingSubscriber.firstname || syncingSubscriber.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {`${syncingSubscriber.firstname || ''} ${syncingSubscriber.lastname || ''}`.trim() || syncingSubscriber.name || '-'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500 font-mono">{syncingSubscriber.username || (isRTL ? 'لا يوجد اسم مستخدم' : 'No username')}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        syncingSubscriber.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' :
                        syncingSubscriber.status === 'suspended' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                        'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                      }`}>
                        {syncingSubscriber.status === 'active' ? (isRTL ? 'مفعل' : 'Active') :
                         syncingSubscriber.status === 'suspended' ? (isRTL ? 'موقوف' : 'Suspended') : (isRTL ? 'منتهي' : 'Expired')}
                      </span>
                      {syncingSubscriber.plan && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg font-medium">{syncingSubscriber.plan}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Router Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Router size={16} className="text-indigo-500" />
                    {isRTL ? 'اختر جهاز المزامنة' : 'Select Target Device'}
                  </label>
                  <select
                    value={syncTarget}
                    onChange={(e) => setSyncTarget(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  >
                    <option value="all">
                      {isRTL ? '⚡ مزامنة مع جميع الأجهزة دفعة واحدة' : '⚡ Sync to All Devices at Once'}
                    </option>
                    {routersList.map((router: any) => (
                      <option key={router.id} value={router.id}>
                        {router.name || router.host || router.id}
                        {router.host && router.name ? ` — ${router.host}` : ''}
                      </option>
                    ))}
                  </select>
                  {routersList.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                      <AlertCircle size={13} />
                      {isRTL ? 'لم يتم العثور على أجهزة راوتر. يرجى إضافة روترات من قسم الشبكة أولاً.' : 'No routers found. Add routers in the Network section first.'}
                    </p>
                  )}
                </div>

                {/* Info box */}
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  {isRTL
                    ? 'ستقوم المزامنة بإنشاء أو تحديث سر PPPoE للمشترك في الجهاز المحدد، مع ضبط الحالة والباقة تلقائياً.'
                    : 'Sync will create or update the subscriber\'s PPPoE secret on the selected device, automatically setting their status and plan.'}
                </div>

                {/* Sync Result */}
                {syncResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border overflow-hidden ${syncResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'
                    }`}
                  >
                    {/* Main status line */}
                    <div className={`flex items-center gap-2 font-bold text-sm p-4 ${syncResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {syncResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      {syncResult.message}
                    </div>

                    {/* Per-router details */}
                    {syncResult.details && syncResult.details.length > 0 && (
                      <div className="border-t border-slate-200/50 dark:border-slate-700/50 divide-y divide-slate-200/40 dark:divide-slate-700/40">
                        {syncResult.details.map((d: any, i: number) => (
                          <div key={i} className="px-4 py-3">
                            <div className={`flex items-center gap-2 text-xs font-bold ${d.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                              {d.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                              <span>{d.router}</span>
                              {d.action && (
                                <span className="ml-auto font-medium">
                                  {d.action === 'created' ? (isRTL ? '✅ تم الإنشاء' : '✅ Created') : (isRTL ? '✅ تم التحديث' : '✅ Updated')}
                                </span>
                              )}
                            </div>
                            {/* Profile used */}
                            {d.success && d.profile && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <Zap size={11} className="text-indigo-400" />
                                {isRTL ? 'الباقة المطبقة:' : 'Profile applied:'} <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{d.profile}</span>
                              </div>
                            )}
                            {/* Fallback / skipped note */}
                            {d.note && (
                              <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                ⚠️ {d.note}
                              </div>
                            )}
                            {/* Error */}
                            {d.error && (
                              <div className="mt-2 p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg font-mono text-[11px] text-rose-800 dark:text-rose-300 break-all leading-relaxed">
                                {d.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  </motion.div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                <button
                  onClick={() => { setIsSyncModalOpen(false); setSyncResult(null); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all"
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={handleSyncSubscriber}
                  disabled={isSyncing}
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  {isSyncing ? (
                    <><RefreshCw size={16} className="animate-spin" /> {isRTL ? 'جاري المزامنة...' : 'Syncing...'}</>
                  ) : (
                    <><Zap size={16} /> {syncTarget === 'all' ? (isRTL ? 'مزامنة مع الكل' : 'Sync to All') : (isRTL ? 'مزامنة' : 'Sync')}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserPlus size={20} className="text-teal-500" />
                    {activeSubTab === 'subscribers' && t.management.subscribers.add}
                    {activeSubTab === 'iptv' && t.management.iptv.add}
                    {activeSubTab === 'suppliers' && t.management.suppliers.add}
                    {activeSubTab === 'shareholders' && (isRTL ? 'إضافة مساهم' : 'Add Shareholder')}
                    {activeSubTab === 'directors' && (isRTL ? 'إضافة مدير' : 'Add Director')}
                    {activeSubTab === 'deputies' && (isRTL ? 'إضافة نائب' : 'Add Deputy')}
                    {activeSubTab === 'admins' && t.management.admins.add}
                  </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {activeSubTab !== 'suppliers' && activeSubTab !== 'admins' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.subscribers.table.name}</label>
                    <input 
                      type="text" 
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                    />
                  </div>
                )}

                {activeSubTab === 'subscribers' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {SUBSCRIBER_COLUMNS.filter(col => col.id !== 'id').map((col) => {
                        let fieldType = 'text';
                        if (['balance', 'debt', 'paid', 'bill'].includes(col.id)) fieldType = 'number';
                        if (['startDate', 'expiry'].includes(col.id)) fieldType = 'date';
                        
                        return (
                          <div key={col.id} className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</label>
                            {col.id === 'status' ? (
                              <select 
                                value={newItem.status || newItem['حالة الحساب'] || 'active'}
                                onChange={(e) => setNewItem({ ...newItem, status: e.target.value, 'حالة الحساب': e.target.value === 'active' ? 'مفعل' : (e.target.value === 'suspended' ? 'موقوف' : 'منتهي') })}
                                className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                              >
                                <option value="active">{t.management.subscribers.statuses.active}</option>
                                <option value="suspended">{t.management.subscribers.statuses.suspended}</option>
                                <option value="expired">{t.management.subscribers.statuses.expired}</option>
                              </select>
                            ) : col.id === 'plan' ? (
                              /* ── Smart Profile Dropdown ── */
                              networkProfiles.length > 0 ? (
                                <select
                                  value={newItem.plan || newItem['سرعة الخط'] || ''}
                                  onChange={(e) => {
                                    const selected = networkProfiles.find(p => p.name === e.target.value);
                                    let subType = 'pppoe';
                                    if (selected && (selected.type === 'hotspot' || selected.type === 'both')) subType = 'hotspot';
                                    
                                    setNewItem({
                                      ...newItem,
                                      plan: e.target.value,
                                      'سرعة الخط': e.target.value,
                                      subType: subType,
                                      'نوع الاشتراك': subType === 'pppoe' ? 'PPPoE' : 'Hotspot',
                                      ...(selected ? { 'قيمة الفاتورة': selected.price, bill: selected.price } : {})
                                    });
                                  }}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                >
                                  <option value="">{isRTL ? '-- اختر الباقة --' : '-- Select Plan --'}</option>
                                  {networkProfiles.map((p: any) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}{p.downloadSpeed && p.uploadSpeed ? ` (↓${p.downloadSpeed} / ↑${p.uploadSpeed})` : ''}{p.price ? ` — ${p.price} ILS` : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={newItem.plan || newItem['سرعة الخط'] || ''}
                                  onChange={(e) => setNewItem({ ...newItem, plan: e.target.value, 'سرعة الخط': e.target.value })}
                                  placeholder={isRTL ? 'أدخل اسم الباقة يدوياً' : 'Enter plan name manually'}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                              )
                            ) : (
                              <input 
                                type={fieldType} 
                                value={newItem[col.id] || newItem[col.key || ''] || ''}
                                onChange={(e) => {
                                  let val: any = e.target.value;
                                  if (fieldType === 'number') val = parseFloat(val) || 0;
                                  setNewItem({ ...newItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })
                                }}
                                className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSubTab === 'iptv' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.phone}</label>
                        <input 
                          type="text" 
                          value={newItem.phone}
                          onChange={(e) => setNewItem({ ...newItem, phone: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم القناة' : 'Channel Number'}</label>
                        <input 
                          type="text" 
                          value={newItem.channelNumber || ''}
                          onChange={(e) => setNewItem({ ...newItem, channelNumber: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.host}</label>
                        <input 
                          type="text" 
                          value={newItem.host}
                          onChange={(e) => setNewItem({ ...newItem, host: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.username}</label>
                        <input 
                          type="text" 
                          value={newItem.username}
                          onChange={(e) => setNewItem({ ...newItem, username: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.password}</label>
                        <input 
                          type="text" 
                          value={newItem.password}
                          onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.expiry}</label>
                        <input 
                          type="date" 
                          value={newItem.expiry}
                          onChange={(e) => setNewItem({ ...newItem, expiry: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.price}</label>
                        <input 
                          type="number" 
                          value={newItem.price}
                          onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.provider}</label>
                        <input 
                          type="text" 
                          value={newItem.platform}
                          onChange={(e) => setNewItem({ ...newItem, platform: e.target.value })}
                          placeholder="e.g. Maven"
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.status}</label>
                        <select 
                          value={newItem.status}
                          onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="active">{t.management.iptv.statuses.active}</option>
                          <option value="suspended">{t.management.iptv.statuses.suspended}</option>
                          <option value="expired">{t.management.iptv.statuses.expired}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                      <textarea 
                        value={newItem.notes || ''}
                        onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        placeholder={isRTL ? 'أضف ملاحظات حول هذا المشترك...' : 'Add notes about this subscriber...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'shareholders' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأسهم' : 'Shares'}</label>
                        <input 
                          type="number" 
                          value={newItem.shares}
                          onChange={(e) => setNewItem({ ...newItem, shares: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'نسبة الملكية' : 'Ownership %'}</label>
                        <input 
                          type="text" 
                          value={newItem.ownership}
                          onChange={(e) => setNewItem({ ...newItem, ownership: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</label>
                        <input 
                          type="number" 
                          value={newItem.investment}
                          onChange={(e) => setNewItem({ ...newItem, investment: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأرباح المستلمة' : 'Dividends Paid'}</label>
                        <input 
                          type="number" 
                          value={newItem.dividends}
                          onChange={(e) => setNewItem({ ...newItem, dividends: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(activeSubTab === 'directors' || activeSubTab === 'deputies') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeSubTab === 'directors' ? (isRTL ? 'البريد الإلكتروني' : 'Email') : (isRTL ? 'المنصب' : 'Position')}</label>
                      <input 
                        type={activeSubTab === 'directors' ? 'email' : 'text'}
                        value={activeSubTab === 'directors' ? newItem.email : newItem.position}
                        onChange={(e) => setNewItem({ ...newItem, [activeSubTab === 'directors' ? 'email' : 'position']: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{activeSubTab === 'directors' ? (isRTL ? 'اسم المستخدم' : 'Username') : (isRTL ? 'القسم' : 'Department')}</label>
                      <input 
                        type="text" 
                        value={activeSubTab === 'directors' ? newItem.username : newItem.department}
                        onChange={(e) => setNewItem({ ...newItem, [activeSubTab === 'directors' ? 'username' : 'department']: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    {activeSubTab === 'directors' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                          <input 
                            type="text" 
                            value={newItem.password}
                            onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الصلاحية (الرتبة)' : 'Role'}</label>
                          <select 
                            value={newItem.role}
                            onChange={(e) => setNewItem({ ...newItem, role: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {activeSubTab === 'deputies' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الأول' : 'First Name'}</label>
                      <input 
                        type="text" 
                        value={newItem.firstName}
                        onChange={(e) => setNewItem({ ...newItem, firstName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم العائلة' : 'Last Name'}</label>
                      <input 
                        type="text" 
                        value={newItem.lastName}
                        onChange={(e) => setNewItem({ ...newItem, lastName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهوية' : 'ID Number'}</label>
                      <input 
                        type="text" 
                        value={newItem.idNumber}
                        onChange={(e) => setNewItem({ ...newItem, idNumber: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
                      <input 
                        type="text" 
                        value={newItem.phone}
                        onChange={(e) => setNewItem({ ...newItem, phone: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'العنوان' : 'Address'}</label>
                      <input 
                        type="text" 
                        value={newItem.address}
                        onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>
                )}
                {activeSubTab === 'suppliers' && (
                  <div className="grid grid-cols-2 gap-4">
                    {SUPPLIER_FIELDS.map(field => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                        <input 
                          type="text" 
                          value={newItem[field.key] ?? ''}
                          onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeSubTab === 'admins' && (
                  <div className="grid grid-cols-2 gap-4">
                    {MANAGER_FIELDS.map(field => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                        <input 
                          type="text" 
                          value={newItem[field.key] ?? ''}
                          onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#18181B] border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {t.management.cancel}
                </button>
                <button 
                  onClick={handleSaveAdd}
                  className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
                >
                  <Plus size={18} />
                  {isRTL ? 'إضافة' : 'Add'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 size={20} className="text-teal-500" />
                  {t.management.edit}
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {activeSubTab !== 'suppliers' && activeSubTab !== 'admins' && activeSubTab !== 'deputies' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.subscribers.table.name}</label>
                    <input 
                      type="text" 
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                    />
                  </div>
                )}

                {activeSubTab === 'subscribers' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {SUBSCRIBER_COLUMNS.filter(col => col.id !== 'id').map((col) => {
                        let fieldType = 'text';
                        if (['balance', 'debt', 'paid', 'bill'].includes(col.id)) fieldType = 'number';
                        if (['startDate', 'expiry'].includes(col.id)) fieldType = 'date';
                        if (['expiry_time'].includes(col.id)) fieldType = 'text';
                        
                        return (
                          <div key={col.id} className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</label>
                            {col.id === 'status' ? (
                              <select 
                                value={editingItem.status || editingItem['حالة الحساب'] || 'active'}
                                onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value, 'حالة الحساب': e.target.value === 'active' ? 'مفعل' : (e.target.value === 'suspended' ? 'موقوف' : 'منتهي') })}
                                className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                              >
                                <option value="active">{t.management.subscribers.statuses.active}</option>
                                <option value="suspended">{t.management.subscribers.statuses.suspended}</option>
                                <option value="expired">{t.management.subscribers.statuses.expired}</option>
                              </select>
                            ) : col.id === 'plan' ? (
                              /* ── Smart Profile Dropdown (Edit) ── */
                              networkProfiles.length > 0 ? (
                                <select
                                  value={editingItem.plan || editingItem['سرعة الخط'] || ''}
                                  onChange={(e) => {
                                    const selected = networkProfiles.find((p: any) => p.name === e.target.value);
                                    let subType = 'pppoe';
                                    if (selected && (selected.type === 'hotspot' || selected.type === 'both')) subType = 'hotspot';

                                    setEditingItem({
                                      ...editingItem,
                                      plan: e.target.value,
                                      'سرعة الخط': e.target.value,
                                      subType: subType,
                                      'نوع الاشتراك': subType === 'pppoe' ? 'PPPoE' : 'Hotspot',
                                      ...(selected ? { 'قيمة الفاتورة': selected.price, bill: selected.price } : {})
                                    });
                                  }}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-indigo-300 dark:border-indigo-600 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                >
                                  <option value="">{isRTL ? '-- اختر الباقة --' : '-- Select Plan --'}</option>
                                  {networkProfiles.map((p: any) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}{p.downloadSpeed && p.uploadSpeed ? ` (↓${p.downloadSpeed} / ↑${p.uploadSpeed})` : ''}{p.price ? ` — ${p.price} ILS` : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editingItem.plan || editingItem['سرعة الخط'] || ''}
                                  onChange={(e) => setEditingItem({ ...editingItem, plan: e.target.value, 'سرعة الخط': e.target.value })}
                                  placeholder={isRTL ? 'أدخل اسم الباقة يدوياً' : 'Enter plan name manually'}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                />
                              )
                            ) : (
                              <input 
                                type={fieldType} 
                                value={editingItem[col.id] || editingItem[col.key || ''] || ''}
                                onChange={(e) => {
                                  let val: any = e.target.value;
                                  if (fieldType === 'number') val = parseFloat(val) || 0;
                                  setEditingItem({ ...editingItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })
                                }}
                                className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                              />
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSubTab === 'iptv' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.phone}</label>
                        <input 
                          type="text" 
                          value={editingItem.phone}
                          onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم القناة' : 'Channel Number'}</label>
                        <input 
                          type="text" 
                          value={editingItem.channelNumber || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, channelNumber: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.host}</label>
                        <input 
                          type="text" 
                          value={editingItem.host}
                          onChange={(e) => setEditingItem({ ...editingItem, host: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.username}</label>
                        <input 
                          type="text" 
                          value={editingItem.username}
                          onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.password}</label>
                        <input 
                          type="text" 
                          value={editingItem.password}
                          onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.expiry}</label>
                        <input 
                          type="date" 
                          value={editingItem.expiry}
                          onChange={(e) => setEditingItem({ ...editingItem, expiry: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.price}</label>
                        <input 
                          type="number" 
                          value={editingItem.price}
                          onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.provider}</label>
                        <input 
                          type="text" 
                          value={editingItem.platform}
                          onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.status}</label>
                        <select 
                          value={editingItem.status}
                          onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="active">{t.management.iptv.statuses.active}</option>
                          <option value="suspended">{t.management.iptv.statuses.suspended}</option>
                          <option value="expired">{t.management.iptv.statuses.expired}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                      <textarea 
                        value={editingItem.notes || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        placeholder={isRTL ? 'أضف ملاحظات حول هذا المشترك...' : 'Add notes about this subscriber...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'shareholders' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأسهم' : 'Shares'}</label>
                        <input 
                          type="number" 
                          value={editingItem.shares}
                          onChange={(e) => setEditingItem({ ...editingItem, shares: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'نسبة الملكية' : 'Ownership %'}</label>
                        <input 
                          type="text" 
                          value={editingItem.ownership}
                          onChange={(e) => setEditingItem({ ...editingItem, ownership: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</label>
                        <input 
                          type="number" 
                          value={editingItem.investment}
                          onChange={(e) => setEditingItem({ ...editingItem, investment: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأرباح المستلمة' : 'Dividends Paid'}</label>
                        <input 
                          type="number" 
                          value={editingItem.dividends}
                          onChange={(e) => setEditingItem({ ...editingItem, dividends: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'directors' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                      <input 
                        type="email" 
                        value={editingItem.email}
                        onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم المستخدم' : 'Username'}</label>
                      <input 
                        type="text" 
                        value={editingItem.username}
                        onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                      <input 
                        type="text" 
                        value={editingItem.password}
                        onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الصلاحية (الرتبة)' : 'Role'}</label>
                      <select 
                        value={editingItem.role}
                        onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeSubTab === 'deputies' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الأول' : 'First Name'}</label>
                      <input 
                        type="text" 
                        value={editingItem.firstName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, firstName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم العائلة' : 'Last Name'}</label>
                      <input 
                        type="text" 
                        value={editingItem.lastName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, lastName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'المنصب' : 'Position'}</label>
                      <input 
                        type="text" 
                        value={editingItem.position}
                        onChange={(e) => setEditingItem({ ...editingItem, position: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'القسم' : 'Department'}</label>
                      <input 
                        type="text" 
                        value={editingItem.department}
                        onChange={(e) => setEditingItem({ ...editingItem, department: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهوية' : 'ID Number'}</label>
                      <input 
                        type="text" 
                        value={editingItem.idNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, idNumber: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
                      <input 
                        type="text" 
                        value={editingItem.phone || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'العنوان' : 'Address'}</label>
                      <input 
                        type="text" 
                        value={editingItem.address || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'suppliers' && (
                  <div className="grid grid-cols-2 gap-4">
                    {SUPPLIER_FIELDS.map(field => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                        <input 
                          type="text" 
                          value={editingItem[field.key] ?? ''}
                          onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeSubTab === 'admins' && (
                  <div className="grid grid-cols-2 gap-4">
                    {MANAGER_FIELDS.map(field => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                        <input 
                          type="text" 
                          value={editingItem[field.key] ?? ''}
                          onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#18181B] border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  {t.management.cancel}
                </button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
                >
                  <Save size={18} />
                  {t.management.save}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activation Modal */}
      {/* Unified Modal AnimatePresence */}
      <AnimatePresence mode="wait">
        {/* Activation Modal */}
        {isActivateModalOpen && (
          <div key="activation-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsActivateModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Zap className="text-emerald-500 w-8 h-8" />
                  {isRTL ? 'تفعيل الاشتراك الذكي' : 'Smart Activation'}
                </h3>
                <button onClick={() => setIsActivateModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">{isRTL ? 'تفعيل للمشترك:' : 'Activating for:'}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{subToActivate?.firstname || subToActivate?.name || subToActivate?.['الاسم الأول']}</p>
                    <p className="text-sm text-slate-500 mt-1">{isRTL ? `الباقة: ${subToActivate?.plan || subToActivate?.['سرعة الخط']}` : `Plan: ${subToActivate?.plan}`}</p>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'خيارات بدء الاحتساب:' : 'Start Date Options:'}</label>
                   <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setActivationOption('today')}
                        className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between font-bold ${activationOption === 'today' ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                      >
                         <div className="flex items-center gap-3">
                            <Activity size={20} />
                            {isRTL ? 'تفعيل من اليوم' : 'From Today'}
                         </div>
                         {activationOption === 'today' && <CheckCircle2 size={20} />}
                      </button>
                      <button 
                        onClick={() => setActivationOption('first_of_month')}
                        className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between font-bold ${activationOption === 'first_of_month' ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                      >
                         <div className="flex items-center gap-3">
                            <Calendar size={20} />
                            {isRTL ? 'من بداية الشهر الحالي' : 'From 1st of Month'}
                         </div>
                         {activationOption === 'first_of_month' && <CheckCircle2 size={20} />}
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'جهاز المايكروتيك المستهدف:' : 'Target MikroTik Device:'}</label>
                   <select 
                      value={activationTarget}
                      onChange={(e) => setActivationTarget(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold focus:ring-2 focus:ring-teal-500 transition-all appearance-none outline-none"
                   >
                      <option value="all">{isRTL ? 'جميع الأجهزة المتصلة' : 'All Connected Routers'}</option>
                      {routersList.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.host})</option>
                      ))}
                   </select>
                </div>

                <button 
                  onClick={handleActivateSubscriber}
                  disabled={isActivating}
                  className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
                >
                  {isActivating ? <Activity className="animate-spin" /> : <Zap size={24} />}
                  {isRTL ? 'تأكيد التفعيل الآن' : 'Confirm Activation Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Extend Modal */}
        {isExtendModalOpen && (
          <div key="extend-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsExtendModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Calendar className="text-amber-500 w-8 h-8" />
                  {isRTL ? 'تمديد صلاحية المشترك' : 'Extend Service'}
                </h3>
                <button onClick={() => setIsExtendModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                    <p className="text-sm font-bold text-amber-600 dark:text-blue-400 mb-1">{isRTL ? 'المشترك المستفيد:' : 'Beneficiary:'}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{extendingSub?.firstname || extendingSub?.name}</p>
                    <p className="text-xs text-amber-600/70 mt-1">{isRTL ? 'ملاحظة: سيتم خصم هذه المدة من الاشتراك القادم تلقائياً.' : 'Note: This time will be deducted from the next subscription.'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'خيارات التمديد (ساعات):' : 'Extension (Hours):'}</label>
                      <div className="grid grid-cols-3 gap-2">
                          {[3, 6, 12].map(h => (
                            <button 
                              key={h}
                              onClick={() => setSelectedDuration({ unit: 'hours', value: h })}
                              className={`py-3 px-2 rounded-xl transition-all text-sm shadow-sm font-bold border ${selectedDuration?.unit === 'hours' && selectedDuration?.value === h ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                              {h} {isRTL ? 'ساعات' : 'Hrs'}
                            </button>
                          ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'خيارات التمديد (أيام):' : 'Extension (Days):'}</label>
                      <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map(d => (
                            <button 
                              key={d}
                              onClick={() => setSelectedDuration({ unit: 'days', value: d })}
                              className={`py-3 px-2 rounded-xl transition-all text-sm shadow-sm font-bold border ${selectedDuration?.unit === 'days' && selectedDuration?.value === d ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                              {d} {isRTL ? (d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام') : 'Days'}
                            </button>
                          ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'التزامن مع المايكروتيك:' : 'Target MikroTik:'}</label>
                   <select 
                      value={extensionTarget}
                      onChange={(e) => setExtensionTarget(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none"
                   >
                      <option value="all">{isRTL ? 'جميع الأجهزة' : 'All Connected Routers'}</option>
                      {routersList.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.host})</option>
                      ))}
                   </select>
                </div>

                <button 
                  onClick={() => selectedDuration && handleExtendSubscriber(selectedDuration)}
                  disabled={!selectedDuration || isLoading}
                  className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isLoading ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={24} />}
                  {isRTL ? 'تأكيد تمديد الصلاحية الآن' : 'Confirm Extension Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Messaging Modal */}
        {isMessageModalOpen && (
          <div key="message-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsMessageModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Send className="text-blue-500 w-8 h-8" />
                  {isRTL ? 'إرسال رسالة للمشترك' : 'Send Message'}
                </h3>
                <button onClick={() => setIsMessageModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24}/></button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">{isRTL ? 'إرسال إلى:' : 'Recipient:'}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{messagingSub?.firstname || messagingSub?.name || messagingSub?.username || '---'}</p>
                    <div className="flex gap-4 mt-2">
                       {messagingSub?.phone && <span className="flex items-center gap-1 text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{messagingSub.phone}</span>}
                       {messagingSub?.email && <span className="flex items-center gap-1 text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{messagingSub.email}</span>}
                    </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'ممر الإرسال (البوابة):' : 'Message Gateway:'}</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('whatsapp')) newT.delete('whatsapp'); else newT.add('whatsapp');
                        setMessageTypes(newT);
                    }} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${messageTypes.has('whatsapp') ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <MessageSquare size={24} /> <span className="text-[10px]">WhatsApp</span>
                    </button>
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('sms')) newT.delete('sms'); else newT.add('sms');
                        setMessageTypes(newT);
                    }} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${messageTypes.has('sms') ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <Smartphone size={24} /> <span className="text-[10px]">SMS</span>
                    </button>
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('email')) newT.delete('email'); else newT.add('email');
                        setMessageTypes(newT);
                    }} className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border-2 ${messageTypes.has('email') ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <Mail size={24} /> <span className="text-[10px]">Email</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'محتوى الرسالة:' : 'Message Content:'}</label>
                    {templates.length > 0 && (
                      <select 
                        value={selectedTemplate}
                        onChange={e => {
                          setSelectedTemplate(e.target.value);
                          const tpl = templates.find(t => t.id === e.target.value);
                          if(tpl) setMessageText(tpl.text);
                        }}
                        className="text-[10px] bg-transparent border-none text-blue-500 font-bold outline-none"
                      >
                         <option value="">{isRTL ? 'استخدام قالب...' : 'Use template...'}</option>
                         {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                  <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium" placeholder={isRTL ? 'اكتب رسالتك هنا...' : 'Type message here...'}></textarea>
                  <div className="flex justify-end">
                     <button onClick={async () => {
                       if(!messageText.trim()) return;
                       const name = prompt(isRTL ? 'اسم القالب الجديد:' : 'New template name:');
                       if(!name) return;
                       const newTpl = { id: Math.random().toString(36).substr(2,9), name, text: messageText };
                       await saveMessageData({ templates: [...templates, newTpl], groups: [] });
                       loadMsgTemplates();
                       alert(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
                     }} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-tighter">
                       + {isRTL ? 'حفظ كقالب جديد' : 'Save as new template'}
                     </button>
                  </div>
                </div>

                <button 
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !messageText.trim()}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isSendingMessage ? <RefreshCw className="animate-spin" /> : <Send size={24} />}
                  {isRTL ? 'إطلاق الإرسال الآن' : 'Dispatch Message Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
