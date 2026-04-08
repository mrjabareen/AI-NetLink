import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Truck, ShieldCheck, Search, Plus, Edit2, Trash2, X, Save, CheckCircle2, AlertCircle, UserPlus, Filter, Briefcase, UserCog, PieChart, RefreshCw, Activity, Globe, Wifi, WifiOff, Router, Zap, LogOut, Power, MoreVertical, Lock, Unlock, ShieldOff, Edit, Trash, Calendar, Send, Smartphone, Mail, MessageSquare, CreditCard, Coins, Wallet, CircleHelp } from 'lucide-react';
import { AppState, BaseEntityRecord, Permission, FinancialTransaction, MessageTemplate, NetworkProfile, RouterRecord } from '../types';
import { dict } from '../dict';
import { formatNumber, normalizeDigits, formatTime } from '../utils/format';
import { formatCurrency } from '../utils/currency';
import { fetchSubscribers, fetchSuppliers, fetchInvestors, addSubscriber, updateSubscriber, deleteSubscriber, addSupplier, updateSupplier, deleteSupplier, fetchManagersRaw, addManager, updateManager, deleteManager, addInvestor, updateInvestor, deleteInvestor, directorsApi, deputiesApi, iptvApi, getMikrotikStatus, getMikrotikStatusBatch, disconnectSubscriber, disconnectAllSubscribers, deleteSecret, disableSecret, enableSecret, syncSubscriberToMikrotik, fetchRoutersList, fetchProfiles, activateSubscriber, extendSubscriber, getMessageData, saveMessageData, BASE_URL, topUpManager, updateManagerTxLimit } from '../api';
import { getSmartMatchScore, smartMatch } from '../utils/search';
import { toastError, toastInfo, toastSuccess } from '../utils/notify';
import SecurityGroupsTab from './SecurityGroupsTab';
import AppConfirmDialog from './AppConfirmDialog';
import AppPromptDialog from './AppPromptDialog';
import DateInput from './DateInput';
import TimeSelectInput from './TimeSelectInput';
import SystemClockBadge from './SystemClockBadge';

interface ManagementTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type ManagementSubTab = 'subscribers' | 'suppliers' | 'shareholders' | 'managers' | 'iptv' | 'groups';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

type DynamicItem = BaseEntityRecord & {
  firstName?: string;
  lastName?: string;
  role?: string;
};

type TableColumnDef = {
  id: string;
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (item: DynamicItem) => React.ReactNode;
};

type FieldHelpLabelProps = {
  label: string;
  helpText: string;
  isRTL: boolean;
};

function FieldHelpLabel({ label, helpText, isRTL }: FieldHelpLabelProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative group shrink-0">
        <button
          type="button"
          tabIndex={-1}
          className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111114] text-slate-400 hover:text-teal-500 hover:border-teal-300 transition-colors flex items-center justify-center"
          aria-label={isRTL ? `معلومة عن ${label}` : `Info about ${label}`}
        >
          <CircleHelp size={12} />
        </button>
        <div className={`pointer-events-none absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-64 p-3 rounded-xl bg-slate-950 text-white text-[11px] leading-5 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-[80]`}>
          {helpText}
        </div>
      </div>
    </div>
  );
}

type SyncResultDetail = {
  routerId?: string;
  routerName?: string;
  router?: string;
  action?: string;
  profile?: string;
  success?: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

type AdvancedFilterOption = {
  value: string;
  label: string;
};

type AdvancedFilterField = {
  key: string;
  label: string;
  options: AdvancedFilterOption[];
};

type AdvancedFiltersByTab = {
  subscribers: Record<string, string>;
  suppliers: Record<string, string>;
  shareholders: Record<string, string>;
  managers: Record<string, string>;
  iptv: Record<string, string>;
};

const DEFAULT_ADVANCED_FILTERS: AdvancedFiltersByTab = {
  subscribers: {
    status: 'all',
    connection: 'all',
    plan: 'all',
    parent: 'all',
    group: 'all',
    location: 'all',
    expiry: 'all',
    debt: 'all',
    subType: 'all',
  },
  suppliers: {
    debtState: 'all',
    balanceState: 'all',
    noteState: 'all',
  },
  shareholders: {
    ownership: 'all',
    sharesState: 'all',
    dividendsState: 'all',
  },
  managers: {
    status: 'all',
    role: 'all',
    parent: 'all',
    balanceState: 'all',
    limitState: 'all',
  },
  iptv: {
    status: 'all',
    priceRange: 'all',
    serviceType: 'all',
  },
};

type RouterDiagnostic = {
  name?: string;
  routerName?: string;
  host?: string;
  online?: boolean;
  usersCount?: number;
  connectionError?: string;
  pppCount?: number;
  hotspotCount?: number;
  rawSample?: unknown;
  error?: string;
  [key: string]: unknown;
};

interface MenuAction {
  id: string;
  label: string;
  icon: IconComponent;
  onClick: (item: DynamicItem) => void;
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
  item: DynamicItem; 
  actions: MenuAction[]; 
  isOpen: boolean; 
  onToggle: () => void; 
  isRTL: boolean;
  isLastRows: boolean;
}) => {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onToggle();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onToggle]);

  return (
    <div ref={menuRef} className="relative inline-block text-right" onClick={(e) => e.stopPropagation()}>
      <button 
        type="button"
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
            className={`absolute ${isRTL ? 'left-0' : 'right-0'} ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'} w-64 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[200] overflow-hidden`}
          >
            <div className="p-2 space-y-1">
              {actions.map((action, idx) => (
                <div key={action.id} className="relative">
                  <button 
                    type="button"
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
  const hasPermission = (perm: Permission | 'all') => {
    if (state.role === 'super_admin') return true;
    
    // Check individual permissions
    if (userPermissions.includes(perm)) return true;
    
    // Check group permissions
    if (state.currentUser?.groupId) {
      const group = state.securityGroups.find(g => g.id === state.currentUser?.groupId);
      if (group?.permissions.includes(perm)) return true;
    }
    
    return false;
  };

  const getSupplierFieldValue = (item: DynamicItem, key: string) => String(item?.[key] ?? '').trim();
  const getSupplierCode = (item: DynamicItem) => getSupplierFieldValue(item, 'كود');
  const getSupplierName = (item: DynamicItem) => getSupplierFieldValue(item, 'اسم المورد') || String(item?.id || '');
  const getSupplierNotes = (item: DynamicItem) => getSupplierFieldValue(item, 'ملاحظات');
  const getSubscriberDisplayName = (item: DynamicItem) => {
    const firstName = getEntityValue(item, 'firstname', 'firstName', 'الاسم الأول', 'الاسم الاول');
    const lastName = getEntityValue(item, 'lastname', 'lastName', 'اسم العائلة', 'الاسم الثاني');
    const fullName = `${firstName} ${lastName}`.trim();
    return String(fullName || item.name || item.username || item['اسم المستخدم'] || '-');
  };
  const normalizeSubscriberStatus = (value: unknown) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'active';
    if (['active', 'مفعل', 'نشط'].includes(raw)) return 'active';
    if (['suspended', 'موقوف', 'معلق'].includes(raw)) return 'suspended';
    if (['expired', 'منتهي'].includes(raw)) return 'expired';
    return raw;
  };
  const getSubscriberStatusLabel = (item: DynamicItem) => {
    const normalized = normalizeSubscriberStatus(item.status || item['حالة الحساب']);
    return t.management.subscribers.statuses[normalized] || String(item['حالة الحساب'] || item.status || '-');
  };
  const getSubscriberStatusClass = (item: DynamicItem) => {
    const normalized = normalizeSubscriberStatus(item.status || item['حالة الحساب']);
    if (normalized === 'suspended') {
      return 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-500/20';
    }
    if (normalized === 'expired') {
      return 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/20';
    }
    return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/20';
  };
  const getSubscriberBalanceClass = (item: DynamicItem) => {
    const balanceValue = getNumberValue(item.balance ?? item['الرصيد المتبقي له']);
    if (balanceValue < 0) {
      return 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/20';
    }
    if (balanceValue > 0) {
      return 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-200/70 dark:border-blue-500/20';
    }
    return 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };
  const isSubscriberActive = (item: DynamicItem) => normalizeSubscriberStatus(item.status || item['حالة الحساب']) === 'active';
  const getInvestorName = (item: DynamicItem) => String(item.name || '-');
  const getManagerName = (item: DynamicItem) => String(item.name || `${item['الاسم الاول'] || item.firstName || ''} ${item['الاسم الثاني'] || item.lastName || ''}`.trim() || item.username || item['اسم الدخول'] || '-');
  const getManagerRole = (item: DynamicItem) => String(item.role || item['الصلاحية'] || (isRTL ? 'موظف' : 'Staff'));
  const isManagerActive = (item: DynamicItem) => item.status === 'active' || item['الحالة'] === 'نشط' || !item.status;
  const getIptvName = (item: DynamicItem) => String(item.name || '-');
  const getIptvStatusLabel = (item: DynamicItem) => t.management.iptv.statuses[String(item.status || '')] || String(item.status || '-');
  const getIptvServiceTypeLabel = (item: DynamicItem) => {
    const typeValue = String(item.serviceType || item.type || 'other');
    return t.management.iptv.serviceTypes[typeValue] || typeValue;
  };
  const getIptvBillingCycleLabel = (item: DynamicItem) => {
    const cycleValue = String(item.billingCycle || 'monthly');
    return t.management.iptv.billingCycles[cycleValue] || cycleValue;
  };
  const getIptvStatusClass = (item: DynamicItem) => (
    item.status === 'active'
      ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
      : item.status === 'suspended'
        ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
        : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
  );
  const getEntityValue = (item: DynamicItem, ...keys: string[]) => {
    for (const key of keys) {
      const value = item[key];
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return '';
  };
  const parseFlexibleDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;
    const normalized = raw.replace(/\./g, '/').replace(/-/g, '/');
    const parts = normalized.split('/');
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map(Number);
    if ([a, b, c].some((part) => Number.isNaN(part))) return null;
    if (String(parts[0]).length === 4) {
      const date = new Date(a, b - 1, c);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(c, b - 1, a);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const getDaysUntilDate = (value: unknown) => {
    const date = parseFlexibleDate(value);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  };
  const getSubscriberUsername = (item: DynamicItem) => getEntityValue(item, 'username', 'اسم الدخول', 'اسم المستخدم');
  const getSubscriberCode = (item: DynamicItem) => {
    const raw = getEntityValue(item, 'id', 'كود');
    return raw.replace(/^SUB-/i, '').trim();
  };
  const getSubscriberFirstName = (item: DynamicItem) => getEntityValue(item, 'firstname', 'firstName', 'الاسم الأول', 'الاسم الاول');
  const getSubscriberLastName = (item: DynamicItem) => getEntityValue(item, 'lastname', 'lastName', 'اسم العائلة', 'الاسم الثاني');
  const getSubscriberPhone = (item: DynamicItem) => getEntityValue(item, 'phone', 'رقم الموبايل', 'الهاتف');
  const getSubscriberPlan = (item: DynamicItem) => getEntityValue(item, 'plan', 'الباقة', 'سرعة الخط', 'profile');
  const getSubscriberParent = (item: DynamicItem) => getEntityValue(item, 'parent', 'تابع لـ', 'تابع إلى', 'تابع الي', 'الوكيل المسؤل', 'agent');
  const getSubscriberGroup = (item: DynamicItem) => getEntityValue(item, 'group', 'المجموعة', 'groupName', 'اسم المجموعة');
  const getSubscriberLocation = (item: DynamicItem) => getEntityValue(item, 'city', 'المدينة', 'location', 'عنوان المشترك', 'address');
  const getSubscriberSubType = (item: DynamicItem) => getEntityValue(item, 'subType', 'نوع الاشتراك');
  const getSubscriberExpiryValue = (item: DynamicItem) => getEntityValue(item, 'expiry', 'expiration', 'تاريخ انتهاء الاشتراك', 'تاريخ ناهية الاشتراك', 'تاريخ النهاية');
  const getSubscriberExpiryTimeValue = (item: DynamicItem) => getEntityValue(item, 'expiry_time', 'expiryTime', 'وقت الانتهاء', 'وقت نهاية الاشتراك');
  const getSubscriberDebtValue = (item: DynamicItem) => parseSupplierAmount(item['عليه دين'] ?? item.debt ?? 0);
  const getSubscriberMikrotikDisplayName = (item: DynamicItem) => getEntityValue(item, 'name', 'اسم العرض على المايكروتيك', 'الاسم الانجليزي', 'comment');
  const getSubscriberExpiryDateTime = (item: Record<string, unknown>) => {
    const expiryValue = String(item.expiry ?? item.expiration ?? item['تاريخ انتهاء الاشتراك'] ?? item['تاريخ ناهية الاشتراك'] ?? item['تاريخ النهاية'] ?? '').trim();
    const expiryDate = parseFlexibleDate(expiryValue);
    if (!expiryDate) return null;

    const expiryTimeValue = String(item.expiry_time ?? item.expiryTime ?? item['وقت الانتهاء'] ?? item['وقت نهاية الاشتراك'] ?? '').trim();
    const normalizedTime = toTimeWithSeconds(expiryTimeValue);
    const [hours, minutes, seconds] = normalizedTime ? normalizedTime.split(':').map((part) => parseInt(part, 10) || 0) : [23, 59, 59];
    const result = new Date(expiryDate);
    result.setHours(hours, minutes, seconds, 0);
    return result;
  };
  const isSubscriberServiceExpired = (item: Record<string, unknown>) => {
    const expiryAt = getSubscriberExpiryDateTime(item);
    if (!expiryAt) return false;
    return expiryAt.getTime() < Date.now();
  };
  const getSubscriberMikrotikAccessAction = (item: Record<string, unknown>) => {
    const normalizedStatus = normalizeSubscriberStatus(item.status || item['حالة الحساب']);
    if (normalizedStatus === 'expired') return 'delete';
    if (normalizedStatus === 'suspended') return 'disable';
    if (isSubscriberServiceExpired(item)) return 'disable';
    return 'enable';
  };
  const isSubscriberOnline = (item: DynamicItem) => {
    const username = getSubscriberUsername(item).trim();
    if (!username) return false;
    const normalizedUsername = username.toLowerCase();
    return onlineStatuses[username] === true || onlineStatuses[normalizedUsername] === true;
  };
  const getSubscriberConnectionState = (item: DynamicItem) => {
    if (isSubscriberOnline(item)) return 'online';
    return isSubscriberActive(item) ? 'active_offline' : 'offline';
  };
  const getSubscriberExpiryBucket = (item: DynamicItem) => {
    const days = getDaysUntilDate(getSubscriberExpiryValue(item));
    if (days === null) return 'unknown';
    if (days < 0) return 'expired';
    if (days === 0) return 'today';
    if (days <= 3) return 'three_days';
    if (days <= 7) return 'seven_days';
    return 'later';
  };
  const toUniqueOptions = (values: string[], allLabel: string) => [
    { value: 'all', label: allLabel },
    ...Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')).map((value) => ({ value, label: value })),
  ];
  const getRelativeRangeBucket = (value: number, values: number[]) => {
    if (value <= 0) return 'zero';
    const normalized = values.filter((item) => item > 0).sort((a, b) => a - b);
    if (normalized.length === 0) return 'zero';
    if (normalized.length === 1) return 'medium';
    const lowThreshold = normalized[Math.floor((normalized.length - 1) / 3)] ?? normalized[0];
    const highThreshold = normalized[Math.floor(((normalized.length - 1) * 2) / 3)] ?? normalized[normalized.length - 1];
    if (value <= lowThreshold) return 'low';
    if (value <= highThreshold) return 'medium';
    return 'high';
  };
  const getTabEntityLabel = () => {
    switch (activeSubTab) {
      case 'subscribers':
        return isRTL ? 'المشترك' : 'subscriber';
      case 'iptv':
        return isRTL ? 'خدمة رقمية' : 'digital service';
      case 'suppliers':
        return isRTL ? 'المورد' : 'supplier';
      case 'shareholders':
        return isRTL ? 'المستثمر' : 'investor';
      case 'managers':
        return isRTL ? 'العضو الإداري' : 'administrative member';
      default:
        return isRTL ? 'السجل' : 'record';
    }
  };
  const getAddButtonLabel = () => {
    switch (activeSubTab) {
      case 'subscribers':
        return t.management.subscribers.add;
      case 'iptv':
        return t.management.iptv.add;
      case 'suppliers':
        return t.management.suppliers.add;
      case 'shareholders':
        return isRTL ? 'إضافة مستثمر' : 'Add Investor';
      case 'managers':
        return isRTL ? 'إضافة عضو إداري' : 'Add Administrative Member';
      case 'directors':
        return isRTL ? 'إضافة مدير' : 'Add Director';
      case 'deputies':
        return isRTL ? 'إضافة نائب' : 'Add Deputy';
      case 'admins':
        return t.management.admins.add;
      default:
        return isRTL ? 'إضافة عنصر' : 'Add Item';
    }
  };

  const parseSupplierAmount = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '-') return 0;
    const isNegative = raw.includes('(') && raw.includes(')');
    const numeric = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    return isNegative ? -numeric : numeric;
  };

  const formatSupplierAmount = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '-') return '-';
    return formatCurrency(parseSupplierAmount(raw), state.currency, state.lang, 2);
  };
  const getStringValue = (value: unknown, fallback = '') => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
  };
  const getNumberValue = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };
  const formatIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const normalizeTimeInput = (value: string) => normalizeDigits(value).replace(/[^\d:]/g, '').slice(0, 8);
  const toTimeWithSeconds = (value: string) => {
    const normalized = normalizeTimeInput(value);
    if (!normalized) return '';
    const parts = normalized.split(':').filter(Boolean);
    const hours = String(Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10) || 0))).padStart(2, '0');
    const minutes = String(Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0))).padStart(2, '0');
    const seconds = String(Math.min(59, Math.max(0, parseInt(parts[2] || '0', 10) || 0))).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  const getProfileDurationConfig = (profile?: NetworkProfile | null) => {
    if (!profile) return { value: 1, unit: 'months' };
    const durationValue = profile.limitByDuration && typeof profile.limitByDuration === 'object' && (profile.limitByDuration as Record<string, unknown>).enabled
      ? Number((profile.limitByDuration as Record<string, unknown>).value || 1)
      : Number(profile.validityValue || 1);
    const durationUnit = profile.limitByDuration && typeof profile.limitByDuration === 'object' && (profile.limitByDuration as Record<string, unknown>).enabled
      ? String((profile.limitByDuration as Record<string, unknown>).unit || 'months')
      : String(profile.validityUnit || 'months');
    return { value: durationValue || 1, unit: durationUnit || 'months' };
  };
  const applySubscriberPlanDefaults = (profile?: NetworkProfile | null) => {
    if (!profile) return;

    const now = new Date();
    const expiryDate = new Date(now);
    const { value, unit } = getProfileDurationConfig(profile);

    if (unit === 'months') {
      expiryDate.setMonth(expiryDate.getMonth() + value);
    } else if (unit === 'days') {
      expiryDate.setDate(expiryDate.getDate() + value);
    } else if (unit === 'hours') {
      expiryDate.setHours(expiryDate.getHours() + value);
    } else if (unit === 'minutes') {
      expiryDate.setMinutes(expiryDate.getMinutes() + value);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const hasFixedTime = Boolean(profile.fixedExpirationTimeEnabled && profile.fixedExpirationTime);
    if (hasFixedTime) {
      const [hh, mm] = String(profile.fixedExpirationTime).split(':');
      expiryDate.setHours(parseInt(hh || '0', 10) || 0, parseInt(mm || '0', 10) || 0, 0, 0);
    }

    const nextExpiryDate = formatIsoDate(expiryDate);
    const nextExpiryTime = hasFixedTime
      ? toTimeWithSeconds(String(profile.fixedExpirationTime))
      : formatTime(expiryDate, { second: '2-digit' });
    const nextPrice = Number(profile.price || 0);

    setSubscriberFormField('bill', String(nextPrice), {
      'قيمة الفاتورة': String(nextPrice),
      expiry: nextExpiryDate,
      'تاريخ الانتهاء': nextExpiryDate,
      expiry_time: nextExpiryTime,
      'وقت الانتهاء': nextExpiryTime,
      price: String(nextPrice),
    });
  };
  const buildSubscriberPayload = <T extends Record<string, unknown>>(source: T): T & Record<string, unknown> => {
    const firstName = getStringValue(source.firstname ?? source.firstName ?? source['الاسم الأول']);
    const lastName = getStringValue(source.lastname ?? source.lastName ?? source['اسم العائلة']);
    const username = getStringValue(source.username ?? source['اسم المستخدم'] ?? source['اسم الدخول']);
    const password = getStringValue(source.password ?? source['كلمة المرور']);
    const status = normalizeSubscriberStatus(source.status ?? source['حالة الحساب']);
    const statusArabic = status === 'suspended' ? 'معلق' : status === 'expired' ? 'منتهي' : 'مفعل';
    const displayName = getStringValue(
      source.name ??
      source['اسم العرض على المايكروتيك'] ??
      source['الاسم الانجليزي']
    );

    return {
      ...source,
      firstname: firstName,
      'الاسم الأول': firstName,
      lastname: lastName,
      'اسم العائلة': lastName,
      username,
      'اسم المستخدم': username,
      'اسم الدخول': username,
      password,
      'كلمة المرور': password,
      status,
      'حالة الحساب': statusArabic,
      name: displayName,
      'اسم العرض على المايكروتيك': displayName,
      balance: String(source.balance ?? source['الرصيد المتبقي له'] ?? '0'),
      'الرصيد المتبقي له': String(source.balance ?? source['الرصيد المتبقي له'] ?? '0'),
      debt: String(source.debt ?? source['عليه دين'] ?? '0'),
      'عليه دين': String(source.debt ?? source['عليه دين'] ?? '0'),
    };
  };

  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>(() => {
    const saved = localStorage.getItem('sas4_active_subtab');
    if (saved) return saved as ManagementSubTab;
    
    if (state.role === 'super_admin') return 'subscribers';
    if (hasPermission('view_subscribers')) return 'subscribers';
    if (hasPermission('view_iptv')) return 'iptv';
    if (hasPermission('view_suppliers')) return 'suppliers';
    if (hasPermission('view_shareholders')) return 'shareholders';
    if (hasPermission('view_admins')) return 'managers';
    if (hasPermission('manage_security_groups')) return 'groups';
    return 'subscribers';
  });

  React.useEffect(() => {
    localStorage.setItem('sas4_active_subtab', activeSubTab);
  }, [activeSubTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DynamicItem | null>(null);
  const [newItem, setNewItem] = useState<Record<string, unknown>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnControls, setShowColumnControls] = useState(false);
  const [subscriberWorkspaceMode, setSubscriberWorkspaceMode] = useState<'list' | 'add' | 'edit'>('list');
  const [entityWorkspaceMode, setEntityWorkspaceMode] = useState<'list' | 'add' | 'edit'>('list');
  const [isSubscriberHelpOpen, setIsSubscriberHelpOpen] = useState(false);
  const [isEntityHelpOpen, setIsEntityHelpOpen] = useState(false);
  const [subscriberQuickFilter, setSubscriberQuickFilter] = useState<'all' | 'active' | 'online'>('all');
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberPageSize, setSubscriberPageSize] = useState(10);
  const [entityQuickFilter, setEntityQuickFilter] = useState<'all' | 'debt' | 'negative' | 'high_shares' | 'with_dividends' | 'active' | 'limited' | 'service_active' | 'service_profitable'>('all');
  const [entityPage, setEntityPage] = useState(1);
  const [entityPageSize, setEntityPageSize] = useState(10);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersByTab>(DEFAULT_ADVANCED_FILTERS);
  const [showName, setShowName] = useState(() => localStorage.getItem('sas4_mgmt_show_name') !== 'false');
  const [showChannel, setShowChannel] = useState(() => localStorage.getItem('sas4_mgmt_show_channel') !== 'false');

  React.useEffect(() => {
    localStorage.setItem('sas4_mgmt_show_name', String(showName));
  }, [showName]);

  React.useEffect(() => {
    localStorage.setItem('sas4_mgmt_show_channel', String(showChannel));
  }, [showChannel]);

  React.useEffect(() => {
    if (!showFilters) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilters(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilters]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activationOption, setActivationOption] = useState<'today' | 'first_of_month'>('today');
  const [isActivating, setIsActivating] = useState(false);
  const [subToActivate, setSubToActivate] = useState<DynamicItem | null>(null);
  const [activationTarget, setActivationTarget] = useState('all');
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpTarget, setTopUpTarget] = useState<DynamicItem | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [disconnectCandidate, setDisconnectCandidate] = useState<string | null>(null);
  const [deleteSecretCandidate, setDeleteSecretCandidate] = useState<string | null>(null);
  const [bulkDisconnectConfirmOpen, setBulkDisconnectConfirmOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [isTemplatePromptOpen, setIsTemplatePromptOpen] = useState(false);

  // ─── MIKROTIK SYNC STATE ────────────────────────────────────────────────────
  // ─── NETWORK PROFILES (for plan dropdown) ─────────────────────────────────
  const [networkProfiles, setNetworkProfiles] = useState<NetworkProfile[]>([]);
  const [subscriberGroupOptions, setSubscriberGroupOptions] = useState<string[]>([]);

  const loadNetworkProfiles = async () => {
    try {
      const profiles = await fetchProfiles();
      setNetworkProfiles(profiles || []);
    } catch (e) {
      setNetworkProfiles([]);
    }
  };

  const loadRoutersForSubscriberForm = async () => {
    try {
      const routers = await fetchRoutersList();
      setRoutersList(Array.isArray(routers) ? routers : []);
    } catch (e) {
      setRoutersList([]);
    }
  };

  const loadSubscriberGroups = async () => {
    try {
      const data = await getMessageData();
      const groups = Array.isArray(data?.groups)
        ? data.groups
            .map((group: unknown) => {
              if (typeof group === 'string') return group.trim();
              if (group && typeof group === 'object') {
                const value = (group as Record<string, unknown>).name ?? (group as Record<string, unknown>).label ?? (group as Record<string, unknown>).groupName;
                return String(value || '').trim();
              }
              return '';
            })
            .filter(Boolean)
        : [];
      setSubscriberGroupOptions(Array.from(new Set(groups as string[])).sort((a, b) => a.localeCompare(b)));
    } catch (e) {
      setSubscriberGroupOptions([]);
    }
  };

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncingSubscriber, setSyncingSubscriber] = useState<DynamicItem | null>(null);
  const [syncModalMode, setSyncModalMode] = useState<'single' | 'bulk'>('single');
  const [syncTarget, setSyncTarget] = useState('all');
  const [routersList, setRoutersList] = useState<RouterRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBulkSyncingSubscribers, setIsBulkSyncingSubscribers] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: SyncResultDetail[] } | null>(null);
  const useSubscriberWorkspace = activeSubTab === 'subscribers';
  const useEntityWorkspace = activeSubTab === 'suppliers' || activeSubTab === 'shareholders' || activeSubTab === 'managers' || activeSubTab === 'iptv';

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

  const SUPPLIER_COLUMNS = [
    { id: 'code', label: isRTL ? 'الكود' : 'Code', defaultVisible: true, key: 'كود' },
    { id: 'name', label: isRTL ? 'اسم المورد' : 'Supplier Name', defaultVisible: true, key: 'اسم المورد' },
    { id: 'debt', label: isRTL ? 'مدين' : 'Debt', defaultVisible: true, key: 'مدين' },
    { id: 'paid', label: isRTL ? 'مسدد' : 'Paid', defaultVisible: true, key: 'مسدد' },
    { id: 'balance', label: isRTL ? 'الرصيد' : 'Balance', defaultVisible: true, key: 'الرصيد' },
    { id: 'notes', label: isRTL ? 'ملاحظات' : 'Notes', defaultVisible: false, key: 'ملاحظات' }
  ];

  const MANAGER_FIELDS = [
    { key: 'الصلاحية', label: isRTL ? 'الصلاحيات أو المجموعة' : 'Permissions / Group', nameField: false },
    { key: 'الرصيد', label: isRTL ? 'الرصيد' : 'Balance', nameField: false },
    { key: 'القروض', label: isRTL ? 'القروض' : 'Loans', nameField: false },
    { key: 'تابع لـ', label: isRTL ? 'تابع لـ' : 'Parent', nameField: false },
    { key: 'عدد المشتركين', label: isRTL ? 'عدد المشتركين' : 'Subscribers', nameField: false },
    { key: 'النقاط', label: isRTL ? 'النقاط' : 'Points', nameField: false },
    { key: 'نسبة الخصم', label: isRTL ? 'نسبة الخصم' : 'Discount', nameField: false },
    { key: 'تاريخ الانشاء', label: isRTL ? 'تاريخ الانشاء' : 'Created At', nameField: false },
    { key: 'المدينة', label: isRTL ? 'المدينة' : 'City', nameField: false }
  ];

  const MANAGER_COLUMNS = [
    { id: 'name', label: isRTL ? 'الاسم' : 'Name', defaultVisible: true },
    { id: 'username', label: isRTL ? 'اسم المستخدم' : 'Username', defaultVisible: true },
    { id: 'role', label: isRTL ? 'الرتبة / المجموعة' : 'Role / Group', defaultVisible: true },
    { id: 'balance', label: isRTL ? 'الرصيد' : 'Balance', defaultVisible: true },
    { id: 'maxTxLimit', label: isRTL ? 'الحد المالي' : 'Tx Limit', defaultVisible: true },
    { id: 'status', label: isRTL ? 'الحالة' : 'Status', defaultVisible: true },
    { id: 'loans', label: isRTL ? 'القروض' : 'Loans', defaultVisible: false, key: 'القروض' },
    { id: 'parent', label: isRTL ? 'تابع لـ' : 'Parent', defaultVisible: false, key: 'تابع لـ' },
    { id: 'subscribersCount', label: isRTL ? 'عدد المشتركين' : 'Subscribers', defaultVisible: false, key: 'عدد المشتركين' },
    { id: 'points', label: isRTL ? 'النقاط' : 'Points', defaultVisible: false, key: 'النقاط' },
    { id: 'discount', label: isRTL ? 'نسبة الخصم' : 'Discount', defaultVisible: false, key: 'نسبة الخصم' },
    { id: 'createdAt', label: isRTL ? 'تاريخ الانشاء' : 'Created At', defaultVisible: false, key: 'تاريخ الانشاء' },
    { id: 'city', label: isRTL ? 'المدينة' : 'City', defaultVisible: false, key: 'المدينة' }
  ];

  const INVESTOR_COLUMNS = [
    { id: 'name', label: isRTL ? 'الاسم الكامل' : 'Full Name', defaultVisible: true },
    { id: 'shares', label: isRTL ? 'عدد الأسهم المملوكة' : 'Shares Owned', defaultVisible: true },
    { id: 'buyPrice', label: isRTL ? 'سعر الأسهم عند الشراء' : 'Buy Price', defaultVisible: true },
    { id: 'ownership', label: isRTL ? 'نسبة الملكية' : 'Ownership %', defaultVisible: true },
    { id: 'investment', label: isRTL ? 'إجمالي الاستثمار' : 'Total Investment', defaultVisible: true },
    { id: 'dividends', label: isRTL ? 'الأرباح المستلمة' : 'Dividends Paid', defaultVisible: true },
    { id: 'joinDate', label: isRTL ? 'تاريخ الانضمام' : 'Join Date', defaultVisible: false },
    { id: 'status', label: isRTL ? 'الحالة' : 'Status', defaultVisible: false }
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sas4_visible_columns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse visible columns from localStorage', e);
      }
    }
    
    const initial: Record<string, boolean> = {};
    SUBSCRIBER_COLUMNS.forEach(col => initial[col.id] = col.defaultVisible);
    SUPPLIER_COLUMNS.forEach(col => initial[col.id] = col.defaultVisible);
    MANAGER_COLUMNS.forEach(col => initial[col.id] = col.defaultVisible);
    INVESTOR_COLUMNS.forEach(col => initial[col.id] = col.defaultVisible);
    return initial;
  });

  // ─── LIVE DATA FROM API ─────────────────────────────────────────────────────
  const [subscribers, setSubscribers] = useState<DynamicItem[]>([]);
  const [suppliers, setSuppliers] = useState<DynamicItem[]>([]);
  const [shareholders, setShareholders] = useState<DynamicItem[]>([]);
  const [managers, setManagers] = useState<DynamicItem[]>([]);
  const [iptvSubscribers, setIptvSubscribers] = useState<DynamicItem[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  const activeTableColumns = useMemo<TableColumnDef[]>(() => {
    if (activeSubTab === 'subscribers') {
      return SUBSCRIBER_COLUMNS
        .filter((col) => visibleColumns[col.id])
        .map((col) => ({
          id: col.id,
          label: col.label,
          render: (item: DynamicItem) => {
            switch (col.id) {
              case 'id':
                return <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{getSubscriberCode(item) || '-'}</span>;
              case 'firstname':
                return <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getSubscriberFirstName(item) || '-'}</span>;
              case 'lastname':
                return <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getSubscriberLastName(item) || '-'}</span>;
              case 'username':
                return <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{getSubscriberUsername(item) || '-'}</span>;
              case 'phone':
                return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{getSubscriberPhone(item) || '-'}</span>;
              case 'idNumber':
                return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'idNumber', 'رقم الهوية') || '-'}</span>;
              case 'password':
                return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'password', 'كلمة المرور') || '-'}</span>;
              case 'status':
                return (
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getSubscriberStatusClass(item)}`}>
                    {getSubscriberStatusLabel(item)}
                  </span>
                );
              case 'plan':
                return <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{getSubscriberPlan(item) || '-'}</span>;
              case 'balance':
                return <span className={`inline-flex px-2 py-1 rounded-lg text-sm font-black whitespace-nowrap ${getSubscriberBalanceClass(item)}`}>{formatCurrency(getNumberValue(item.balance ?? item['الرصيد المتبقي له']), state.currency, state.lang)}</span>;
              case 'debt':
                return <span className="text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrency(getNumberValue(item['عليه دين']), state.currency, state.lang)}</span>;
              case 'paid':
                return <span className="text-sm font-black text-teal-600 dark:text-teal-400 whitespace-nowrap">{formatCurrency(getNumberValue(item['قام بتسديد']), state.currency, state.lang)}</span>;
              case 'bill':
                return <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{getEntityValue(item, 'bill', 'قيمة الفاتورة') || '-'}</span>;
              case 'agent':
                return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{getEntityValue(item, 'agent', 'الوكيل المسؤل') || '-'}</span>;
              case 'subType':
                return <span className="text-xs text-slate-600 dark:text-slate-400">{getSubscriberSubType(item) || '-'}</span>;
              case 'startDate':
                return <span className="font-mono text-[10px] text-slate-500">{getEntityValue(item, 'startDate', 'تاريخ بداية العقد مع الشركة') || '-'}</span>;
              case 'expiry':
                return <span className="font-mono text-[10px] text-slate-500">{getSubscriberExpiryValue(item) || '-'}</span>;
              case 'expiry_time':
                return <span className="font-mono text-[10px] text-slate-500">{getSubscriberExpiryTimeValue(item) || '-'}</span>;
              case 'address':
                return <span className="text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'address', 'عنوان المشترك') || '-'}</span>;
              case 'city':
                return <span className="text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'city', 'المدينة') || '-'}</span>;
              case 'email':
                return <span className="text-[10px] text-slate-500">{getEntityValue(item, 'email') || '-'}</span>;
              case 'ip_litebeam':
                return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'ip', 'ip_litebeam') || '-'}</span>;
              case 'mac_litebeam':
                return <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, 'mac', 'mac_litebeam') || '-'}</span>;
              case 'live':
                return (
                  <div className="flex items-center justify-center shrink-0">
                    {isSubscriberOnline(item) ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-black text-[9px] bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ON
                      </span>
                    ) : getSubscriberUsername(item).trim() ? (
                      <span className="text-[9px] text-slate-400 font-bold opacity-60">OFF</span>
                    ) : (
                      <Activity size={10} className="text-slate-300 animate-spin" />
                    )}
                  </div>
                );
              case 'notes':
                return <span className="text-xs text-slate-500 dark:text-slate-500">{getEntityValue(item, 'notes', 'ملاحظات اخرى') || '-'}</span>;
              default:
                return <span className="text-xs text-slate-500">{getEntityValue(item, col.id, col.key || '') || '-'}</span>;
            }
          },
        }));
    }

    if (activeSubTab === 'suppliers') {
      return SUPPLIER_COLUMNS
        .filter((col) => visibleColumns[col.id])
        .map((col) => ({
          id: col.id,
          label: col.label,
          headerClassName: `${col.id === 'debt' ? 'hidden md:table-cell ' : ''}${col.id === 'paid' ? 'hidden lg:table-cell ' : ''}${col.id === 'notes' ? 'hidden xl:table-cell ' : ''}`.trim(),
          cellClassName: `${col.id === 'debt' ? 'hidden md:table-cell ' : ''}${col.id === 'paid' ? 'hidden lg:table-cell ' : ''}${col.id === 'notes' ? 'hidden xl:table-cell ' : ''}`.trim(),
          render: (item: DynamicItem) => {
            switch (col.id) {
              case 'code':
                return (
                  <span className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-300 font-mono">
                    {getSupplierCode(item) || '-'}
                  </span>
                );
              case 'name':
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                      {(getSupplierName(item) || '?').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{getSupplierName(item) || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">{item.id}</p>
                    </div>
                  </div>
                );
              case 'debt':
                return <span className="text-sm font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatSupplierAmount(item['مدين'])}</span>;
              case 'paid':
                return <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatSupplierAmount(item['مسدد'])}</span>;
              case 'balance': {
                const balanceValue = parseSupplierAmount(item['الرصيد']);
                const balanceClass = balanceValue < 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : balanceValue > 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400';
                return <span className={`text-sm font-black whitespace-nowrap ${balanceClass}`}>{formatSupplierAmount(item['الرصيد'])}</span>;
              }
              case 'notes':
                return <span className="text-xs text-slate-500 dark:text-slate-400">{getSupplierNotes(item) || '-'}</span>;
              default:
                return <span className="text-xs text-slate-500">{getEntityValue(item, col.key || '', col.id) || '-'}</span>;
            }
          },
        }));
    }

    if (activeSubTab === 'shareholders') {
      return INVESTOR_COLUMNS
        .filter((col) => visibleColumns[col.id])
        .map((col) => ({
          id: col.id,
          label: col.label,
          headerClassName: `${['buyPrice', 'ownership'].includes(col.id) ? 'hidden md:table-cell ' : ''}${col.id === 'dividends' ? 'hidden lg:table-cell ' : ''}`.trim(),
          cellClassName: `${['buyPrice', 'ownership'].includes(col.id) ? 'hidden md:table-cell ' : ''}${col.id === 'dividends' ? 'hidden lg:table-cell ' : ''}`.trim(),
          render: (item: DynamicItem) => {
            switch (col.id) {
              case 'name':
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">
                      {getStringValue(item.name, '?').charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{getStringValue(item.name, '-')}</p>
                  </div>
                );
              case 'shares':
                return (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newShares = Math.max(0, getNumberValue(item.shares) - 10);
                        setShareholders(prev => prev.map(s => s.id === item.id ? { ...s, shares: newShares } : s));
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition-colors text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[50px] text-center">
                      {formatNumber(getNumberValue(item.shares))}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newShares = getNumberValue(item.shares) + 10;
                        setShareholders(prev => prev.map(s => s.id === item.id ? { ...s, shares: newShares } : s));
                      }}
                      className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors text-xs"
                    >
                      +
                    </button>
                  </div>
                );
              case 'buyPrice':
                return <span className="text-xs font-black text-slate-600 dark:text-slate-400">{formatCurrency(getNumberValue(item.buyPrice), state.currency, state.lang)}</span>;
              case 'ownership':
                return <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{getStringValue(item.ownership, '0%')}</span>;
              case 'investment':
                return <span className="text-sm font-black text-slate-800 dark:text-slate-200">{formatCurrency(getNumberValue(item.investment), state.currency, state.lang)}</span>;
              case 'dividends':
                return <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(getNumberValue(item.dividends), state.currency, state.lang)}</span>;
              default:
                return <span className="text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, col.id) || '-'}</span>;
            }
          },
        }));
    }

    if (activeSubTab === 'managers') {
      return MANAGER_COLUMNS
        .filter((col) => visibleColumns[col.id])
        .map((col) => ({
          id: col.id,
          label: col.label,
          render: (item: DynamicItem) => {
            switch (col.id) {
              case 'name':
                return (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      (item.role === 'super_admin' || item['الصلاحية'] === 'Super Admin') ? 'bg-amber-500/10 text-amber-600' : 'bg-teal-500/10 text-teal-600'
                    }`}>
                      {getStringValue(item.name || item.username || item['اسم الدخول'], '?').charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {item.name || `${item['الاسم الاول'] || item.firstName || ''} ${item['الاسم الثاني'] || item.lastName || ''}`.trim() || item.username || item['اسم الدخول']}
                    </p>
                  </div>
                );
              case 'username':
                return <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{item.username || item['اسم الدخول'] || '-'}</span>;
              case 'role':
                return (
                  <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter truncate max-w-[120px] ${
                    (item.role === 'super_admin' || item['الصلاحية'] === 'Super Admin') ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                    {item.role || item['الصلاحية'] || (isRTL ? 'موظف' : 'Staff')}
                  </span>
                );
              case 'balance':
                return <span className="text-sm font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatCurrency(getNumberValue(item.balance ?? item['الرصيد']), state.currency, state.lang)}</span>;
              case 'maxTxLimit':
                return (item.maxTxLimit || item['الحد المالي']) ? (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(getNumberValue(item.maxTxLimit ?? item['الحد المالي']), state.currency, state.lang)}
                    </span>
                    <span className="text-[8px] text-emerald-500 uppercase font-black">Limit ON</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">{isRTL ? 'بدون قيود' : 'No Limit'}</span>
                );
              case 'status':
                return (
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    (item.status === 'active' || item['الحالة'] === 'نشط' || !item.status) ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                  }`}>
                    {(item.status === 'active' || item['الحالة'] === 'نشط' || !item.status) ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'مجمد' : 'Disabled')}
                  </span>
                );
              default:
                return <span className="text-xs text-slate-600 dark:text-slate-400">{getEntityValue(item, col.id, col.key || '') || '-'}</span>;
            }
          },
        }));
    }

    if (activeSubTab === 'iptv') {
      const cols: TableColumnDef[] = [];
      if (showName) {
        cols.push({
          id: 'name',
          label: t.management.iptv.table.name,
          render: (item) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 font-bold text-xs shrink-0">
                {getStringValue(item.name, '?').charAt(0)}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{getStringValue(item.name, '-')}</p>
            </div>
          ),
        });
      }
      if (showChannel) {
        cols.push({
          id: 'serviceType',
          label: t.management.iptv.table.serviceType,
          headerClassName: 'hidden sm:table-cell',
          cellClassName: 'hidden sm:table-cell',
          render: (item) => <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{getIptvServiceTypeLabel(item)}</span>,
        });
      }
      cols.push(
        {
          id: 'phone',
          label: t.management.iptv.table.phone,
          headerClassName: 'hidden md:table-cell',
          cellClassName: 'hidden md:table-cell',
          render: (item) => <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{getEntityValue(item, 'phone') || '-'}</span>,
        },
        {
          id: 'platform',
          label: t.management.iptv.table.provider,
          render: (item) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{getEntityValue(item, 'platform') || '-'}</span>,
        },
        {
          id: 'billingCycle',
          label: t.management.iptv.table.billingCycle,
          headerClassName: 'hidden lg:table-cell',
          cellClassName: 'hidden lg:table-cell',
          render: (item) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{getIptvBillingCycleLabel(item)}</span>,
        },
        {
          id: 'host',
          label: t.management.iptv.table.host,
          render: (item) => <span className="text-xs font-mono text-slate-500">{getEntityValue(item, 'host') || '-'}</span>,
        },
        {
          id: 'price',
          label: t.management.iptv.table.price,
          render: (item) => <span className="text-sm font-black text-slate-800 dark:text-slate-200">{formatCurrency(getNumberValue(item.price), state.currency, state.lang)}</span>,
        },
        {
          id: 'cost',
          label: t.management.iptv.table.cost,
          render: (item) => <span className="text-sm font-black text-amber-600 dark:text-amber-400">{formatCurrency(getNumberValue(item.cost), state.currency, state.lang)}</span>,
        },
        {
          id: 'status',
          label: t.management.iptv.table.status,
          render: (item) => (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
              item.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' :
              item.status === 'suspended' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
              'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
            }`}>
              {t.management.iptv.statuses[getStringValue(item.status)] || getStringValue(item.status)}
            </span>
          ),
        },
      );
      return cols;
    }

    return [];
  }, [
    activeSubTab,
    visibleColumns,
    showName,
    showChannel,
    onlineStatuses,
    isRTL,
    state.currency,
    state.lang,
    t.management.iptv.table.name,
    t.management.iptv.table.phone,
    t.management.iptv.table.host,
    t.management.iptv.table.provider,
    t.management.iptv.table.billingCycle,
    t.management.iptv.table.serviceType,
    t.management.iptv.table.price,
    t.management.iptv.table.cost,
    t.management.iptv.table.status,
    t.management.iptv.serviceTypes,
    t.management.iptv.billingCycles,
    t.management.iptv.statuses,
    t.management.subscribers.statuses,
  ]);

  React.useEffect(() => {
    localStorage.setItem('sas4_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const supplierSummary = useMemo(() => {
    const totalDebt = suppliers.reduce((sum, item) => sum + parseSupplierAmount(item['مدين']), 0);
    const totalPaid = suppliers.reduce((sum, item) => sum + parseSupplierAmount(item['مسدد']), 0);
    const totalBalance = suppliers.reduce((sum, item) => sum + parseSupplierAmount(item['الرصيد']), 0);
    const unsettledCount = suppliers.filter(item => Math.abs(parseSupplierAmount(item['الرصيد'])) > 0.0001).length;

    return {
      count: suppliers.length,
      totalDebt,
      totalPaid,
      totalBalance,
      unsettledCount
    };
  }, [suppliers]);

  const subscriberSummary = useMemo(() => {
    const activeCount = subscribers.filter(isSubscriberActive).length;
    const onlineCount = subscribers.filter((item) => isSubscriberOnline(item)).length;
    const totalBalance = subscribers.reduce((sum, item) => sum + (parseFloat(item.balance || item['الرصيد المتبقي له'] || 0) || 0), 0);
    const debtCount = subscribers.filter(item => (parseFloat(item['عليه دين'] || 0) || 0) > 0).length;

    return { count: subscribers.length, activeCount, onlineCount, totalBalance, debtCount };
  }, [subscribers, onlineStatuses]);

  const subscriberManagerOptions = useMemo(() => {
    const fromState = (state.teamMembers || []).map((member) => ({
      value: String(member.username || member['اسم الدخول'] || member.name || '').trim(),
      label: String(member.name || member.username || member['اسم الدخول'] || '').trim(),
    }));
    const fromManagers = managers.map((manager) => ({
      value: String(manager.username || manager['اسم الدخول'] || manager.name || '').trim(),
      label: String(manager.name || manager.username || manager['اسم الدخول'] || '').trim(),
    }));

    return [...fromState, ...fromManagers].filter((option, index, array) => {
      if (!option.value || !option.label) return false;
      return array.findIndex((item) => item.value === option.value) === index;
    });
  }, [managers, state.teamMembers]);

  const subscriberFieldHelp = useMemo<Record<string, string>>(() => ({
    status: isRTL ? 'تحدد ما إذا كان الاشتراك مفعلاً أو موقوفًا أو منتهيًا داخل النظام.' : 'Controls whether the subscription is active, suspended, or expired in the system.',
    subType: isRTL ? 'يحدد نوع الخدمة الأساسية مثل PPPoE أو Hotspot أو اشتراك ثابت. يؤثر على طريقة إنشاء السر في المايكروتيك.' : 'Defines the service type such as PPPoE, Hotspot, or a static subscription. It affects how the secret is created in MikroTik.',
    plan: isRTL ? 'اختر الباقة من الباقات المعرفة مسبقًا. منها يتم أخذ السعر ومدة الانتهاء ووقت الانتهاء الافتراضي وخصائص الخدمة.' : 'Choose a predefined package. It provides the default price, duration, expiry time, and service settings.',
    parent: isRTL ? 'يحدد المدير أو الوكيل المسؤول عن هذا المشترك إداريًا وماليًا.' : 'Assigns the manager or agent responsible for this subscriber administratively and financially.',
    router: isRTL ? 'الراوتر أو الموقع الذي يرتبط به هذا المشترك ميدانيًا أو شبكيًا.' : 'The router or site this subscriber is associated with.',
    group: isRTL ? 'تجميع منطقي للمشتركين حسب منطقة أو حملة أو تصنيف داخلي.' : 'A logical grouping for subscribers by area, campaign, or internal classification.',
    expiry: isRTL ? 'تاريخ انتهاء الاشتراك. يملأ تلقائيًا من الباقة ويمكن تعديله يدويًا. إذا انتهى التاريخ يتوقف وصول المشترك للإنترنت تلقائيًا.' : 'Subscription expiry date. Filled from the package first and can be edited manually. When this date passes, internet access is automatically stopped.',
    expiryTime: isRTL ? 'وقت انتهاء الخدمة خلال يوم الانتهاء. اختره من القوائم بالساعات والدقائق والثواني و ص/م أو AM/PM حسب لغة النظام.' : 'Service expiry time on the expiry day. Choose it from lists for hours, minutes, seconds, and AM/PM depending on the current language.',
    firstName: isRTL ? 'الاسم الأول الحقيقي للمشترك كما تريد ظهوره في النظام.' : 'The subscriber real first name as shown inside the system.',
    lastName: isRTL ? 'اسم العائلة أو الاسم الثاني للمشترك.' : 'The subscriber family or last name.',
    username: isRTL ? 'اسم الدخول الفعلي إلى خدمة المايكروتيك.' : 'The actual username used to log in to the MikroTik service.',
    password: isRTL ? 'كلمة المرور الفعلية التي يستخدمها المشترك للدخول.' : 'The actual password used by the subscriber to log in.',
    mikrotikName: isRTL ? 'اسم لاتيني أو تعليق يظهر داخل المايكروتيك لتمييز المشترك هناك.' : 'A Latin display/comment name used to identify the subscriber inside MikroTik.',
    phone: isRTL ? 'رقم هاتف المشترك للتواصل والرسائل.' : 'The subscriber phone number used for contact and messaging.',
    idNumber: isRTL ? 'رقم الهوية أو الرقم الوطني إذا كنت تريد توثيق المشترك.' : 'National or identity number used to document the subscriber.',
    email: isRTL ? 'البريد الإلكتروني للمراسلات والتنبيهات إن وجد.' : 'Email address for notifications and correspondence, if available.',
    city: isRTL ? 'المدينة الرئيسية التي ينتمي لها المشترك.' : 'The main city this subscriber belongs to.',
    location: isRTL ? 'الموقع أو الحي أو الوصف الجغرافي المختصر للمشترك.' : 'Area, location, or short geographic descriptor for the subscriber.',
    balance: isRTL ? 'الرصيد الحالي سيأتي من النظام المالي ولا يعدل يدويًا هنا.' : 'Current balance will come from the financial system and is not edited here manually.',
    debt: isRTL ? 'المديونية الحالية ستأتي من النظام المالي ولا تعدل يدويًا هنا.' : 'Current debt will come from the financial system and is not edited here manually.',
    bill: isRTL ? 'قيمة الفاتورة الأساسية للمشترك، وعادةً تؤخذ من الباقة.' : 'Base bill value for the subscriber, usually taken from the selected package.',
    rewardPoints: isRTL ? 'النقاط التشجيعية أو نقاط الولاء التي قد تستخدم لاحقًا.' : 'Reward or loyalty points that can be used later.',
    litebeamIp: isRTL ? 'عنوان IP الخاص بجهاز اللايت بيم لدى المشترك.' : 'The LiteBeam device IP address for the subscriber.',
    litebeamMac: isRTL ? 'عنوان MAC الخاص بجهاز اللايت بيم لدى المشترك.' : 'The LiteBeam device MAC address for the subscriber.',
    address: isRTL ? 'العنوان التفصيلي للمشترك.' : 'The detailed address of the subscriber.',
    notes: isRTL ? 'أي ملاحظات إدارية أو فنية تخص هذا المشترك.' : 'Any administrative or technical notes related to this subscriber.',
  }), [isRTL]);

  const subscriberHelpSections = useMemo(() => ([
    {
      title: isRTL ? 'معلومات الخدمة' : 'Service Details',
      items: [
        ['الحالة', subscriberFieldHelp.status],
        [isRTL ? 'نوع الاشتراك' : 'Subscription Type', subscriberFieldHelp.subType],
        [isRTL ? 'الباقة' : 'Plan', subscriberFieldHelp.plan],
        [isRTL ? 'تابع إلى مدير' : 'Assigned Manager', subscriberFieldHelp.parent],
        [isRTL ? 'الراوتر / الموقع' : 'Router / Site', subscriberFieldHelp.router],
        [isRTL ? 'المجموعة' : 'Group', subscriberFieldHelp.group],
        [isRTL ? 'تاريخ الانتهاء' : 'Expiry Date', subscriberFieldHelp.expiry],
        [isRTL ? 'وقت الانتهاء' : 'Expiry Time', subscriberFieldHelp.expiryTime],
      ],
    },
    {
      title: isRTL ? 'الهوية والتواصل' : 'Identity & Contact',
      items: [
        [isRTL ? 'الاسم الأول' : 'First Name', subscriberFieldHelp.firstName],
        [isRTL ? 'اسم العائلة' : 'Last Name', subscriberFieldHelp.lastName],
        [isRTL ? 'اسم المستخدم' : 'Username', subscriberFieldHelp.username],
        [isRTL ? 'كلمة المرور' : 'Password', subscriberFieldHelp.password],
        [isRTL ? 'اسم العرض على المايكروتيك' : 'MikroTik Display Name', subscriberFieldHelp.mikrotikName],
        [isRTL ? 'الهاتف' : 'Phone', subscriberFieldHelp.phone],
        [isRTL ? 'الرقم الوطني' : 'National ID', subscriberFieldHelp.idNumber],
        [isRTL ? 'البريد الإلكتروني' : 'Email', subscriberFieldHelp.email],
        [isRTL ? 'المدينة' : 'City', subscriberFieldHelp.city],
        [isRTL ? 'الحي / الموقع' : 'Area / Location', subscriberFieldHelp.location],
        [isRTL ? 'العنوان' : 'Address', subscriberFieldHelp.address],
      ],
    },
    {
      title: isRTL ? 'المال والشبكة' : 'Finance & Network',
      items: [
        [isRTL ? 'الرصيد' : 'Balance', subscriberFieldHelp.balance],
        [isRTL ? 'المديونية' : 'Debt', subscriberFieldHelp.debt],
        [isRTL ? 'قيمة الفاتورة' : 'Bill Value', subscriberFieldHelp.bill],
        [isRTL ? 'النقاط التشجيعية' : 'Reward Points', subscriberFieldHelp.rewardPoints],
        [isRTL ? 'IP اللايت بيم' : 'LiteBeam IP', subscriberFieldHelp.litebeamIp],
        [isRTL ? 'MAC اللايت بيم' : 'LiteBeam MAC', subscriberFieldHelp.litebeamMac],
        [isRTL ? 'ملاحظات' : 'Notes', subscriberFieldHelp.notes],
      ],
    },
  ]), [isRTL, subscriberFieldHelp]);

  const entityFieldHelp = useMemo<Record<string, string>>(() => ({
    supplierName: isRTL ? 'اسم المورد الرسمي المعتمد في التعاملات والفواتير.' : 'Official supplier name used in invoices and operations.',
    supplierCode: isRTL ? 'كود مختصر لتسهيل البحث والمطابقة المحاسبية.' : 'Short code for search and accounting matching.',
    debt: isRTL ? 'إجمالي المبالغ المستحقة على المورد.' : 'Total payable amount to the supplier.',
    paid: isRTL ? 'إجمالي ما تم تسديده لهذا المورد.' : 'Total amount already paid to the supplier.',
    supplierBalance: isRTL ? 'الرصيد الصافي مع المورد (موجب/سالب).' : 'Net supplier balance (positive/negative).',
    supplierNotes: isRTL ? 'ملاحظات تشغيلية أو محاسبية مرتبطة بالمورد.' : 'Operational/accounting notes for the supplier.',
    investorName: isRTL ? 'اسم المستثمر كما يظهر في السجلات الرسمية.' : 'Investor name shown in official records.',
    shares: isRTL ? 'عدد الأسهم المملوكة لهذا المستثمر.' : 'Number of shares owned by this investor.',
    buyPrice: isRTL ? 'سعر شراء السهم الواحد.' : 'Purchase price per share.',
    investment: isRTL ? 'القيمة الكلية للاستثمار (أسهم × سعر شراء).' : 'Total investment value (shares × buy price).',
    dividends: isRTL ? 'الأرباح الموزعة المستحقة أو المدفوعة.' : 'Distributed dividends due/paid.',
    ownership: isRTL ? 'نوع الملكية أو جهة التملك (شخصي/شركة/شريك).' : 'Ownership type (personal/corporate/partner).',
    managerGroup: isRTL ? 'مجموعة الصلاحيات الأمنية التي تحدد ما يمكن للعضو الإداري فعله.' : 'Security permission group that controls what the admin member can do.',
    managerLimit: isRTL ? 'حد العمليات المالية المسموح للعضو الإداري تنفيذه.' : 'Maximum financial transaction limit for this admin member.',
    serviceType: isRTL ? 'نوع الخدمة الرقمية (IPTV/VPN/...) لتصنيفها وربطها بالفوترة.' : 'Digital service type (IPTV/VPN/...) for categorization and billing.',
    billingCycle: isRTL ? 'دورية احتساب السعر (شهري/ربع سنوي/سنوي/مرة واحدة).' : 'Pricing cycle (monthly/quarterly/yearly/one-time).',
    sellPrice: isRTL ? 'سعر بيع الخدمة للعميل.' : 'Service selling price to customers.',
    serviceCost: isRTL ? 'تكلفة الخدمة عليك كمزود.' : 'Your service cost as provider.',
    serviceStatus: isRTL ? 'حالة تشغيل الخدمة (نشطة/معلقة/منتهية).' : 'Service operational status (active/suspended/expired).',
  }), [isRTL]);

  const entityHelpSections = useMemo(() => {
    if (activeSubTab === 'suppliers') {
      return [
        {
          title: isRTL ? 'بيانات المورد' : 'Supplier Data',
          items: [
            [isRTL ? 'اسم المورد' : 'Supplier Name', entityFieldHelp.supplierName],
            [isRTL ? 'كود المورد' : 'Supplier Code', entityFieldHelp.supplierCode],
            [isRTL ? 'مدين' : 'Debt', entityFieldHelp.debt],
            [isRTL ? 'مسدد' : 'Paid', entityFieldHelp.paid],
            [isRTL ? 'الرصيد' : 'Balance', entityFieldHelp.supplierBalance],
            [isRTL ? 'ملاحظات' : 'Notes', entityFieldHelp.supplierNotes],
          ],
        },
      ];
    }
    if (activeSubTab === 'shareholders') {
      return [
        {
          title: isRTL ? 'بيانات المستثمر' : 'Investor Data',
          items: [
            [isRTL ? 'الاسم' : 'Name', entityFieldHelp.investorName],
            [isRTL ? 'الأسهم' : 'Shares', entityFieldHelp.shares],
            [isRTL ? 'سعر الشراء' : 'Buy Price', entityFieldHelp.buyPrice],
            [isRTL ? 'الاستثمار' : 'Investment', entityFieldHelp.investment],
            [isRTL ? 'الأرباح' : 'Dividends', entityFieldHelp.dividends],
            [isRTL ? 'الملكية' : 'Ownership', entityFieldHelp.ownership],
          ],
        },
      ];
    }
    if (activeSubTab === 'managers') {
      return [
        {
          title: isRTL ? 'بيانات العضو الإداري' : 'Admin Member Data',
          items: [
            [isRTL ? 'مجموعة الصلاحيات' : 'Permission Group', entityFieldHelp.managerGroup],
            [isRTL ? 'الحد المالي' : 'TX Limit', entityFieldHelp.managerLimit],
          ],
        },
      ];
    }
    if (activeSubTab === 'iptv') {
      return [
        {
          title: isRTL ? 'بيانات الخدمة الرقمية' : 'Digital Service Data',
          items: [
            [isRTL ? 'نوع الخدمة' : 'Service Type', entityFieldHelp.serviceType],
            [isRTL ? 'دورة الفوترة' : 'Billing Cycle', entityFieldHelp.billingCycle],
            [isRTL ? 'سعر البيع' : 'Sell Price', entityFieldHelp.sellPrice],
            [isRTL ? 'التكلفة' : 'Cost', entityFieldHelp.serviceCost],
            [isRTL ? 'الحالة' : 'Status', entityFieldHelp.serviceStatus],
          ],
        },
      ];
    }
    return [];
  }, [activeSubTab, entityFieldHelp, isRTL]);

  const subscriberFormState = useMemo<Record<string, unknown> | null>(() => {
    if (subscriberWorkspaceMode === 'add') return newItem;
    if (subscriberWorkspaceMode === 'edit' && editingItem) return editingItem;
    return null;
  }, [subscriberWorkspaceMode, newItem, editingItem]);

  const entityFormState = useMemo<Record<string, unknown> | null>(() => {
    if (!useEntityWorkspace) return null;
    if (entityWorkspaceMode === 'add') return newItem;
    if (entityWorkspaceMode === 'edit' && editingItem) return editingItem;
    return null;
  }, [useEntityWorkspace, entityWorkspaceMode, newItem, editingItem]);

  React.useEffect(() => {
    setSubscriberWorkspaceMode('list');
    setSubscriberPage(1);
    setSubscriberQuickFilter('all');
    setEntityWorkspaceMode('list');
    setEntityPage(1);
    setEntityQuickFilter('all');
    setIsEntityHelpOpen(false);
  }, [activeSubTab]);

  React.useEffect(() => {
    setSubscriberPage(1);
  }, [subscriberQuickFilter]);

  React.useEffect(() => {
    setEntityPage(1);
  }, [entityQuickFilter, entityPageSize]);

  React.useEffect(() => {
    if (!useSubscriberWorkspace) return;
    loadNetworkProfiles();
    loadRoutersForSubscriberForm();
    loadSubscriberGroups();
  }, [useSubscriberWorkspace]);

  const setSubscriberFormField = (key: string, value: unknown, extra: Record<string, unknown> = {}) => {
    if (subscriberWorkspaceMode === 'edit' && editingItem) {
      setEditingItem((prev) => (prev ? { ...prev, [key]: value, ...extra } : prev));
      return;
    }
    if (subscriberWorkspaceMode === 'add') {
      setNewItem((prev) => ({ ...prev, [key]: value, ...extra }));
    }
  };

  const closeSubscriberWorkspace = () => {
    setSubscriberWorkspaceMode('list');
    setEditingItem(null);
    setNewItem({});
    setIsSubscriberHelpOpen(false);
  };

  const setEntityFormField = (key: string, value: unknown, extra: Record<string, unknown> = {}) => {
    if (entityWorkspaceMode === 'edit' && editingItem) {
      setEditingItem((prev) => (prev ? { ...prev, [key]: value, ...extra } : prev));
      return;
    }
    if (entityWorkspaceMode === 'add') {
      setNewItem((prev) => ({ ...prev, [key]: value, ...extra }));
    }
  };

  const closeEntityWorkspace = () => {
    setEntityWorkspaceMode('list');
    setEditingItem(null);
    setNewItem({});
    setIsEntityHelpOpen(false);
  };

  const investorSummary = useMemo(() => {
    const totalShares = shareholders.reduce((sum, item) => sum + (Number(item.shares) || 0), 0);
    const totalInvestment = shareholders.reduce((sum, item) => sum + (Number(item.investment) || 0), 0);
    const totalDividends = shareholders.reduce((sum, item) => sum + (Number(item.dividends) || 0), 0);
    return { count: shareholders.length, totalShares, totalInvestment, totalDividends };
  }, [shareholders]);

  const managerSummary = useMemo(() => {
    const activeCount = managers.filter(isManagerActive).length;
    const totalBalance = managers.reduce((sum, item) => sum + (Number(item.balance || item['الرصيد']) || 0), 0);
    const limitedCount = managers.filter(item => item.isLimitEnabled || Number(item.maxTxLimit || item['الحد المالي']) > 0).length;
    return { count: managers.length, activeCount, totalBalance, limitedCount };
  }, [managers]);

  const iptvSummary = useMemo(() => {
    const activeCount = iptvSubscribers.filter(item => item.status === 'active').length;
    const totalRevenue = iptvSubscribers.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const totalCost = iptvSubscribers.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const suspendedCount = iptvSubscribers.filter(item => item.status === 'suspended').length;
    return { count: iptvSubscribers.length, activeCount, totalRevenue, totalCost, suspendedCount };
  }, [iptvSubscribers]);

  const subscriberFilterFields = useMemo<AdvancedFilterField[]>(() => ([
    {
      key: 'status',
      label: isRTL ? 'الحالة' : 'Status',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberStatusLabel(item)), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'connection',
      label: isRTL ? 'الاتصال' : 'Connection',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'online', label: isRTL ? 'متصل' : 'Online' },
        { value: 'active_offline', label: isRTL ? 'فعال دون اتصال' : 'Active Offline' },
        { value: 'offline', label: isRTL ? 'غير متصل' : 'Offline' },
      ],
    },
    {
      key: 'plan',
      label: isRTL ? 'الباقة' : 'Plan',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberPlan(item)), isRTL ? 'كل الباقات' : 'All Plans'),
    },
    {
      key: 'parent',
      label: isRTL ? 'تابع إلى' : 'Parent',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberParent(item)), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'group',
      label: isRTL ? 'المجموعة' : 'Group',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberGroup(item)), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'location',
      label: isRTL ? 'الموقع' : 'Location',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberLocation(item)), isRTL ? 'كل المواقع' : 'All Locations'),
    },
    {
      key: 'expiry',
      label: isRTL ? 'تاريخ الانتهاء' : 'Expiry',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'expired', label: isRTL ? 'منتهي' : 'Expired' },
        { value: 'today', label: isRTL ? 'ينتهي اليوم' : 'Expires Today' },
        { value: 'three_days', label: isRTL ? 'خلال 3 أيام' : 'Within 3 Days' },
        { value: 'seven_days', label: isRTL ? 'خلال 7 أيام' : 'Within 7 Days' },
        { value: 'later', label: isRTL ? 'لاحقًا' : 'Later' },
        { value: 'unknown', label: isRTL ? 'غير محدد' : 'Unknown' },
      ],
    },
    {
      key: 'debt',
      label: isRTL ? 'الديون' : 'Debt',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'with_debt', label: isRTL ? 'عليه دين' : 'With Debt' },
        { value: 'clear', label: isRTL ? 'بدون دين' : 'No Debt' },
      ],
    },
    {
      key: 'subType',
      label: isRTL ? 'نوع الاشتراك' : 'Subscription Type',
      options: toUniqueOptions(subscribers.map((item) => getSubscriberSubType(item)), isRTL ? 'الكل' : 'All'),
    },
  ]), [subscribers, isRTL, onlineStatuses]);

  const supplierFilterFields = useMemo<AdvancedFilterField[]>(() => ([
    {
      key: 'debtState',
      label: isRTL ? 'الديون' : 'Debt',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'has_debt', label: isRTL ? 'عليه دين' : 'Has Debt' },
        { value: 'clear', label: isRTL ? 'بدون دين' : 'Clear' },
      ],
    },
    {
      key: 'balanceState',
      label: isRTL ? 'الرصيد' : 'Balance',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'positive', label: isRTL ? 'رصيد موجب' : 'Positive' },
        { value: 'negative', label: isRTL ? 'رصيد سالب' : 'Negative' },
        { value: 'zero', label: isRTL ? 'رصيد صفري' : 'Zero' },
      ],
    },
    {
      key: 'noteState',
      label: isRTL ? 'الملاحظات' : 'Notes',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'has_notes', label: isRTL ? 'لديه ملاحظات' : 'Has Notes' },
        { value: 'no_notes', label: isRTL ? 'بلا ملاحظات' : 'No Notes' },
      ],
    },
  ]), [isRTL]);

  const shareholderFilterFields = useMemo<AdvancedFilterField[]>(() => ([
    {
      key: 'ownership',
      label: isRTL ? 'نوع الملكية' : 'Ownership',
      options: toUniqueOptions(shareholders.map((item) => getEntityValue(item, 'ownership')), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'sharesState',
      label: isRTL ? 'الأسهم' : 'Shares',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'high', label: isRTL ? 'مرتفعة' : 'High' },
        { value: 'medium', label: isRTL ? 'متوسطة' : 'Medium' },
        { value: 'low', label: isRTL ? 'منخفضة' : 'Low' },
      ],
    },
    {
      key: 'dividendsState',
      label: isRTL ? 'الأرباح' : 'Dividends',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'has_dividends', label: isRTL ? 'لديه أرباح' : 'Has Dividends' },
        { value: 'no_dividends', label: isRTL ? 'بدون أرباح' : 'No Dividends' },
      ],
    },
  ]), [shareholders, isRTL]);

  const managerFilterFields = useMemo<AdvancedFilterField[]>(() => ([
    {
      key: 'status',
      label: isRTL ? 'الحالة' : 'Status',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'active', label: isRTL ? 'نشط' : 'Active' },
        { value: 'inactive', label: isRTL ? 'غير نشط' : 'Inactive' },
      ],
    },
    {
      key: 'role',
      label: isRTL ? 'الدور / المجموعة' : 'Role / Group',
      options: toUniqueOptions(managers.map((item) => getManagerRole(item)), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'parent',
      label: isRTL ? 'تابع لـ' : 'Parent',
      options: toUniqueOptions(managers.map((item) => getEntityValue(item, 'تابع لـ', 'parent')), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'balanceState',
      label: isRTL ? 'الرصيد' : 'Balance',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'positive', label: isRTL ? 'رصيد موجب' : 'Positive' },
        { value: 'zero', label: isRTL ? 'رصيد صفري' : 'Zero' },
      ],
    },
    {
      key: 'limitState',
      label: isRTL ? 'الحد المالي' : 'Tx Limit',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'limited', label: isRTL ? 'يوجد حد' : 'Limited' },
        { value: 'unlimited', label: isRTL ? 'بدون حد' : 'Unlimited' },
      ],
    },
  ]), [managers, isRTL]);

  const iptvFilterFields = useMemo<AdvancedFilterField[]>(() => ([
    {
      key: 'status',
      label: isRTL ? 'الحالة' : 'Status',
      options: toUniqueOptions(iptvSubscribers.map((item) => getIptvStatusLabel(item)), isRTL ? 'الكل' : 'All'),
    },
    {
      key: 'priceRange',
      label: isRTL ? 'السعر' : 'Price',
      options: [
        { value: 'all', label: isRTL ? 'الكل' : 'All' },
        { value: 'low', label: isRTL ? 'منخفض' : 'Low' },
        { value: 'medium', label: isRTL ? 'متوسط' : 'Medium' },
        { value: 'high', label: isRTL ? 'مرتفع' : 'High' },
      ],
    },
    {
      key: 'serviceType',
      label: t.management.iptv.table.serviceType,
      options: toUniqueOptions(iptvSubscribers.map((item) => getIptvServiceTypeLabel(item)), isRTL ? 'الكل' : 'All'),
    },
  ]), [iptvSubscribers, isRTL, t.management.iptv.table.serviceType, t.management.iptv.serviceTypes]);

  const advancedFilterFields = useMemo<Record<ManagementSubTab, AdvancedFilterField[]>>(() => ({
    subscribers: subscriberFilterFields,
    suppliers: supplierFilterFields,
    shareholders: shareholderFilterFields,
    managers: managerFilterFields,
    iptv: iptvFilterFields,
    groups: [],
  }), [subscriberFilterFields, supplierFilterFields, shareholderFilterFields, managerFilterFields, iptvFilterFields]);

  const activeAdvancedFilterValues = activeSubTab === 'groups' ? {} : advancedFilters[activeSubTab];
  const activeAdvancedFilterCount = Object.values(activeAdvancedFilterValues || {}).filter((value) => value && value !== 'all').length;
  const setAdvancedFilterValue = (key: string, value: string) => {
    if (activeSubTab === 'groups') return;
    setAdvancedFilters((prev) => ({
      ...prev,
      [activeSubTab]: {
        ...prev[activeSubTab],
        [key]: value,
      },
    }));
  };
  const resetAdvancedFilters = () => {
    if (activeSubTab === 'groups') return;
    setAdvancedFilters((prev) => ({
      ...prev,
      [activeSubTab]: { ...DEFAULT_ADVANCED_FILTERS[activeSubTab] },
    }));
  };

  // Directors, Deputies, IPTV — Now live via API
  const [directors, setDirectors] = useState<DynamicItem[]>([]);
  const [deputies, setDeputies] = useState<DynamicItem[]>([]);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // Default 30s
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [failedRouters, setFailedRouters] = useState<string[]>([]);
  const [onlineNamesList, setOnlineNamesList] = useState<string[]>([]);
  const [routerDiagnostics, setRouterDiagnostics] = useState<Record<string, RouterDiagnostic>>({});
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [debugSearchTerm, setDebugSearchTerm] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState<Record<string, boolean>>({});
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendingSub, setExtendingSub] = useState<DynamicItem | null>(null);
  const [extensionTarget, setExtensionTarget] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<{unit: 'hours' | 'days', value: number} | null>(null);

  // Messaging System
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messagingSub, setMessagingSub] = useState<DynamicItem | null>(null);
  const [messageTypes, setMessageTypes] = useState<Set<string>>(new Set(['whatsapp']));
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const getActions = (item: DynamicItem): MenuAction[] => {
    const actions: MenuAction[] = [];
    
    // Check main edit permission
    const canManageTabs = 
      (activeSubTab === 'subscribers' && hasPermission('manage_subscribers')) ||
      (activeSubTab === 'iptv' && hasPermission('manage_iptv')) ||
      (activeSubTab === 'suppliers' && hasPermission('manage_suppliers')) ||
      (activeSubTab === 'shareholders' && hasPermission('manage_shareholders')) ||
      (activeSubTab === 'managers' && hasPermission('manage_admins'));

    if (!canManageTabs) return [];

    // Common Actions
    actions.push({
      id: 'edit',
      label: isRTL ? 'تعديل السجل' : 'Edit Record',
      icon: Edit,
      onClick: (item) => handleEdit(item),
      tooltip: isRTL ? `تحديث بيانات ${getTabEntityLabel()} الحالي` : `Update the selected ${getTabEntityLabel()}.`
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
          label: isRTL ? 'مزامنة مع الراوتر' : 'Sync with Router',
          icon: RefreshCw,
          onClick: (item) => openSyncModal(item),
          tooltip: isRTL ? 'تحديث بيانات المشترك على أجهزة الميكروتيك' : 'Push current CRM settings to MikroTik routers.'
        },
        {
          id: 'disconnect',
          label: isRTL ? 'قطع الاتصال الحالي' : 'Force Disconnect',
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
          label: isRTL ? 'حذف من الراوتر فقط' : 'Delete from Router Only',
          icon: ShieldOff,
          variant: 'danger',
          onClick: (item) => handleDeleteSecret(item.username),
          tooltip: isRTL ? 'حذف بيانات تسجيل الدخول من المايكروتيك فقط' : 'Remove only the credentials from MikroTik, keeping CRM data.'
        },
        {
          id: 'send-message',
          label: isRTL ? 'إرسال إشعار' : 'Send Notification',
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
    
    if (activeSubTab === 'managers') {
      actions.push(
        {
          id: 'withdraw',
          label: isRTL ? 'سحب رصيد (التسوية)' : 'Withdraw Balance',
          icon: CreditCard,
          variant: 'warning',
          onClick: (item) => {
            setTopUpTarget(item);
            setTopUpAmount('');
            setIsTopUpModalOpen(true);
            // I'll repurpose TopUp modal for both or add a flag
          },
          tooltip: isRTL ? 'سحب المبالغ المحصلة من محفظة العضو' : 'Collect cash and deduct from member wallet.'
        },
        {
          id: 'limits',
          label: isRTL ? 'إدارة القيود المالية' : 'Manage Limits',
          icon: Lock,
          onClick: (item) => {
            toastInfo(
              isRTL ? 'ستتوفر واجهة إدارة القيود المالية قريبًا.' : 'Financial limits management UI will be available soon.',
              isRTL ? 'قريبًا' : 'Coming Soon'
            );
          },
          tooltip: isRTL ? 'تحديد الحد الأقصى لكل عملية شحن' : 'Set the maximum amount allowed per transaction.'
        }
      );
    }

    // Global Delete
    actions.push({
      id: 'delete',
      label: isRTL ? 'حذف من النظام' : 'Delete from System',
      icon: Trash,
      variant: 'danger',
      onClick: (item) => setDeleteCandidateId(item.id),
      tooltip: isRTL ? `حذف ${getTabEntityLabel()} نهائيًا من قاعدة البيانات` : `Permanently remove this ${getTabEntityLabel()} from the database.`
    });

    return actions;
  };
  
  // ─── UNIFIED DATA FETCH (runs on sub-tab switch) ──────────────────────────────
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        if (activeSubTab === 'subscribers') {
          const subs = await fetchSubscribers();
          if (subs && subs.length > 0) {
            setSubscribers(subs);
            void reconcileSubscribersMikrotikAccess(subs);
          }
          else setApiError('القائمة فارغة أو يبدو أن الخادم لم يعثر على بيانات.');
        } else if (activeSubTab === 'suppliers') {
          const data = await fetchSuppliers();
          setSuppliers(data || []);
        } else if (activeSubTab === 'shareholders') {
          const data = await fetchInvestors();
          setShareholders(data || []);
        } else if (activeSubTab === 'managers') {
          const adminsRaw = await fetchManagersRaw();
          const safeAdmins = adminsRaw || [];
          setManagers(safeAdmins);
        } else if (activeSubTab === 'iptv') {
          const data = await iptvApi.fetch();
          setIptvSubscribers(data || []);
        }
      } catch (err: unknown) {
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
          setLastStatusUpdate(formatTime());
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
    let interval: ReturnType<typeof setInterval> | undefined;

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
    setDisconnectCandidate(username);
  };

  const confirmDisconnect = async () => {
    if (!disconnectCandidate) return;
    const username = disconnectCandidate;
    setIsDisconnecting(prev => ({ ...prev, [username]: true }));
    try {
      const result = await disconnectSubscriber(username);
      if (result && result.itemsRemoved > 0) {
        toastSuccess(
          isRTL ? `تم قطع اتصال ${username} بنجاح.` : `${username} was disconnected successfully.`,
          isRTL ? 'تمت العملية' : 'Disconnected'
        );
        // Immediate poll to update status
        setTimeout(() => pollStatus(false), 2000); // Wait 2s for router to clear
      } else {
        toastInfo(isRTL ? 'لم يتم العثور على جلسة نشطة لهذا المشترك.' : result.message, isRTL ? 'لا توجد جلسة' : 'No Active Session');
      }
    } catch (err) {
      console.error('Disconnect failed', err);
      toastError(isRTL ? 'فشل قطع الاتصال.' : 'Failed to disconnect the subscriber.', isRTL ? 'فشل العملية' : 'Disconnect Failed');
    } finally {
      setIsDisconnecting(prev => ({ ...prev, [username]: false }));
      setDisconnectCandidate(null);
    }
  };

  const handleDeleteSecret = async (username: string) => {
    if (!username) return;
    setDeleteSecretCandidate(username);
  };

  const confirmDeleteSecret = async () => {
    if (!deleteSecretCandidate) return;
    const username = deleteSecretCandidate;
    setIsStatusLoading(true);
    try {
      const res = await deleteSecret(username);
      toastSuccess(
        isRTL ? `تم حذف ${res.itemsRemoved} من بيانات المايكروتيك.` : `Deleted ${res.itemsRemoved} router secret(s).`,
        isRTL ? 'تم الحذف' : 'Deleted'
      );
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) {
      console.error(err);
      toastError(isRTL ? 'فشل حذف بيانات المشترك من الراوتر.' : 'Failed to delete subscriber credentials from the router.', isRTL ? 'فشل الحذف' : 'Delete Failed');
    } finally {
      setIsStatusLoading(false);
      setDeleteSecretCandidate(null);
    }
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
    
    // Financial Logic: Find the agent/manager for this subscriber
    const agentName = subToActivate.agent || subToActivate['الوكيل المسؤل'];
    const agent = state.teamMembers.find(m => m.name === agentName || m.username === agentName || m['اسم الدخول'] === agentName);
    const planName = subToActivate.plan || subToActivate['سرعة الخط'];
    const profile = networkProfiles.find(p => p.name === planName);
    const price = profile?.price || parseFloat(subToActivate.bill || subToActivate['قيمة الفاتورة'] || 0);

    if (agent) {
      const commissionRate = agent.commissionRate || 0;
      const commissionAmount = (price * commissionRate) / 100;
      const costToAgent = price - commissionAmount;

      if (agent.balance < costToAgent && state.role !== 'super_admin') {
        toastError(
          isRTL ? `رصيد الوكيل (${agent.name}) غير كافٍ. المطلوب: ${costToAgent} شيكل` : `Agent (${agent.name}) has insufficient balance. Required: ${costToAgent} ILS`,
          isRTL ? 'رصيد غير كافٍ' : 'Insufficient Balance'
        );
        return;
      }

      // Deduct balance from agent and record transaction
      const newTx: FinancialTransaction = {
        id: `TX-${Date.now()}`,
        date: new Date().toLocaleString('en-US'),
        type: 'topup_sub',
        amount: price,
        fromId: agent.id,
        fromName: agent.name,
        toId: subToActivate.id,
        toName: subToActivate.firstname || subToActivate.name,
        status: 'completed',
        metadata: {
          packageId: profile?.id,
          packageName: planName,
          agentCommission: commissionAmount
        }
      };

      setState(prev => ({
        ...prev,
        financialTransactions: [newTx, ...prev.financialTransactions],
        teamMembers: prev.teamMembers.map(m => m.id === agent.id ? { ...m, balance: m.balance - costToAgent } : m)
      }));
    }

    setIsActivating(true);
    try {
      const data = await activateSubscriber(subToActivate.id, activationOption, activationTarget);
      if (data.success) {
        toastSuccess(
          data.message || (isRTL ? `تم تفعيل المشترك بنجاح حتى: ${data.displayExpiry}` : `Activated successfully until: ${data.displayExpiry}`),
          isRTL ? 'تم التفعيل' : 'Activation Completed'
        );
        setIsActivateModalOpen(false);
        window.location.reload(); 
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : (isRTL ? 'فشل التفعيل' : 'Activation failed');
      toastError(message, isRTL ? 'فشل التفعيل' : 'Activation Failed');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDisconnectAll = async () => {
    setBulkDisconnectConfirmOpen(true);
  };

  const confirmDisconnectAll = async () => {
    setIsStatusLoading(true);
    try {
      const result = await disconnectAllSubscribers();
      toastSuccess(
        isRTL ? `تم تنفيذ العملية. تم طرد ${result.itemsRemoved} جلسة.` : `Operation complete. ${result.itemsRemoved} sessions disconnected.`,
        isRTL ? 'اكتملت العملية' : 'Operation Completed'
      );
      setTimeout(() => pollStatus(false), 2000);
    } catch (err) {
      console.error('Bulk disconnect failed', err);
      toastError(isRTL ? 'فشل قطع الاتصال الجماعي.' : 'Bulk disconnect failed.', isRTL ? 'فشل العملية' : 'Operation Failed');
    } finally {
      setIsStatusLoading(false);
      setBulkDisconnectConfirmOpen(false);
    }
  };

  const checkLiveStatus = async (username: string) => {
    if (!username) return;
    const status = await getMikrotikStatus(username);
    if (status) {
      setOnlineStatuses(prev => ({ ...prev, [username]: status.online }));
    }
  };

  const openSyncModal = async (item: DynamicItem) => {
    setSyncModalMode('single');
    setSyncingSubscriber(item);
    setSyncTarget('all');
    setSyncResult(null);
    setIsSyncModalOpen(true);
    // Load routers list
    const routers = await fetchRoutersList();
    setRoutersList(routers);
  };

  const openBulkSyncModal = async () => {
    setSyncModalMode('bulk');
    setSyncingSubscriber(null);
    setSyncTarget('all');
    setSyncResult(null);
    setIsSyncModalOpen(true);
    const routers = await fetchRoutersList();
    setRoutersList(routers);
  };

  const getBulkSyncTargets = () => {
    const targets = subscribers.filter((item) => getSubscriberUsername(item).trim());
    return {
      targets,
      skippedCount: subscribers.length - targets.length,
    };
  };

  const handleSyncSubscriber = async () => {
    const isBulkMode = syncModalMode === 'bulk';
    if (isBulkMode) setIsBulkSyncingSubscribers(true);
    setIsSyncing(true);
    setSyncResult(null);
    try {
      if (syncModalMode === 'bulk') {
        const { targets, skippedCount } = getBulkSyncTargets();

        if (targets.length === 0) {
          setSyncResult({
            success: false,
            message: isRTL ? 'لا يوجد مشتركون صالحون للمزامنة حالياً.' : 'There are no valid subscribers to sync right now.',
            details: []
          });
          return;
        }

        let successCount = 0;
        let failedCount = 0;

        for (const item of targets) {
          try {
            await applySubscriberStatusToMikrotik(String(item.id || ''), item, syncTarget);
            successCount += 1;
          } catch (error) {
            failedCount += 1;
            console.error('Bulk subscriber sync failed', item.id, error);
          }
        }

        const data = await fetchSubscribers();
        setSubscribers(data);
        setTimeout(() => pollStatus(false), 1500);

        setSyncResult({
          success: failedCount === 0,
          message: failedCount > 0
            ? (isRTL
              ? `اكتملت المزامنة جزئياً. نجح ${successCount}، فشل ${failedCount}${skippedCount ? `، وتجاوز ${skippedCount}` : ''}.`
              : `Bulk sync completed partially. Success: ${successCount}, Failed: ${failedCount}${skippedCount ? `, Skipped: ${skippedCount}` : ''}.`)
            : (isRTL
              ? `تمت مزامنة ${successCount} مشترك${skippedCount ? `، وتجاوز ${skippedCount} سجل غير صالح` : ''}.`
              : `Synced ${successCount} subscribers${skippedCount ? `, skipped ${skippedCount} invalid record(s)` : ''}.`),
          details: []
        });
        return;
      }

      if (!syncingSubscriber) return;
      await applySubscriberStatusToMikrotik(String(syncingSubscriber.id || ''), syncingSubscriber, syncTarget);
      setSyncResult({
        success: true,
        message: isRTL ? 'تمت مزامنة المشترك وتطبيق حالته بنجاح.' : 'Subscriber synced and status rules applied successfully.',
        details: []
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isRTL ? 'فشلت المزامنة' : 'Sync failed');
      const details = typeof err === 'object' && err !== null && 'details' in err && Array.isArray((err as { details?: unknown[] }).details)
        ? ((err as { details?: SyncResultDetail[] }).details || [])
        : [];
      // err.details contains per-router error breakdown from the server
      setSyncResult({
        success: false,
        message,
        details
      });
    } finally {
      setIsSyncing(false);
      if (isBulkMode) setIsBulkSyncingSubscribers(false);
    }
  };

  const applySubscriberStatusToMikrotik = async (subscriberId: string, payload: Record<string, unknown>, target: string = 'all') => {
    const accessAction = getSubscriberMikrotikAccessAction(payload);
    const username = getStringValue(payload.username ?? payload['اسم المستخدم'] ?? payload['اسم الدخول']);
    if (!username) return;

    if (accessAction === 'delete') {
      await deleteSecret(username);
      await disconnectSubscriber(username);
      return;
    }

    await syncSubscriberToMikrotik(subscriberId, target);

    if (accessAction === 'disable') {
      await disableSecret(username);
      await disconnectSubscriber(username);
      return;
    }

    await enableSecret(username);
  };

  const reconcileSubscribersMikrotikAccess = async (items: DynamicItem[]) => {
    const targets = items.filter((item) => {
      const username = getSubscriberUsername(item).trim();
      if (!username) return false;
      return getSubscriberMikrotikAccessAction(item) !== 'enable';
    });

    await Promise.all(targets.map(async (item) => {
      try {
        await applySubscriberStatusToMikrotik(String(item.id || ''), item);
      } catch (error) {
        console.error('Failed to reconcile subscriber access state', item.id, error);
      }
    }));
  };

  const handleSyncAllSubscribers = async () => {
    const { targets } = getBulkSyncTargets();
    if (targets.length === 0) {
      toastInfo(
        isRTL ? 'لا يوجد مشتركون صالحون للمزامنة حالياً.' : 'There are no valid subscribers to sync right now.',
        isRTL ? 'لا توجد بيانات' : 'Nothing To Sync'
      );
      return;
    }
    await openBulkSyncModal();
  };

  const closeSyncModal = () => {
    setIsSyncModalOpen(false);
    setSyncResult(null);
    setSyncingSubscriber(null);
    setSyncModalMode('single');
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
      toastError(isRTL ? 'يجب تفعيل قناة إرسال واحدة على الأقل' : 'Please enable at least one gateway', isRTL ? 'بيانات ناقصة' : 'Missing Channel');
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
      toastSuccess(isRTL ? 'تم إرسال الرسالة بنجاح عبر القنوات المحددة' : 'Message dispatched successfully', isRTL ? 'اكتمل الإرسال' : 'Dispatch Completed');
      setIsMessageModalOpen(false);
    } catch (e) {
      toastError(isRTL ? 'حدث خطأ أثناء الإرسال' : 'Error sending message', isRTL ? 'فشل الإرسال' : 'Send Failed');
    } finally {
      setIsSendingMessage(false);
    }
  };


  const admins = managers;
  const buildEmptyFromFields = (fields: { key: string }[]) => {
    const result: Record<string, string> = {};
    fields.forEach(field => {
      result[field.key] = '';
    });
    return result;
  };

  const handleEdit = (item: DynamicItem) => {
    let editObj = { ...item };
    
    if (activeSubTab === 'managers') {
      editObj = {
        ...editObj,
        firstName: String(item.firstName || item['الاسم الاول'] || ''),
        lastName: String(item.lastName || item['الاسم الثاني'] || ''),
        username: String(item.username || item['اسم الدخول'] || '')
      };
    } else if (activeSubTab === 'subscribers') {
      editObj = buildSubscriberPayload({
        ...editObj,
        firstname: String(item.firstname || item.firstName || item['الاسم الأول'] || ''),
        lastname: String(item.lastname || item.lastName || item['اسم العائلة'] || ''),
        username: String(item.username || item['اسم المستخدم'] || item['اسم الدخول'] || ''),
        password: String(item.password || item['كلمة المرور'] || ''),
        name: String(item.name || item['اسم العرض على المايكروتيك'] || item['الاسم الانجليزي'] || '')
      });
    } else if (activeSubTab === 'suppliers') {
      editObj = {
        ...editObj,
        'كود': item['كود'] || '',
        'اسم المورد': item['اسم المورد'] || '',
        'مدين': item['مدين'] || '0.00',
        'مسدد': item['مسدد'] || '0.00',
        'الرصيد': item['الرصيد'] || '-',
        'ملاحظات': item['ملاحظات'] || ''
      };
    } else if (activeSubTab === 'shareholders') {
      editObj = {
        ...editObj,
        name: item.name || '',
        shares: item.shares || 0,
        buyPrice: item.buyPrice || item.sharePrice || 0,
        investment: item.investment || 0,
        ownership: item.ownership || '0%',
        dividends: item.dividends || 0
      };
    }
    
    setEditingItem(editObj);
    if (activeSubTab === 'subscribers') {
      loadNetworkProfiles();
      setSubscriberWorkspaceMode('edit');
      return;
    }
    if (useEntityWorkspace) {
      setEntityWorkspaceMode('edit');
      return;
    }
    setIsEditModalOpen(true);
  };

  const handleAdd = () => {
    let item: DynamicItem = { id: `${activeSubTab === 'shareholders' ? 'SH' : activeSubTab.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}` };
    if (activeSubTab === 'subscribers') {
      item = buildSubscriberPayload({
        ...item,
        firstname: '',
        lastname: '',
        username: '',
        password: '',
        name: '',
        plan: '',
        status: 'active',
        expiry: new Date().toISOString().split('T')[0],
        balance: 0
      });
      loadNetworkProfiles();
    } else if (activeSubTab === 'suppliers') {
      item = {
        ...item,
        'كود': '',
        'اسم المورد': '',
        'مدين': '0.00',
        'مسدد': '0.00',
        'الرصيد': '-',
        'ملاحظات': ''
      };
    } else if (activeSubTab === 'shareholders') {
      item = { 
        ...item, 
        name: '', 
        shares: 0, 
        buyPrice: 0,
        ownership: '0%', 
        status: 'active', 
        joinDate: new Date().toISOString().split('T')[0], 
        investment: 0, 
        dividends: 0 
      };
    } else if (activeSubTab === 'managers') {
      item = { ...item, ...buildEmptyFromFields(MANAGER_FIELDS) };
    } else if (activeSubTab === 'iptv') {
      item = {
        ...item,
        name: '',
        serviceType: 'iptv',
        platform: '',
        host: '',
        phone: '',
        username: '',
        password: '',
        status: 'active',
        billingCycle: 'monthly',
        expiry: '',
        price: 0,
        cost: 0,
        notes: '',
      };
    }
    setNewItem(item);
    if (activeSubTab === 'subscribers') {
      setSubscriberWorkspaceMode('add');
      return;
    }
    if (useEntityWorkspace) {
      setEntityWorkspaceMode('add');
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (activeSubTab === 'subscribers') {
      try {
        setIsLoading(true);
        const payload = buildSubscriberPayload(newItem);
        await addSubscriber(payload);
        try {
          await applySubscriberStatusToMikrotik(String(payload.id || ''), payload);
        } catch (mikrotikError) {
          console.error('Subscriber MikroTik status apply failed after add', mikrotikError);
          toastInfo(
            isRTL ? 'تم حفظ المشترك لكن تعذر تطبيق حالته على المايكروتيك تلقائياً.' : 'Subscriber saved, but MikroTik status could not be applied automatically.',
            isRTL ? 'تنبيه مزامنة' : 'Sync Notice'
          );
        }
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
        // Map to Arabic keys expected by backend and ensure numbers
        const payload = {
          ...newItem,
          'اسم المستثمر': newItem.name,
          'رصيد الأسهم': parseFloat(newItem.shares) || 0,
          'سعر الأسهم': parseFloat(newItem.investment) || 0,
          'صافي الربح': parseFloat(newItem.dividends) || 0,
          'سعر السهم الواحد': parseFloat(newItem.buyPrice) || 0,
          'تاريخ الانضمام': newItem.joinDate || new Date().toISOString().split('T')[0]
        };
        await addInvestor(payload);
        const data = await fetchInvestors();
        if (data) setShareholders(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة المستثمر' : 'Failed to add investor');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'managers') {
      try {
        setIsLoading(true);
        await addManager(newItem);
        const data = await fetchManagersRaw();
        setManagers(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل إضافة العضو' : 'Failed to add team member');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'iptv') {
      try { setIsLoading(true); await iptvApi.add(newItem); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError(isRTL ? 'فشل إضافة الخدمة الرقمية' : 'Failed to add digital service'); } finally { setIsLoading(false); }
    }
    if (activeSubTab === 'subscribers') {
      closeSubscriberWorkspace();
      setSubscriberPage(1);
    } else if (useEntityWorkspace) {
      closeEntityWorkspace();
      setEntityPage(1);
    } else {
      setIsAddModalOpen(false);
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDelete = async (id: string) => {
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
          setApiError(isRTL ? 'فشل حذف المستثمر' : 'Failed to delete investor');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'managers') {
        try {
          setIsLoading(true);
          await deleteManager(id);
          const data = await fetchManagersRaw();
          setManagers(data);
        } catch (err) {
          setApiError(isRTL ? 'فشل حذف العضو الإداري' : 'Failed to delete administrative member');
        } finally {
          setIsLoading(false);
        }
      } else if (activeSubTab === 'iptv') {
        try { setIsLoading(true); await iptvApi.remove(id); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError(isRTL ? 'فشل حذف الخدمة الرقمية' : 'Failed to delete digital service'); } finally { setIsLoading(false); }
      }
      setDeleteCandidateId(null);
  };

  const handleSaveMessageTemplate = async () => {
    if (!messageText.trim() || !templateDraftName.trim()) return;
    const newTpl = { id: Math.random().toString(36).substr(2,9), name: templateDraftName, text: messageText };
    await saveMessageData({ templates: [...templates, newTpl], groups: [] });
    loadMsgTemplates();
    setTemplateDraftName('');
    setIsTemplatePromptOpen(false);
    toastSuccess(isRTL ? 'تم حفظ القالب بنجاح' : 'Saved successfully', isRTL ? 'تم الحفظ' : 'Saved');
  };

  const handleTopUpManager = async () => {
    if (!topUpTarget || !topUpAmount) return;
    try {
      setIsLoading(true);
      const amount = parseFloat(topUpAmount);
      // Logic for top up (could be deposit or withdraw depending on amount/UI)
      await topUpManager(topUpTarget.id, amount);
      
      const data = await fetchManagersRaw();
      setManagers(data);
      setIsTopUpModalOpen(false);
      setTopUpAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setApiError(isRTL ? 'فشل عملية الشحن' : 'Top up failed');
    } finally {
      setIsLoading(false);
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
        const payload = buildSubscriberPayload(editingItem);
        await updateSubscriber(editingItem.id, payload);
        try {
          await applySubscriberStatusToMikrotik(String(editingItem.id || payload.id || ''), payload);
        } catch (mikrotikError) {
          console.error('Subscriber MikroTik status apply failed after update', mikrotikError);
          toastInfo(
            isRTL ? 'تم حفظ التعديل لكن تعذر تطبيق الحالة على المايكروتيك تلقائياً.' : 'Changes saved, but MikroTik status could not be applied automatically.',
            isRTL ? 'تنبيه مزامنة' : 'Sync Notice'
          );
        }
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
        // Map to Arabic keys expected by backend and ensure numbers
        const payload = {
          ...editingItem,
          'اسم المستثمر': editingItem.name,
          'رصيد الأسهم': parseFloat(editingItem.shares) || 0,
          'سعر الأسهم': parseFloat(editingItem.investment) || 0,
          'صافي الربح': parseFloat(editingItem.dividends) || 0,
          'سعر السهم الواحد': parseFloat(editingItem.buyPrice) || 0
        };
        await updateInvestor(editingItem.id, payload);
        const data = await fetchInvestors();
        if (data) setShareholders(data);
      } catch (err) {
        setApiError(isRTL ? 'فشل تعديل المستثمر' : 'Failed to update investor');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'directors') {
      try { setIsLoading(true); await directorsApi.update(editingItem.id, editingItem); const data = await directorsApi.fetch(); if(data) setDirectors(data); } catch(err) { setApiError('Failed to update director'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'deputies') {
      try { setIsLoading(true); await deputiesApi.update(editingItem.id, editingItem); const data = await deputiesApi.fetch(); if(data) setDeputies(data); } catch(err) { setApiError('Failed to update deputy'); } finally { setIsLoading(false); }
    } else if (activeSubTab === 'managers') {
      try {
        setIsLoading(true);
        await updateManager(editingItem.id, editingItem);
        const data = await fetchManagersRaw();
        setManagers(data);
      } catch (err) {
          setApiError(isRTL ? 'فشل تعديل العضو الإداري' : 'Failed to update administrative member');
      } finally {
        setIsLoading(false);
      }
    } else if (activeSubTab === 'iptv') {
      try { setIsLoading(true); await iptvApi.update(editingItem.id, editingItem); const data = await iptvApi.fetch(); if(data) setIptvSubscribers(data); } catch(err) { setApiError(isRTL ? 'فشل تعديل الخدمة الرقمية' : 'Failed to update digital service'); } finally { setIsLoading(false); }
    }
    
    if (activeSubTab === 'subscribers') {
      closeSubscriberWorkspace();
    } else if (useEntityWorkspace) {
      closeEntityWorkspace();
    } else {
      setIsEditModalOpen(false);
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredData = () => {
    let data: DynamicItem[] = [];
    const getSubscriberSearchBlob = (subscriber: DynamicItem) => [
      getSubscriberDisplayName(subscriber),
      subscriber.firstname,
      subscriber.lastname,
      subscriber['الاسم الأول'],
      subscriber['اسم العائلة'],
      getSubscriberUsername(subscriber),
      getSubscriberCode(subscriber),
      subscriber.phone,
      subscriber.address,
      subscriber['عنوان المشترك'],
      getSubscriberParent(subscriber),
      subscriber.notes,
    ].filter(Boolean).join(' ');
    const getSupplierSearchBlob = (item: DynamicItem) => [getSupplierCode(item), getSupplierName(item), getSupplierNotes(item)].filter(Boolean).join(' ');
    const getShareholderSearchBlob = (item: DynamicItem) => [getInvestorName(item), item.ownership, item.id].filter(Boolean).join(' ');
    const getManagerSearchBlob = (item: DynamicItem) => [getManagerName(item), getEntityValue(item, 'username', 'اسم الدخول'), getManagerRole(item), getEntityValue(item, 'تابع لـ', 'parent')].filter(Boolean).join(' ');
    const getIptvSearchBlob = (item: DynamicItem) => [
      getIptvName(item),
      getEntityValue(item, 'serviceType', 'type'),
      getEntityValue(item, 'platform'),
      getEntityValue(item, 'host'),
      getEntityValue(item, 'username'),
      getEntityValue(item, 'notes'),
    ].filter(Boolean).join(' ');

    const matchesAdvancedFilters = (item: DynamicItem) => {
      if (activeSubTab === 'subscribers') {
        const filters = advancedFilters.subscribers;
        if (filters.status !== 'all' && getSubscriberStatusLabel(item) !== filters.status) return false;
        if (filters.connection !== 'all' && getSubscriberConnectionState(item) !== filters.connection) return false;
        if (filters.plan !== 'all' && getSubscriberPlan(item) !== filters.plan) return false;
        if (filters.parent !== 'all' && getSubscriberParent(item) !== filters.parent) return false;
        if (filters.group !== 'all' && getSubscriberGroup(item) !== filters.group) return false;
        if (filters.location !== 'all' && getSubscriberLocation(item) !== filters.location) return false;
        if (filters.expiry !== 'all' && getSubscriberExpiryBucket(item) !== filters.expiry) return false;
        if (filters.debt === 'with_debt' && getSubscriberDebtValue(item) <= 0) return false;
        if (filters.debt === 'clear' && getSubscriberDebtValue(item) > 0) return false;
        if (filters.subType !== 'all' && getSubscriberSubType(item) !== filters.subType) return false;
        if (subscriberQuickFilter === 'active' && !isSubscriberActive(item)) return false;
        if (subscriberQuickFilter === 'online' && !isSubscriberOnline(item)) return false;
        return true;
      }
      if (activeSubTab === 'suppliers') {
        const filters = advancedFilters.suppliers;
        const debtValue = parseSupplierAmount(item['مدين']);
        const balanceValue = parseSupplierAmount(item['الرصيد']);
        const hasNotes = Boolean(getSupplierNotes(item));
        if (filters.debtState === 'has_debt' && debtValue <= 0) return false;
        if (filters.debtState === 'clear' && debtValue > 0) return false;
        if (filters.balanceState === 'positive' && balanceValue <= 0) return false;
        if (filters.balanceState === 'negative' && balanceValue >= 0) return false;
        if (filters.balanceState === 'zero' && Math.abs(balanceValue) > 0.0001) return false;
        if (filters.noteState === 'has_notes' && !hasNotes) return false;
        if (filters.noteState === 'no_notes' && hasNotes) return false;
        if (entityQuickFilter === 'debt' && debtValue <= 0) return false;
        if (entityQuickFilter === 'negative' && balanceValue >= 0) return false;
        return true;
      }
      if (activeSubTab === 'shareholders') {
        const filters = advancedFilters.shareholders;
        const sharesValue = Number(item.shares || 0);
        const sharesBucket = getRelativeRangeBucket(sharesValue, shareholders.map((holder) => Number(holder.shares || 0)));
        const hasDividends = Number(item.dividends || 0) > 0;
        if (filters.ownership !== 'all' && String(item.ownership || '') !== filters.ownership) return false;
        if (filters.sharesState !== 'all' && sharesBucket !== filters.sharesState) return false;
        if (filters.dividendsState === 'has_dividends' && !hasDividends) return false;
        if (filters.dividendsState === 'no_dividends' && hasDividends) return false;
        if (entityQuickFilter === 'high_shares' && sharesBucket !== 'high') return false;
        if (entityQuickFilter === 'with_dividends' && !hasDividends) return false;
        return true;
      }
      if (activeSubTab === 'managers') {
        const filters = advancedFilters.managers;
        const balanceValue = Number(item.balance || item['الرصيد'] || 0);
        const hasLimit = Boolean(item.isLimitEnabled || Number(item.maxTxLimit || item['الحد المالي']) > 0);
        if (filters.status === 'active' && !isManagerActive(item)) return false;
        if (filters.status === 'inactive' && isManagerActive(item)) return false;
        if (filters.role !== 'all' && getManagerRole(item) !== filters.role) return false;
        if (filters.parent !== 'all' && getEntityValue(item, 'تابع لـ', 'parent') !== filters.parent) return false;
        if (filters.balanceState === 'positive' && balanceValue <= 0) return false;
        if (filters.balanceState === 'zero' && balanceValue !== 0) return false;
        if (filters.limitState === 'limited' && !hasLimit) return false;
        if (filters.limitState === 'unlimited' && hasLimit) return false;
        if (entityQuickFilter === 'active' && !isManagerActive(item)) return false;
        if (entityQuickFilter === 'limited' && !hasLimit) return false;
        return true;
      }
      if (activeSubTab === 'iptv') {
        const filters = advancedFilters.iptv;
        const priceBucket = getRelativeRangeBucket(Number(item.price || 0), iptvSubscribers.map((entry) => Number(entry.price || 0)));
        if (filters.status !== 'all' && getIptvStatusLabel(item) !== filters.status) return false;
        if (filters.priceRange !== 'all' && priceBucket !== filters.priceRange) return false;
        if (filters.serviceType !== 'all' && getIptvServiceTypeLabel(item) !== filters.serviceType) return false;
        if (entityQuickFilter === 'service_active' && String(item.status || '') !== 'active') return false;
        if (entityQuickFilter === 'service_profitable' && Number(item.price || 0) <= Number(item.cost || 0)) return false;
        return true;
      }
      return true;
    };

    if (activeSubTab === 'subscribers') {
      data = subscribers.filter(s => {
        const searchBlob = getSubscriberSearchBlob(s);
        return smartMatch(searchTerm, searchBlob) || smartMatch(searchTerm, getSubscriberCode(s));
      });
    } else if (activeSubTab === 'suppliers') {
      data = suppliers.filter((s) => {
        const values = getSupplierSearchBlob(s);
        return smartMatch(searchTerm, values) || smartMatch(searchTerm, String(s.id));
      });
    } else if (activeSubTab === 'shareholders') {
      data = shareholders.filter(s => smartMatch(searchTerm, getShareholderSearchBlob(s)) || smartMatch(searchTerm, String(s.id)));
    } else if (activeSubTab === 'managers') {
      data = managers.filter(s => smartMatch(searchTerm, getManagerSearchBlob(s)));
    } else if (activeSubTab === 'iptv') {
      data = iptvSubscribers.filter(s => smartMatch(searchTerm, getIptvSearchBlob(s)));
    } else {
      data = admins.filter((a) => {
        const values = MANAGER_FIELDS.map(f => String(a[f.key] || '')).join(' ');
        return smartMatch(searchTerm, values) || smartMatch(searchTerm, String(a.id));
      });
    }
    data = data.filter(matchesAdvancedFilters);
    if (!searchTerm.trim()) return data;

    const getItemScore = (item: DynamicItem) => {
      if (activeSubTab === 'subscribers') {
        const searchBlob = getSubscriberSearchBlob(item);
        return Math.max(getSmartMatchScore(searchTerm, searchBlob), getSmartMatchScore(searchTerm, getSubscriberCode(item)));
      }
      if (activeSubTab === 'suppliers') {
        const values = getSupplierSearchBlob(item);
        return Math.max(getSmartMatchScore(searchTerm, values), getSmartMatchScore(searchTerm, String(item.id)));
      }
      if (activeSubTab === 'shareholders') {
        return Math.max(getSmartMatchScore(searchTerm, getShareholderSearchBlob(item)), getSmartMatchScore(searchTerm, String(item.id)));
      }
      if (activeSubTab === 'managers') {
        return getSmartMatchScore(searchTerm, getManagerSearchBlob(item));
      }
      if (activeSubTab === 'iptv') {
        return getSmartMatchScore(searchTerm, getIptvSearchBlob(item));
      }

      const values = MANAGER_FIELDS.map(f => String(item[f.key] || '')).join(' ');
      return Math.max(getSmartMatchScore(searchTerm, values), getSmartMatchScore(searchTerm, String(item.id)));
    };

    return [...data].sort((a, b) => getItemScore(b) - getItemScore(a));
  };

  const filteredItems = useMemo(
    () => filteredData(),
    [activeSubTab, searchTerm, advancedFilters, subscriberQuickFilter, entityQuickFilter, subscribers, suppliers, shareholders, managers, iptvSubscribers, onlineStatuses, isRTL]
  );

  const subscriberPagedItems = useMemo(() => {
    if (!useSubscriberWorkspace) return [] as DynamicItem[];
    const start = (subscriberPage - 1) * subscriberPageSize;
    return filteredItems.slice(start, start + subscriberPageSize);
  }, [useSubscriberWorkspace, filteredItems, subscriberPage, subscriberPageSize]);

  const subscriberTotalPages = useMemo(() => {
    if (!useSubscriberWorkspace) return 1;
    return Math.max(1, Math.ceil(filteredItems.length / subscriberPageSize));
  }, [useSubscriberWorkspace, filteredItems.length, subscriberPageSize]);

  React.useEffect(() => {
    if (!useSubscriberWorkspace) return;
    setSubscriberPage((current) => Math.min(current, Math.max(1, Math.ceil(filteredItems.length / subscriberPageSize))));
  }, [useSubscriberWorkspace, filteredItems.length, subscriberPageSize]);

  const entityPagedItems = useMemo(() => {
    if (!useEntityWorkspace) return [] as DynamicItem[];
    const start = (entityPage - 1) * entityPageSize;
    return filteredItems.slice(start, start + entityPageSize);
  }, [useEntityWorkspace, filteredItems, entityPage, entityPageSize]);

  const entityTotalPages = useMemo(() => {
    if (!useEntityWorkspace) return 1;
    return Math.max(1, Math.ceil(filteredItems.length / entityPageSize));
  }, [useEntityWorkspace, filteredItems.length, entityPageSize]);

  React.useEffect(() => {
    if (!useEntityWorkspace) return;
    setEntityPage((current) => Math.min(current, Math.max(1, Math.ceil(filteredItems.length / entityPageSize))));
  }, [useEntityWorkspace, filteredItems.length, entityPageSize]);
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
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm max-w-2xl leading-relaxed">
            {t.management.subtitle}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={
                activeSubTab === 'subscribers'
                  ? (isRTL ? 'ابحث بالاسم أو كود المستخدم أو اليوزرنيم...' : 'Search by name, code, or username...')
                  : activeSubTab === 'suppliers'
                    ? (isRTL ? 'ابحث باسم المورد أو الكود...' : 'Search by supplier name or code...')
                    : activeSubTab === 'shareholders'
                      ? (isRTL ? 'ابحث باسم المستثمر أو الرقم...' : 'Search by investor name or id...')
                      : activeSubTab === 'managers'
                        ? (isRTL ? 'ابحث بالاسم أو اسم الدخول أو الدور...' : 'Search by name, username, or role...')
                        : (isRTL ? 'ابحث بالاسم أو اسم المستخدم...' : 'Search by name or username...')
              }
              className="w-full bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFilters((prev) => !prev);
            }}
            className={`inline-flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#09090B] border rounded-xl transition-colors ${showFilters ? 'border-teal-500 text-teal-500' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-500'}`}
          >
            <Filter size={20} />
            <span className="text-sm font-bold">{isRTL ? 'بحث متقدم' : 'Advanced Search'}</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="min-w-6 h-6 px-2 rounded-full bg-teal-500 text-white text-xs font-black flex items-center justify-center">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
          {(searchTerm.trim() || activeAdvancedFilterCount > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                resetAdvancedFilters();
              }}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-rose-500 transition-colors"
            >
              <X size={18} />
              <span className="text-sm font-bold">{isRTL ? 'مسح البحث' : 'Clear Search'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Floating Advanced Search */}
      {showFilters && createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[min(72rem,calc(100vw-2rem))] md:max-w-[min(72rem,calc(100vw-6rem))] max-h-[85vh] bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {isRTL ? 'البحث المتقدم' : 'Advanced Search'}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isRTL ? 'نافذة فلترة مريحة حسب طبيعة هذا التبويب بدون التأثير على القائمة الرئيسية.' : 'Comfortable tab-aware filtering without affecting the main list layout.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    {isRTL ? `${filteredItems.length} نتيجة` : `${filteredItems.length} results`}
                  </span>
                  {activeAdvancedFilterCount > 0 && (
                    <span className="px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20">
                      {isRTL ? `${activeAdvancedFilterCount} فلاتر نشطة` : `${activeAdvancedFilterCount} active filters`}
                    </span>
                  )}
                  <button
                    onClick={resetAdvancedFilters}
                    className="px-3 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    {isRTL ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(85vh-5.5rem)] overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-5">
                {activeAdvancedFilterCount > 0 && activeSubTab !== 'groups' && (
                  <div className="flex flex-wrap gap-2">
                    {advancedFilterFields[activeSubTab].map((field) => {
                      const value = activeAdvancedFilterValues[field.key];
                      if (!value || value === 'all') return null;
                      const label = field.options.find((option) => option.value === value)?.label || value;
                      return (
                        <button
                          key={field.key}
                          onClick={() => setAdvancedFilterValue(field.key, 'all')}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20"
                        >
                          <span>{field.label}: {label}</span>
                          <X size={12} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeSubTab !== 'groups' && advancedFilterFields[activeSubTab].length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/20 p-4 md:p-5">
                    <div className="mb-4">
                      <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {isRTL ? 'خيارات الفلترة' : 'Filter Options'}
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isRTL ? 'يمكنك اختيار خيار واحد أو عدة خيارات ثم إغلاق النافذة ومتابعة التصفح بشكل مريح.' : 'Choose one or more options, then close the window and continue browsing comfortably.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {advancedFilterFields[activeSubTab].map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-xs font-black text-slate-600 dark:text-slate-400">{field.label}</label>
                          <select
                            value={activeAdvancedFilterValues[field.key] || 'all'}
                            onChange={(e) => setAdvancedFilterValue(field.key, e.target.value)}
                            className="w-full bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            {field.options.map((option) => (
                              <option key={`${field.key}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(activeSubTab === 'subscribers' || activeSubTab === 'suppliers' || activeSubTab === 'managers' || activeSubTab === 'shareholders') && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30">
                    <button
                      onClick={() => setShowColumnControls((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-3 px-4 md:px-5 py-4 text-right"
                    >
                      <div>
                        <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">
                          {isRTL ? 'الأعمدة المرئية' : 'Visible Columns'}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {isRTL ? 'افتح هذا القسم فقط إذا أردت تخصيص الجدول.' : 'Open this section only if you want to customize the table.'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        {showColumnControls ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'إظهار' : 'Show')}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {showColumnControls && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 md:px-5 pb-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex justify-end gap-3 text-xs pt-4">
                              <button 
                                onClick={() => {
                                  const columns = activeSubTab === 'subscribers' ? SUBSCRIBER_COLUMNS :
                                                 activeSubTab === 'suppliers' ? SUPPLIER_COLUMNS :
                                                 activeSubTab === 'managers' ? MANAGER_COLUMNS : INVESTOR_COLUMNS;
                                  const next = { ...visibleColumns };
                                  columns.forEach(col => next[col.id] = true);
                                  setVisibleColumns(next);
                                }}
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 font-bold transition-colors"
                              >
                                {isRTL ? 'تحديد الكل' : 'Select All'}
                              </button>
                              <button 
                                onClick={() => {
                                  const columns = activeSubTab === 'subscribers' ? SUBSCRIBER_COLUMNS :
                                                 activeSubTab === 'suppliers' ? SUPPLIER_COLUMNS :
                                                 activeSubTab === 'managers' ? MANAGER_COLUMNS : INVESTOR_COLUMNS;
                                  const next = { ...visibleColumns };
                                  columns.forEach(col => next[col.id] = false);
                                  setVisibleColumns(next);
                                }}
                                className="text-rose-600 hover:text-rose-700 font-bold transition-colors"
                              >
                                {isRTL ? 'إلغاء الكل' : 'Clear All'}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {(activeSubTab === 'subscribers' ? SUBSCRIBER_COLUMNS :
                                activeSubTab === 'suppliers' ? SUPPLIER_COLUMNS :
                                activeSubTab === 'managers' ? MANAGER_COLUMNS : INVESTOR_COLUMNS).map(col => (
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {activeSubTab !== 'subscribers' && activeSubTab !== 'suppliers' && activeSubTab !== 'managers' && activeSubTab !== 'shareholders' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/20 p-4 md:p-5">
                    <h5 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">
                      {isRTL ? 'خيارات العرض' : 'Display Options'}
                    </h5>
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
                            {isRTL ? 'إظهار نوع الخدمة' : 'Show Service Type'}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}

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
            {isRTL ? 'المستثمرون' : 'Investors'}
          </button>
        )}
        {(hasPermission('view_admins') || state.role === 'super_admin') && (
          <button 
            onClick={() => setActiveSubTab('managers')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'managers' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <ShieldCheck size={18} />
            {isRTL ? 'الطاقم الإداري' : 'Administrative Team'}
          </button>
        )}
        {(hasPermission('manage_security_groups') || state.role === 'super_admin') && (
          <button 
            onClick={() => setActiveSubTab('groups')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'groups' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Lock size={18} />
            {isRTL ? 'المجموعات الأمنية' : 'Security Groups'}
          </button>
        )}
      </div>

      {/* Main List Area */}
      <div className="flex-1 min-h-0 glass-card overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {activeSubTab === 'subscribers' && t.management.subscribers.title}
            {activeSubTab === 'iptv' && t.management.iptv.title}
            {activeSubTab === 'suppliers' && t.management.suppliers.title}
            {activeSubTab === 'shareholders' && (isRTL ? 'قائمة المستثمرين' : 'Investors List')}
            {activeSubTab === 'managers' && (isRTL ? 'إدارة الطاقم والارصدة' : 'Staff & Balance Management')}
            {activeSubTab === 'groups' && (isRTL ? 'المجموعات وتخصيص الصلاحيات' : 'Groups & Permissions')}
          </h3>
          {(activeSubTab === 'subscribers' && hasPermission('manage_subscribers')) ||
           (activeSubTab === 'iptv' && hasPermission('manage_iptv')) ||
           (activeSubTab === 'suppliers' && hasPermission('manage_suppliers')) ||
           (activeSubTab === 'shareholders' && (hasPermission('manage_shareholders') || state.role === 'super_admin')) ||
           (activeSubTab === 'managers' && (hasPermission('manage_admins') || state.role === 'super_admin')) ? (
            <div className="flex items-center gap-2">
              {activeSubTab === 'subscribers' && (
                <>
                  <button
                    onClick={handleDisconnectAll}
                    disabled={isStatusLoading || isBulkSyncingSubscribers}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-xl transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isRTL ? 'طرد جميع المشتركين المتصلين' : 'Disconnect all active subscribers'}
                  >
                    <Power size={18} />
                    <span>{isRTL ? 'طرد الجميع' : 'Disconnect All'}</span>
                  </button>
                  <button
                    onClick={handleSyncAllSubscribers}
                    disabled={isBulkSyncingSubscribers || isStatusLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded-xl transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isRTL ? 'مزامنة جميع المشتركين مع المايكروتيك وفق الحالة والانتهاء' : 'Sync all subscribers to MikroTik according to status and expiry rules'}
                  >
                    {isBulkSyncingSubscribers ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                    <span>{isBulkSyncingSubscribers ? (isRTL ? 'جاري مزامنة الجميع...' : 'Syncing All...') : (isRTL ? 'مزامنة الجميع' : 'Sync All')}</span>
                  </button>
                </>
              )}
              <button 
                onClick={handleAdd}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
              >
                <Plus size={16} />
                {getAddButtonLabel()}
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
          <div className="mx-4 mt-4 p-4 text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3 font-bold">
            <RefreshCw size={20} className="animate-spin text-teal-500" />
            {isRTL ? 'جاري جلب البيانات من الخادم...' : 'Fetching data from server...'}
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

        {activeSubTab === 'groups' ? (
          <div className="flex-1 overflow-hidden">
            <SecurityGroupsTab state={state} setState={setState} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            {useSubscriberWorkspace && (
              <div className="p-4 md:p-6 space-y-6">
                {subscriberWorkspaceMode === 'list' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <button
                        type="button"
                        onClick={() => setSubscriberQuickFilter('all')}
                        className={`rounded-2xl border p-4 text-start transition-all ${subscriberQuickFilter === 'all' ? 'border-teal-300 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-500/10 ring-1 ring-teal-200/70 dark:ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}
                      >
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المشتركين' : 'Subscribers'}</p>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(subscriberSummary.count)}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{isRTL ? 'انقر لعرض الجميع' : 'Click to show all'}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubscriberQuickFilter('active')}
                        className={`rounded-2xl border p-4 text-start transition-all ${subscriberQuickFilter === 'active' ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-200/70 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}
                      >
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطون' : 'Active'}</p>
                        <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(subscriberSummary.activeCount)}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{isRTL ? 'انقر لعرض النشطين فقط' : 'Click to show active only'}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubscriberQuickFilter('online')}
                        className={`rounded-2xl border p-4 text-start transition-all ${subscriberQuickFilter === 'online' ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 ring-1 ring-blue-200/70 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}
                      >
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'المتصلون الآن' : 'Online Now'}</p>
                        <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatNumber(subscriberSummary.onlineCount)}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{isRTL ? 'انقر لعرض المتصلين الآن' : 'Click to show online only'}</p>
                      </button>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الرصيد' : 'Total Balance'}</p>
                        <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(subscriberSummary.totalBalance, state.currency, state.lang, 2)}</p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] overflow-hidden">
                      <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">
                            {isRTL ? 'لوحة إدارة المشتركين' : 'Subscriber Operations Console'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isRTL ? 'واجهة تشغيل احترافية لإدارة المشتركين مع فرز سريع وصفحات وإجراءات مباشرة وواضحة.' : 'Professional subscriber operations workspace with quick filters, pagination, and clear direct actions.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <SystemClockBadge state={state} compact />
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {isRTL ? 'إظهار' : 'Show'}
                          </label>
                          <select
                            value={subscriberPageSize}
                            onChange={(e) => {
                              setSubscriberPageSize(Number(e.target.value));
                              setSubscriberPage(1);
                            }}
                            className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold"
                          >
                            {[10, 20, 50, 100].map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {isRTL ? 'في الصفحة' : 'per page'}
                          </span>
                        </div>
                      </div>

                      {subscriberPagedItems.length === 0 ? (
                        <div className="p-10 text-center">
                          <Users size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {isRTL ? 'لا يوجد مشتركون حاليًا. ابدأ بإضافة أول مشترك بشكل نظيف.' : 'No subscribers yet. Start by adding the first clean subscriber.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="md:hidden p-4 space-y-3">
                            {entityPagedItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                              <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                      {activeSubTab === 'suppliers'
                                        ? getSupplierName(item)
                                        : activeSubTab === 'shareholders'
                                          ? getInvestorName(item)
                                          : activeSubTab === 'managers'
                                            ? getManagerName(item)
                                            : getIptvName(item)}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                                      {activeSubTab === 'suppliers'
                                        ? (item['كود'] || item['الرمز'] || '-')
                                        : activeSubTab === 'shareholders'
                                          ? (item.ownership || '-')
                                          : activeSubTab === 'managers'
                                            ? (item['الصلاحية'] || item.role || '-')
                                            : getIptvServiceTypeLabel(item)}
                                    </p>
                                  </div>
                                  <SmartActionMenu
                                    item={item}
                                    actions={getActions(item)}
                                    isOpen={openActionMenuId === item.id}
                                    onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                                    isRTL={isRTL}
                                    isLastRows={items.length > 3 && index >= items.length - 1}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {activeSubTab === 'suppliers' && (
                                    <>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'مدين' : 'Debt'}</p><p className="mt-1 font-black text-rose-600 dark:text-rose-400">{formatCurrency(parseSupplierAmount(item['مدين']), state.currency, state.lang, 2)}</p></div>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'الرصيد' : 'Balance'}</p><p className="mt-1 font-black text-blue-600 dark:text-blue-400">{formatCurrency(parseSupplierAmount(item['الرصيد']), state.currency, state.lang, 2)}</p></div>
                                    </>
                                  )}
                                  {activeSubTab === 'shareholders' && (
                                    <>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'الأسهم' : 'Shares'}</p><p className="mt-1 font-black text-blue-600 dark:text-blue-400">{formatNumber(Number(item.shares || 0))}</p></div>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'الأرباح' : 'Dividends'}</p><p className="mt-1 font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(item.dividends || 0), state.currency, state.lang, 2)}</p></div>
                                    </>
                                  )}
                                  {activeSubTab === 'managers' && (
                                    <>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'الحالة' : 'Status'}</p><p className="mt-1 font-black text-emerald-600 dark:text-emerald-400">{isManagerActive(item) ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'مجمد' : 'Disabled')}</p></div>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'الرصيد' : 'Balance'}</p><p className="mt-1 font-black text-blue-600 dark:text-blue-400">{formatCurrency(Number(item.balance || item['الرصيد'] || 0), state.currency, state.lang, 2)}</p></div>
                                    </>
                                  )}
                                  {activeSubTab === 'iptv' && (
                                    <>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'سعر البيع' : 'Price'}</p><p className="mt-1 font-black text-blue-600 dark:text-blue-400">{formatCurrency(Number(item.price || 0), state.currency, state.lang, 2)}</p></div>
                                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3"><p className="text-slate-500">{isRTL ? 'التكلفة' : 'Cost'}</p><p className="mt-1 font-black text-amber-600 dark:text-amber-400">{formatCurrency(Number(item.cost || 0), state.currency, state.lang, 2)}</p></div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="overflow-x-auto">
                            <table dir={isRTL ? 'rtl' : 'ltr'} className={`hidden md:table w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
                              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'المعرف' : 'ID'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الاسم الأول' : 'First Name'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'اسم العائلة' : 'Last Name'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'اسم المستخدم' : 'Username'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الهاتف' : 'Phone'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الباقة' : 'Plan'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'المدير' : 'Manager'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الاتصال' : 'Connection'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الانتهاء' : 'Expiry'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase">{isRTL ? 'الرصيد' : 'Balance'}</th>
                                  <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {subscriberPagedItems.map((item, index, items) => (
                                  <tr
                                    key={item.id}
                                    onDoubleClick={() => handleEdit(item)}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                                    title={isRTL ? 'انقر مرتين لتحرير بيانات المشترك' : 'Double click to edit subscriber'}
                                  >
                                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{getSubscriberCode(item) || '-'}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white">{getSubscriberFirstName(item) || '-'}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white">{getSubscriberLastName(item) || '-'}</td>
                                    <td className="px-4 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">{getSubscriberUsername(item) || '-'}</td>
                                    <td className="px-4 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">{getSubscriberPhone(item) || '-'}</td>
                                    <td className="px-4 py-4 text-xs text-slate-700 dark:text-slate-300">{getSubscriberPlan(item) || '-'}</td>
                                    <td className="px-4 py-4 text-xs text-slate-700 dark:text-slate-300">{getSubscriberParent(item) || '-'}</td>
                                    <td className="px-4 py-4">
                                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${getSubscriberStatusClass(item)}`}>
                                        {getSubscriberStatusLabel(item)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${isSubscriberOnline(item) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'}`}>
                                        {isSubscriberOnline(item) ? (isRTL ? 'متصل' : 'Online') : (isRTL ? 'غير متصل' : 'Offline')}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-xs font-mono text-slate-500">{getSubscriberExpiryValue(item) || '-'}</td>
                                    <td className="px-4 py-4">
                                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${getSubscriberBalanceClass(item)}`}>
                                        {formatCurrency(getNumberValue(item.balance ?? item['الرصيد المتبقي له']), state.currency, state.lang, 2)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-right relative z-[30]">
                                      <SmartActionMenu
                                        item={item}
                                        actions={getActions(item)}
                                        isOpen={openActionMenuId === item.id}
                                        onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                                        isRTL={isRTL}
                                        isLastRows={items.length > 4 && index >= items.length - 2}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {isRTL
                                ? `عرض ${(subscriberPage - 1) * subscriberPageSize + 1}-${Math.min(subscriberPage * subscriberPageSize, filteredItems.length)} من ${filteredItems.length}`
                                : `Showing ${(subscriberPage - 1) * subscriberPageSize + 1}-${Math.min(subscriberPage * subscriberPageSize, filteredItems.length)} of ${filteredItems.length}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => setSubscriberPage(1)} disabled={subscriberPage === 1} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'الأولى' : 'First'}</button>
                              <button type="button" onClick={() => setSubscriberPage((page) => Math.max(1, page - 1))} disabled={subscriberPage === 1} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'السابق' : 'Prev'}</button>
                              <span className="px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-200">
                                {subscriberPage} / {subscriberTotalPages}
                              </span>
                              <button type="button" onClick={() => setSubscriberPage((page) => Math.min(subscriberTotalPages, page + 1))} disabled={subscriberPage === subscriberTotalPages} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'التالي' : 'Next'}</button>
                              <button type="button" onClick={() => setSubscriberPage(subscriberTotalPages)} disabled={subscriberPage === subscriberTotalPages} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'الأخيرة' : 'Last'}</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">
                          {subscriberWorkspaceMode === 'add'
                            ? (isRTL ? 'إضافة مشترك جديد' : 'Add New Subscriber')
                            : (isRTL ? 'تفاصيل المشترك وتحريره' : 'Subscriber Details & Edit')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {isRTL ? 'صفحة مستقلة منظمة بدل النافذة المنبثقة، مع ربط الحقول بالخدمات المرتبطة.' : 'Organized standalone page instead of a modal, with service-linked fields.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <SystemClockBadge state={state} compact />
                        <button
                          type="button"
                          onClick={() => setIsSubscriberHelpOpen((open) => !open)}
                          className="px-4 py-2.5 rounded-xl border border-teal-200 dark:border-teal-500/20 bg-teal-50/80 dark:bg-teal-500/10 text-sm font-bold text-teal-700 dark:text-teal-300"
                        >
                          {isSubscriberHelpOpen ? (isRTL ? 'إخفاء الدليل' : 'Hide Guide') : (isRTL ? 'دليل الحقول' : 'Field Guide')}
                        </button>
                        <button type="button" onClick={closeSubscriberWorkspace} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                          {isRTL ? 'العودة إلى الجدول' : 'Back to Table'}
                        </button>
                      </div>
                    </div>

                    {subscriberFormState && (
                      <div className="p-5 md:p-6 space-y-8">
                        {isSubscriberHelpOpen && (
                          <div className="rounded-3xl border border-teal-200/70 dark:border-teal-500/20 bg-teal-50/70 dark:bg-teal-500/5 p-5 space-y-4">
                            <div className="flex items-center gap-3">
                              <CircleHelp size={18} className="text-teal-600 dark:text-teal-400" />
                              <div>
                                <h5 className="text-sm font-black text-slate-900 dark:text-white">{isRTL ? 'دليل الحقول' : 'Field Guide'}</h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {isRTL ? 'هذا الدليل يشرح وظيفة كل خانة حتى يكون استخدام النظام سهلاً لأي مدير أو موظف جديد.' : 'This guide explains each field so the system stays easy for any new manager or staff member.'}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                              {subscriberHelpSections.map((section) => (
                                <div key={section.title} className="rounded-2xl border border-white/70 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-3">
                                  <h6 className="text-sm font-black text-slate-900 dark:text-white">{section.title}</h6>
                                  <div className="space-y-3">
                                    {section.items.map(([title, description]) => (
                                      <div key={title}>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p>
                                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">{isRTL ? 'معلومات الخدمة' : 'Service Details'}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الحالة' : 'Status'} helpText={subscriberFieldHelp.status} isRTL={isRTL} />
                                <select value={String(subscriberFormState.status || 'active')} onChange={(e) => setSubscriberFormField('status', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm">
                                  <option value="active">{t.management.subscribers.statuses.active}</option>
                                  <option value="suspended">{t.management.subscribers.statuses.suspended}</option>
                                  <option value="expired">{t.management.subscribers.statuses.expired}</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'نوع الاشتراك' : 'Subscription Type'} helpText={subscriberFieldHelp.subType} isRTL={isRTL} />
                                <select value={String(subscriberFormState.subType || subscriberFormState['نوع الاشتراك'] || 'pppoe')} onChange={(e) => setSubscriberFormField('subType', e.target.value, { 'نوع الاشتراك': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm">
                                  <option value="pppoe">PPPoE</option>
                                  <option value="hotspot">Hotspot</option>
                                  <option value="static">Static</option>
                                </select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <FieldHelpLabel label={isRTL ? 'الباقة' : 'Plan'} helpText={subscriberFieldHelp.plan} isRTL={isRTL} />
                                <select
                                  value={String(subscriberFormState.plan || subscriberFormState['سرعة الخط'] || '')}
                                  onChange={(e) => {
                                    const selected = networkProfiles.find((p: NetworkProfile) => p.name === e.target.value);
                                    let subType = String(subscriberFormState.subType || subscriberFormState['نوع الاشتراك'] || 'pppoe');
                                    if (selected && (selected.type === 'hotspot' || selected.type === 'both')) subType = 'hotspot';
                                    if (selected && selected.type === 'pppoe') subType = 'pppoe';
                                    setSubscriberFormField('plan', e.target.value, {
                                      'سرعة الخط': e.target.value,
                                      subType,
                                      'نوع الاشتراك': subType,
                                    });
                                    applySubscriberPlanDefaults(selected || null);
                                  }}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                >
                                  <option value="">{isRTL ? '-- اختر الباقة --' : '-- Select Plan --'}</option>
                                  {networkProfiles.map((profile: NetworkProfile) => (
                                    <option key={profile.id} value={profile.name}>
                                      {profile.name}{profile.price ? ` — ${profile.price} ILS` : ''}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {isRTL ? 'السعر ووقت/تاريخ الانتهاء يُطبقان أوليًا من إعدادات الباقة، ثم يمكن تعديلهما يدويًا.' : 'Price and expiry date/time are applied from the package first, then can be adjusted manually.'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const selected = networkProfiles.find((p: NetworkProfile) => p.name === String(subscriberFormState.plan || subscriberFormState['سرعة الخط'] || ''));
                                      applySubscriberPlanDefaults(selected || null);
                                    }}
                                    disabled={!String(subscriberFormState.plan || subscriberFormState['سرعة الخط'] || '')}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-black text-teal-600 dark:text-teal-400 disabled:opacity-40"
                                  >
                                    {isRTL ? 'تطبيق إعدادات الباقة' : 'Apply Package Defaults'}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <FieldHelpLabel label={isRTL ? 'تابع إلى مدير' : 'Assigned Manager'} helpText={subscriberFieldHelp.parent} isRTL={isRTL} />
                                <select value={String(subscriberFormState.parent || subscriberFormState['الوكيل المسؤل'] || '')} onChange={(e) => setSubscriberFormField('parent', e.target.value, { 'الوكيل المسؤل': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm">
                                  <option value="">{isRTL ? '-- اختر المدير --' : '-- Select Manager --'}</option>
                                  {subscriberManagerOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الراوتر / الموقع' : 'Router / Site'} helpText={subscriberFieldHelp.router} isRTL={isRTL} />
                                <select
                                  value={String(subscriberFormState.routerId || subscriberFormState.location || subscriberFormState.site || '')}
                                  onChange={(e) => setSubscriberFormField('routerId', e.target.value, { location: e.target.value, site: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                >
                                  <option value="">{isRTL ? '-- اختر الراوتر --' : '-- Select Router --'}</option>
                                  {routersList.map((router: RouterRecord) => (
                                    <option key={router.id} value={router.id}>
                                      {router.name || router.host || router.id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'المجموعة' : 'Group'} helpText={subscriberFieldHelp.group} isRTL={isRTL} />
                                <select
                                  value={String(subscriberFormState.group || subscriberFormState.groupName || subscriberFormState['اسم المجموعة'] || '')}
                                  onChange={(e) => setSubscriberFormField('group', e.target.value, { groupName: e.target.value, 'اسم المجموعة': e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"
                                >
                                  <option value="">{isRTL ? '-- اختر المجموعة --' : '-- Select Group --'}</option>
                                  {subscriberGroupOptions.map((groupName) => (
                                    <option key={groupName} value={groupName}>{groupName}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'} helpText={subscriberFieldHelp.expiry} isRTL={isRTL} />
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {isRTL ? 'الصيغة المقبولة: YYYY-MM-DD مثل 2026-08-03' : 'Accepted format: YYYY-MM-DD, for example 2026-08-03'}
                                </p>
                                <DateInput value={String(subscriberFormState.expiry || '')} onChange={(val) => setSubscriberFormField('expiry', val)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'وقت الانتهاء' : 'Expiry Time'} helpText={subscriberFieldHelp.expiryTime} isRTL={isRTL} />
                                <TimeSelectInput
                                  value={String(subscriberFormState.expiry_time || subscriberFormState['وقت الانتهاء'] || '23:59:59')}
                                  onChange={(nextValue) => setSubscriberFormField('expiry_time', nextValue, { 'وقت الانتهاء': nextValue })}
                                  isRTL={isRTL}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">{isRTL ? 'بيانات الدخول والهوية' : 'Identity & Access'}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الاسم الأول' : 'First Name'} helpText={subscriberFieldHelp.firstName} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.firstname || subscriberFormState['الاسم الأول'] || '')} onChange={(e) => setSubscriberFormField('firstname', e.target.value, { 'الاسم الأول': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'اسم العائلة' : 'Last Name'} helpText={subscriberFieldHelp.lastName} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.lastname || subscriberFormState['اسم العائلة'] || '')} onChange={(e) => setSubscriberFormField('lastname', e.target.value, { 'اسم العائلة': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'اسم المستخدم' : 'Username'} helpText={subscriberFieldHelp.username} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.username || subscriberFormState['اسم المستخدم'] || '')} onChange={(e) => setSubscriberFormField('username', e.target.value, { 'اسم المستخدم': e.target.value, 'اسم الدخول': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'كلمة المرور' : 'Password'} helpText={subscriberFieldHelp.password} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.password || subscriberFormState['كلمة المرور'] || '')} onChange={(e) => setSubscriberFormField('password', e.target.value, { 'كلمة المرور': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <FieldHelpLabel label={isRTL ? 'اسم العرض على المايكروتيك' : 'MikroTik Display Name'} helpText={subscriberFieldHelp.mikrotikName} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.name || subscriberFormState['اسم العرض على المايكروتيك'] || '')} onChange={(e) => setSubscriberFormField('name', e.target.value, { 'اسم العرض على المايكروتيك': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الهاتف' : 'Phone'} helpText={subscriberFieldHelp.phone} isRTL={isRTL} />
                                <input type="text" inputMode="tel" lang="en" value={String(subscriberFormState.phone || subscriberFormState['رقم الموبايل'] || '')} onChange={(e) => setSubscriberFormField('phone', normalizeDigits(e.target.value), { 'رقم الموبايل': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الرقم الوطني' : 'National ID'} helpText={subscriberFieldHelp.idNumber} isRTL={isRTL} />
                                <input type="text" inputMode="numeric" lang="en" value={String(subscriberFormState.idNumber || subscriberFormState['رقم الهوية'] || '')} onChange={(e) => setSubscriberFormField('idNumber', normalizeDigits(e.target.value), { 'رقم الهوية': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'البريد الإلكتروني' : 'Email'} helpText={subscriberFieldHelp.email} isRTL={isRTL} />
                                <input type="email" value={String(subscriberFormState.email || '')} onChange={(e) => setSubscriberFormField('email', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'المدينة' : 'City'} helpText={subscriberFieldHelp.city} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.city || subscriberFormState['المدينة'] || '')} onChange={(e) => setSubscriberFormField('city', e.target.value, { 'المدينة': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'الحي / الموقع' : 'Area / Location'} helpText={subscriberFieldHelp.location} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.location || '')} onChange={(e) => setSubscriberFormField('location', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                              <div className="space-y-2">
                                <FieldHelpLabel label={isRTL ? 'العنوان' : 'Address'} helpText={subscriberFieldHelp.address} isRTL={isRTL} />
                                <input type="text" value={String(subscriberFormState.address || subscriberFormState['عنوان المشترك'] || '')} onChange={(e) => setSubscriberFormField('address', e.target.value, { 'عنوان المشترك': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">{isRTL ? 'التفاصيل المالية والشبكية' : 'Financial & Network Details'}</h5>
                          <div className="rounded-2xl border border-blue-200/70 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/5 p-4">
                            <p className="text-xs font-black text-blue-700 dark:text-blue-300">
                              {isRTL ? 'الرصيد والمديونية سيتم ربطهما بالنظام المالي. القيم هنا للعرض فقط وتبدأ من الصفر عند إنشاء المشترك.' : 'Balance and debt will be linked to the financial system. Values here are display-only and start from zero for a new subscriber.'}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'الرصيد' : 'Balance'} helpText={subscriberFieldHelp.balance} isRTL={isRTL} />
                              <input type="text" inputMode="decimal" lang="en" readOnly value={String(subscriberFormState.balance || subscriberFormState['الرصيد المتبقي له'] || '0')} className="w-full bg-slate-100 dark:bg-[#111114] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'المديونية' : 'Debt'} helpText={subscriberFieldHelp.debt} isRTL={isRTL} />
                              <input type="text" inputMode="decimal" lang="en" readOnly value={String(subscriberFormState.debt || subscriberFormState['عليه دين'] || '0')} className="w-full bg-slate-100 dark:bg-[#111114] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'قيمة الفاتورة' : 'Bill Value'} helpText={subscriberFieldHelp.bill} isRTL={isRTL} />
                              <input type="text" inputMode="decimal" lang="en" value={String(subscriberFormState.bill || subscriberFormState['قيمة الفاتورة'] || '0')} onChange={(e) => setSubscriberFormField('bill', normalizeDigits(e.target.value), { 'قيمة الفاتورة': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'النقاط التشجيعية' : 'Reward Points'} helpText={subscriberFieldHelp.rewardPoints} isRTL={isRTL} />
                              <input type="text" inputMode="numeric" lang="en" value={String(subscriberFormState.rewardPoints || subscriberFormState['النقاط التشجيعية'] || '0')} onChange={(e) => setSubscriberFormField('rewardPoints', normalizeDigits(e.target.value), { 'النقاط التشجيعية': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'IP اللايت بيم' : 'LiteBeam IP'} helpText={subscriberFieldHelp.litebeamIp} isRTL={isRTL} />
                              <input type="text" value={String(subscriberFormState.ip || subscriberFormState.ip_litebeam || '')} onChange={(e) => setSubscriberFormField('ip', e.target.value, { ip_litebeam: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                              <FieldHelpLabel label={isRTL ? 'MAC اللايت بيم' : 'LiteBeam MAC'} helpText={subscriberFieldHelp.litebeamMac} isRTL={isRTL} />
                              <input type="text" value={String(subscriberFormState.mac || subscriberFormState.mac_litebeam || '')} onChange={(e) => setSubscriberFormField('mac', e.target.value, { mac_litebeam: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2 xl:col-span-4">
                              <FieldHelpLabel label={isRTL ? 'ملاحظات' : 'Notes'} helpText={subscriberFieldHelp.notes} isRTL={isRTL} />
                              <textarea value={String(subscriberFormState.notes || subscriberFormState['ملاحظات اخرى'] || '')} onChange={(e) => setSubscriberFormField('notes', e.target.value, { 'ملاحظات اخرى': e.target.value })} rows={4} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm resize-none" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <button type="button" onClick={closeSubscriberWorkspace} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button type="button" onClick={subscriberWorkspaceMode === 'add' ? handleSaveAdd : handleSave} className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2">
                            <Save size={18} />
                            {subscriberWorkspaceMode === 'add' ? (isRTL ? 'حفظ المشترك' : 'Save Subscriber') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {useEntityWorkspace && (
              <div className="p-4 md:p-6 space-y-6">
                {entityWorkspaceMode === 'list' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {activeSubTab === 'suppliers' && (
                        <>
                          <button type="button" onClick={() => setEntityQuickFilter('all')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'all' ? 'border-teal-300 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-500/10 ring-1 ring-teal-200/70 dark:ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الموردين' : 'Suppliers'}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(supplierSummary.count)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('debt')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'debt' ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 ring-1 ring-rose-200/70 dark:ring-rose-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'المدينون فقط' : 'With Debt'}</p>
                            <p className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(supplierSummary.totalDebt, state.currency, state.lang, 2)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('negative')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'negative' ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-200/70 dark:ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'رصيد سلبي' : 'Negative Balance'}</p>
                            <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(supplierSummary.totalBalance, state.currency, state.lang, 2)}</p>
                          </button>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المسدد' : 'Total Paid'}</p>
                            <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(supplierSummary.totalPaid, state.currency, state.lang, 2)}</p>
                          </div>
                        </>
                      )}
                      {activeSubTab === 'shareholders' && (
                        <>
                          <button type="button" onClick={() => setEntityQuickFilter('all')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'all' ? 'border-teal-300 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-500/10 ring-1 ring-teal-200/70 dark:ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المستثمرين' : 'Investors'}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(investorSummary.count)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('high_shares')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'high_shares' ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 ring-1 ring-blue-200/70 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'أسهم مرتفعة' : 'High Shares'}</p>
                            <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatNumber(investorSummary.totalShares)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('with_dividends')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'with_dividends' ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-200/70 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'أرباح موزعة' : 'With Dividends'}</p>
                            <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(investorSummary.totalDividends, state.currency, state.lang, 2)}</p>
                          </button>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</p>
                            <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(investorSummary.totalInvestment, state.currency, state.lang, 2)}</p>
                          </div>
                        </>
                      )}
                      {activeSubTab === 'managers' && (
                        <>
                          <button type="button" onClick={() => setEntityQuickFilter('all')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'all' ? 'border-teal-300 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-500/10 ring-1 ring-teal-200/70 dark:ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الطاقم' : 'Team Members'}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(managerSummary.count)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('active')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'active' ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-200/70 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطون' : 'Active'}</p>
                            <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(managerSummary.activeCount)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('limited')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'limited' ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-200/70 dark:ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'بقيود مالية' : 'Limited'}</p>
                            <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatNumber(managerSummary.limitedCount)}</p>
                          </button>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الأرصدة' : 'Total Balance'}</p>
                            <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(managerSummary.totalBalance, state.currency, state.lang, 2)}</p>
                          </div>
                        </>
                      )}
                      {activeSubTab === 'iptv' && (
                        <>
                          <button type="button" onClick={() => setEntityQuickFilter('all')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'all' ? 'border-teal-300 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-500/10 ring-1 ring-teal-200/70 dark:ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الخدمات' : 'Digital Services'}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(iptvSummary.count)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('service_active')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'service_active' ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-200/70 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطة' : 'Active'}</p>
                            <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(iptvSummary.activeCount)}</p>
                          </button>
                          <button type="button" onClick={() => setEntityQuickFilter('service_profitable')} className={`rounded-2xl border p-4 text-start transition-all ${entityQuickFilter === 'service_profitable' ? 'border-blue-300 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 ring-1 ring-blue-200/70 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014]'}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأكثر ربحية' : 'Profitable'}</p>
                            <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(iptvSummary.totalRevenue - iptvSummary.totalCost, state.currency, state.lang, 2)}</p>
                          </button>
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</p>
                            <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(iptvSummary.totalCost, state.currency, state.lang, 2)}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] overflow-hidden">
                      <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">
                            {activeSubTab === 'suppliers'
                              ? (isRTL ? 'لوحة إدارة الموردين' : 'Supplier Operations Console')
                              : activeSubTab === 'shareholders'
                                ? (isRTL ? 'لوحة إدارة المستثمرين' : 'Investor Operations Console')
                                : activeSubTab === 'managers'
                                  ? (isRTL ? 'لوحة إدارة الطاقم الإداري' : 'Management Team Console')
                                  : (isRTL ? 'لوحة إدارة الخدمات الرقمية' : 'Digital Services Console')}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {isRTL ? 'عرض احترافي موحّد مع فرز سريع وصفحات وتحرير مباشر من نفس السياق.' : 'Unified professional view with quick filtering, pagination, and direct in-context editing.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRTL ? 'إظهار' : 'Show'}</label>
                          <select
                            value={entityPageSize}
                            onChange={(e) => {
                              setEntityPageSize(Number(e.target.value));
                              setEntityPage(1);
                            }}
                            className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold"
                          >
                            {[10, 20, 50, 100].map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isRTL ? 'في الصفحة' : 'per page'}</span>
                        </div>
                      </div>

                      {entityPagedItems.length === 0 ? (
                        <div className="p-10 text-center">
                          <Users size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {isRTL ? 'لا توجد بيانات حالياً. ابدأ بإضافة سجل جديد.' : 'No records yet. Start by adding a new item.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
                              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  {activeTableColumns.map((col) => (
                                    <th key={col.id} className={`px-4 py-4 text-xs font-black text-slate-500 uppercase ${col.headerClassName || ''}`}>
                                      {col.label}
                                    </th>
                                  ))}
                                  <th className="px-4 py-4"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {entityPagedItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                                  <tr key={item.id} onDoubleClick={() => handleEdit(item)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer">
                                    {activeTableColumns.map((col) => (
                                      <td key={col.id} className={`px-4 py-4 align-middle ${col.cellClassName || ''}`}>
                                        {col.render(item)}
                                      </td>
                                    ))}
                                    <td className="px-4 py-4 text-right relative z-[30]">
                                      <SmartActionMenu
                                        item={item}
                                        actions={getActions(item)}
                                        isOpen={openActionMenuId === item.id}
                                        onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                                        isRTL={isRTL}
                                        isLastRows={items.length > 4 && index >= items.length - 2}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {isRTL
                                ? `عرض ${(entityPage - 1) * entityPageSize + 1}-${Math.min(entityPage * entityPageSize, filteredItems.length)} من ${filteredItems.length}`
                                : `Showing ${(entityPage - 1) * entityPageSize + 1}-${Math.min(entityPage * entityPageSize, filteredItems.length)} of ${filteredItems.length}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => setEntityPage(1)} disabled={entityPage === 1} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'الأولى' : 'First'}</button>
                              <button type="button" onClick={() => setEntityPage((page) => Math.max(1, page - 1))} disabled={entityPage === 1} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'السابق' : 'Prev'}</button>
                              <span className="px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-200">{entityPage} / {entityTotalPages}</span>
                              <button type="button" onClick={() => setEntityPage((page) => Math.min(entityTotalPages, page + 1))} disabled={entityPage === entityTotalPages} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'التالي' : 'Next'}</button>
                              <button type="button" onClick={() => setEntityPage(entityTotalPages)} disabled={entityPage === entityTotalPages} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">{isRTL ? 'الأخيرة' : 'Last'}</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">
                          {entityWorkspaceMode === 'add'
                            ? (activeSubTab === 'suppliers' ? (isRTL ? 'إضافة مورد جديد' : 'Add New Supplier') : activeSubTab === 'shareholders' ? (isRTL ? 'إضافة مستثمر جديد' : 'Add New Investor') : activeSubTab === 'managers' ? (isRTL ? 'إضافة عضو إداري جديد' : 'Add New Manager') : (isRTL ? 'إضافة خدمة رقمية' : 'Add Digital Service'))
                            : (activeSubTab === 'suppliers' ? (isRTL ? 'تعديل بيانات المورد' : 'Edit Supplier') : activeSubTab === 'shareholders' ? (isRTL ? 'تعديل بيانات المستثمر' : 'Edit Investor') : activeSubTab === 'managers' ? (isRTL ? 'تعديل بيانات العضو الإداري' : 'Edit Team Member') : (isRTL ? 'تعديل الخدمة الرقمية' : 'Edit Digital Service'))}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {isRTL ? 'صفحة مستقلة للإدخال والتعديل بنفس فلسفة تبويب المشتركين.' : 'Standalone add/edit page following the subscriber workspace style.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEntityHelpOpen((open) => !open)}
                          className="px-4 py-2.5 rounded-xl border border-teal-200 dark:border-teal-500/20 bg-teal-50/80 dark:bg-teal-500/10 text-sm font-bold text-teal-700 dark:text-teal-300"
                        >
                          {isEntityHelpOpen ? (isRTL ? 'إخفاء الدليل' : 'Hide Guide') : (isRTL ? 'دليل الحقول' : 'Field Guide')}
                        </button>
                        <button type="button" onClick={closeEntityWorkspace} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                          {isRTL ? 'العودة إلى الجدول' : 'Back to Table'}
                        </button>
                      </div>
                    </div>
                    {entityFormState && (
                      <div className="p-5 md:p-6 space-y-5">
                        {isEntityHelpOpen && entityHelpSections.length > 0 && (
                          <div className="rounded-3xl border border-teal-200/70 dark:border-teal-500/20 bg-teal-50/70 dark:bg-teal-500/5 p-5 space-y-4">
                            <div className="flex items-center gap-3">
                              <CircleHelp size={18} className="text-teal-600 dark:text-teal-400" />
                              <div>
                                <h5 className="text-sm font-black text-slate-900 dark:text-white">{isRTL ? 'دليل الحقول' : 'Field Guide'}</h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {isRTL ? 'شرح مبسط للحقول الأساسية في هذا التبويب لضمان إدخال دقيق.' : 'Simple explanation of key fields in this tab to ensure accurate data entry.'}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {entityHelpSections.map((section) => (
                                <div key={section.title} className="rounded-2xl border border-white/70 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-3">
                                  <h6 className="text-sm font-black text-slate-900 dark:text-white">{section.title}</h6>
                                  <div className="space-y-3">
                                    {section.items.map(([title, description]) => (
                                      <div key={title}>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p>
                                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {activeSubTab === 'suppliers' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم المورد' : 'Supplier Name'}</label><input type="text" value={String(entityFormState['اسم المورد'] || entityFormState['الاسم'] || '')} onChange={(e) => setEntityFormField('اسم المورد', e.target.value, { 'الاسم': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كود المورد' : 'Supplier Code'}</label><input type="text" value={String(entityFormState['كود'] || entityFormState['الرمز'] || '')} onChange={(e) => setEntityFormField('كود', e.target.value, { 'الرمز': e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مدين' : 'Debt'}</label><input type="text" inputMode="decimal" value={String(entityFormState['مدين'] || '0')} onChange={(e) => setEntityFormField('مدين', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مسدد' : 'Paid'}</label><input type="text" inputMode="decimal" value={String(entityFormState['مسدد'] || '0')} onChange={(e) => setEntityFormField('مسدد', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الرصيد' : 'Balance'}</label><input type="text" inputMode="decimal" value={String(entityFormState['الرصيد'] || '0')} onChange={(e) => setEntityFormField('الرصيد', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</label><textarea rows={4} value={String(entityFormState['ملاحظات'] || '')} onChange={(e) => setEntityFormField('ملاحظات', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm resize-none" /></div>
                          </div>
                        )}
                        {activeSubTab === 'shareholders' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم' : 'Name'}</label><input type="text" value={String(entityFormState.name || '')} onChange={(e) => setEntityFormField('name', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأسهم' : 'Shares'}</label><input type="text" inputMode="decimal" value={String(entityFormState.shares || '0')} onChange={(e) => { const shares = normalizeDigits(e.target.value); const buyPrice = Number(entityFormState.buyPrice || 0); setEntityFormField('shares', shares, { investment: Number(shares || 0) * buyPrice }); }} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'سعر الشراء' : 'Buy Price'}</label><input type="text" inputMode="decimal" value={String(entityFormState.buyPrice || '0')} onChange={(e) => { const buyPrice = normalizeDigits(e.target.value); const shares = Number(entityFormState.shares || 0); setEntityFormField('buyPrice', buyPrice, { investment: shares * Number(buyPrice || 0) }); }} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاستثمار' : 'Investment'}</label><input type="text" inputMode="decimal" value={String(entityFormState.investment || '0')} onChange={(e) => setEntityFormField('investment', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الأرباح' : 'Dividends'}</label><input type="text" inputMode="decimal" value={String(entityFormState.dividends || '0')} onChange={(e) => setEntityFormField('dividends', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الملكية' : 'Ownership'}</label><select value={String(entityFormState.ownership || 'personal')} onChange={(e) => setEntityFormField('ownership', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="personal">{isRTL ? 'شخصي' : 'Personal'}</option><option value="corporate">{isRTL ? 'شركة' : 'Corporate'}</option><option value="partner">{isRTL ? 'شريك' : 'Partner'}</option></select></div>
                          </div>
                        )}
                        {activeSubTab === 'managers' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الأول' : 'First Name'}</label><input type="text" value={String(entityFormState['الاسم الاول'] || entityFormState.firstName || '')} onChange={(e) => setEntityFormField('الاسم الاول', e.target.value, { firstName: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الثاني' : 'Last Name'}</label><input type="text" value={String(entityFormState['الاسم الثاني'] || entityFormState.lastName || '')} onChange={(e) => setEntityFormField('الاسم الثاني', e.target.value, { lastName: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم الدخول' : 'Username'}</label><input type="text" value={String(entityFormState['اسم الدخول'] || entityFormState.username || '')} onChange={(e) => setEntityFormField('اسم الدخول', e.target.value, { username: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة المرور' : 'Password'}</label><input type="text" value={String(entityFormState['كلمة المرور'] || entityFormState.password || '')} onChange={(e) => setEntityFormField('كلمة المرور', e.target.value, { password: e.target.value })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مجموعة الصلاحيات' : 'Permission Group'}</label><select value={String(entityFormState['الصلاحية'] || '')} onChange={(e) => { const group = state.securityGroups.find((g) => g.name === e.target.value); setEntityFormField('الصلاحية', e.target.value, { role: e.target.value, groupId: group?.id || '' }); }} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="">{isRTL ? '-- اختر المجموعة --' : '-- Select Group --'}</option>{state.securityGroups.map((group) => (<option key={group.id} value={group.name}>{group.name}</option>))}</select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الحالة' : 'Status'}</label><select value={String(entityFormState.status || 'active')} onChange={(e) => setEntityFormField('status', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="active">{isRTL ? 'نشط' : 'Active'}</option><option value="inactive">{isRTL ? 'مجمد' : 'Disabled'}</option></select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الرصيد' : 'Balance'}</label><input type="text" inputMode="decimal" value={String(entityFormState.balance || entityFormState['الرصيد'] || '0')} onChange={(e) => setEntityFormField('balance', normalizeDigits(e.target.value), { 'الرصيد': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الحد المالي' : 'Tx Limit'}</label><input type="text" inputMode="decimal" value={String(entityFormState.maxTxLimit || entityFormState['الحد المالي'] || '')} onChange={(e) => setEntityFormField('maxTxLimit', normalizeDigits(e.target.value), { 'الحد المالي': normalizeDigits(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</label><textarea rows={3} value={String(entityFormState.notes || '')} onChange={(e) => setEntityFormField('notes', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm resize-none" /></div>
                          </div>
                        )}
                        {activeSubTab === 'iptv' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.name}</label><input type="text" value={String(entityFormState.name || '')} onChange={(e) => setEntityFormField('name', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.serviceType}</label><select value={String(entityFormState.serviceType || 'iptv')} onChange={(e) => setEntityFormField('serviceType', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="iptv">{t.management.iptv.serviceTypes.iptv}</option><option value="vpn">{t.management.iptv.serviceTypes.vpn}</option><option value="static_ip">{t.management.iptv.serviceTypes.static_ip}</option><option value="cloud_storage">{t.management.iptv.serviceTypes.cloud_storage}</option><option value="security">{t.management.iptv.serviceTypes.security}</option><option value="other">{t.management.iptv.serviceTypes.other}</option></select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.provider}</label><input type="text" value={String(entityFormState.platform || '')} onChange={(e) => setEntityFormField('platform', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.host}</label><input type="text" value={String(entityFormState.host || '')} onChange={(e) => setEntityFormField('host', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.billingCycle}</label><select value={String(entityFormState.billingCycle || 'monthly')} onChange={(e) => setEntityFormField('billingCycle', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="monthly">{t.management.iptv.billingCycles.monthly}</option><option value="quarterly">{t.management.iptv.billingCycles.quarterly}</option><option value="yearly">{t.management.iptv.billingCycles.yearly}</option><option value="one_time">{t.management.iptv.billingCycles.one_time}</option></select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.status}</label><select value={String(entityFormState.status || 'active')} onChange={(e) => setEntityFormField('status', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm"><option value="active">{t.management.iptv.statuses.active}</option><option value="suspended">{t.management.iptv.statuses.suspended}</option><option value="expired">{t.management.iptv.statuses.expired}</option></select></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.price}</label><input type="text" inputMode="decimal" value={String(entityFormState.price || 0)} onChange={(e) => setEntityFormField('price', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.cost}</label><input type="text" inputMode="decimal" value={String(entityFormState.cost || 0)} onChange={(e) => setEntityFormField('cost', normalizeDigits(e.target.value))} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.expiry}</label><DateInput value={String(entityFormState.expiry || '')} onChange={(val) => setEntityFormField('expiry', val)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm" /></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.phone}</label><input type="text" value={String(entityFormState.phone || '')} onChange={(e) => setEntityFormField('phone', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-mono" /></div>
                            <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملاحظات' : 'Notes'}</label><textarea rows={3} value={String(entityFormState.notes || '')} onChange={(e) => setEntityFormField('notes', e.target.value)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm resize-none" /></div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <button type="button" onClick={closeEntityWorkspace} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                          <button type="button" onClick={entityWorkspaceMode === 'add' ? handleSaveAdd : handleSave} className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2">
                            <Save size={18} />
                            {entityWorkspaceMode === 'add' ? (isRTL ? 'حفظ' : 'Save') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'subscribers' && !useSubscriberWorkspace && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المشتركين' : 'Subscribers'}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(subscriberSummary.count)}</p>
                    </div>
                    <Users className="text-teal-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطون' : 'Active'}</p>
                      <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(subscriberSummary.activeCount)}</p>
                    </div>
                    <Wifi className="text-emerald-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'المتصلون الآن' : 'Online Now'}</p>
                      <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatNumber(subscriberSummary.onlineCount)}</p>
                    </div>
                    <Activity className="text-blue-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الرصيد' : 'Total Balance'}</p>
                      <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(subscriberSummary.totalBalance, state.currency, state.lang, 2)}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">{formatNumber(subscriberSummary.debtCount)} {isRTL ? 'عليهم دين' : 'with debt'}</p>
                    </div>
                    <CreditCard className="text-amber-500" size={24} />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === 'iptv' && !useEntityWorkspace && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الخدمات' : 'Digital Services'}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(iptvSummary.count)}</p>
                    </div>
                    <PieChart className="text-teal-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطون' : 'Active'}</p>
                      <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(iptvSummary.activeCount)}</p>
                    </div>
                    <Wifi className="text-emerald-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي سعر البيع' : 'Total Sell Value'}</p>
                      <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(iptvSummary.totalRevenue, state.currency, state.lang, 2)}</p>
                    </div>
                    <Coins className="text-blue-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</p>
                      <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(iptvSummary.totalCost, state.currency, state.lang, 2)}</p>
                    </div>
                    <CreditCard className="text-amber-500" size={24} />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === 'suppliers' && !useEntityWorkspace && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الموردين' : 'Suppliers'}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(supplierSummary.count)}</p>
                    </div>
                    <Truck className="text-teal-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المدين' : 'Total Debt'}</p>
                      <p className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(supplierSummary.totalDebt, state.currency, state.lang, 2)}</p>
                    </div>
                    <AlertCircle className="text-rose-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المسدد' : 'Total Paid'}</p>
                      <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(supplierSummary.totalPaid, state.currency, state.lang, 2)}</p>
                    </div>
                    <CreditCard className="text-emerald-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'صافي الرصيد' : 'Net Balance'}</p>
                      <p className={`mt-2 text-xl font-black ${supplierSummary.totalBalance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>
                        {formatCurrency(supplierSummary.totalBalance, state.currency, state.lang, 2)}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">{formatNumber(supplierSummary.unsettledCount)} {isRTL ? 'غير مسدد بالكامل' : 'unsettled suppliers'}</p>
                    </div>
                    <Coins className="text-amber-500" size={24} />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === 'shareholders' && !useEntityWorkspace && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي المستثمرين' : 'Investors'}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(investorSummary.count)}</p>
                    </div>
                    <PieChart className="text-teal-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الأسهم' : 'Total Shares'}</p>
                      <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatNumber(investorSummary.totalShares)}</p>
                    </div>
                    <Coins className="text-blue-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</p>
                      <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(investorSummary.totalInvestment, state.currency, state.lang, 2)}</p>
                    </div>
                    <CreditCard className="text-amber-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأرباح الموزعة' : 'Dividends'}</p>
                      <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(investorSummary.totalDividends, state.currency, state.lang, 2)}</p>
                    </div>
                    <AlertCircle className="text-emerald-500" size={24} />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === 'managers' && !useEntityWorkspace && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الطاقم' : 'Team Members'}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatNumber(managerSummary.count)}</p>
                    </div>
                    <ShieldCheck className="text-teal-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'النشطون' : 'Active'}</p>
                      <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(managerSummary.activeCount)}</p>
                    </div>
                    <Users className="text-emerald-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'إجمالي الأرصدة' : 'Total Balances'}</p>
                      <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(managerSummary.totalBalance, state.currency, state.lang, 2)}</p>
                    </div>
                    <Wallet className="text-blue-500" size={24} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'بقيود مالية' : 'With Limits'}</p>
                      <p className="mt-2 text-xl font-black text-amber-600 dark:text-amber-400">{formatNumber(managerSummary.limitedCount)}</p>
                    </div>
                    <Lock className="text-amber-500" size={24} />
                  </div>
                </div>
              </div>
            )}
            {activeSubTab === 'subscribers' && !useSubscriberWorkspace && (
              <div className="md:hidden p-4 space-y-3">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                  <div
                    key={item.id}
                    onDoubleClick={() => handleEdit(item)}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-4 cursor-pointer"
                    title={isRTL ? 'انقر مرتين لتحرير بيانات المشترك' : 'Double click to edit subscriber'}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 font-black text-sm shrink-0">
                          {(getSubscriberDisplayName(item) || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{getSubscriberDisplayName(item)}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{getSubscriberUsername(item) || getSubscriberCode(item) || '-'}</p>
                        </div>
                      </div>
                      <SmartActionMenu item={item} actions={getActions(item)} isOpen={openActionMenuId === item.id} onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} isRTL={isRTL} isLastRows={items.length > 3 && index >= items.length - 1} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-xl p-3 ${getSubscriberStatusClass(item)}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الحالة' : 'Status'}</p>
                        <p className="mt-2 text-xs font-black">{getSubscriberStatusLabel(item)}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${getSubscriberBalanceClass(item)}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الرصيد' : 'Balance'}</p>
                        <p className="mt-2 text-xs font-black">{formatCurrency(getNumberValue(item.balance ?? item['الرصيد المتبقي له']), state.currency, state.lang, 2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الباقة' : 'Plan'}</p>
                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">{item.plan || item['سرعة الخط'] || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الانتهاء' : 'Expiry'}</p>
                        <p className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">{item.expiry || item['تاريخ ناهية الاشتراك'] || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubTab === 'iptv' && !useEntityWorkspace && (
              <div className="md:hidden p-4 space-y-3">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 font-black text-sm shrink-0">
                          {(getIptvName(item) || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{getIptvName(item)}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{getEntityValue(item, 'host') || '-'}</p>
                        </div>
                      </div>
                      <SmartActionMenu item={item} actions={getActions(item)} isOpen={openActionMenuId === item.id} onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} isRTL={isRTL} isLastRows={items.length > 3 && index >= items.length - 1} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'نوع الخدمة' : 'Service Type'}</p>
                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">{getIptvServiceTypeLabel(item)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'المزود' : 'Provider'}</p>
                        <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">{item.platform || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'السعر' : 'Price'}</p>
                        <p className="mt-2 text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(getNumberValue(item.price), state.currency, state.lang, 2)}</p>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'دورة الفوترة' : 'Billing'}</p>
                        <p className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">{getIptvBillingCycleLabel(item)}</p>
                      </div>
                      <div className="rounded-xl border p-3 bg-white/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الحالة' : 'Status'}</p>
                        <span className={`mt-2 inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black ${getIptvStatusClass(item)}`}>{getIptvStatusLabel(item)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubTab === 'suppliers' && !useEntityWorkspace && (
              <div className="md:hidden p-4 space-y-3">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => {
                  const balanceValue = parseSupplierAmount(item['الرصيد']);
                  const balanceClass = balanceValue < 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : balanceValue > 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400';

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                            {(getSupplierName(item) || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{getSupplierName(item) || '-'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:text-slate-300 font-mono">
                                {getSupplierCode(item) || '-'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate">{item.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <SmartActionMenu 
                            item={item}
                            actions={getActions(item)}
                            isOpen={openActionMenuId === item.id}
                            onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                            isRTL={isRTL}
                            isLastRows={items.length > 3 && index >= items.length - 1}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'مدين' : 'Debt'}</p>
                          <p className="mt-2 text-xs font-black text-rose-600 dark:text-rose-400 break-words">{formatSupplierAmount(item['مدين'])}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'مسدد' : 'Paid'}</p>
                          <p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400 break-words">{formatSupplierAmount(item['مسدد'])}</p>
                        </div>
                        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الرصيد' : 'Balance'}</p>
                          <p className={`mt-2 text-xs font-black break-words ${balanceClass}`}>{formatSupplierAmount(item['الرصيد'])}</p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'ملاحظات' : 'Notes'}</p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">{getSupplierNotes(item) || '-'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeSubTab === 'shareholders' && !useEntityWorkspace && (
              <div className="md:hidden p-4 space-y-3">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
                          {(getInvestorName(item) || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{getInvestorName(item)}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">{item.id}</p>
                        </div>
                      </div>
                      <SmartActionMenu item={item} actions={getActions(item)} isOpen={openActionMenuId === item.id} onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} isRTL={isRTL} isLastRows={items.length > 3 && index >= items.length - 1} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأسهم' : 'Shares'}</p>
                        <p className="mt-2 text-xs font-black text-blue-600 dark:text-blue-400">{formatNumber(getNumberValue(item.shares))}</p>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'سعر الشراء' : 'Buy Price'}</p>
                        <p className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">{formatCurrency(getNumberValue(item.buyPrice), state.currency, state.lang, 2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الاستثمار' : 'Investment'}</p>
                        <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-300">{formatCurrency(getNumberValue(item.investment), state.currency, state.lang, 2)}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأرباح' : 'Dividends'}</p>
                        <p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(getNumberValue(item.dividends), state.currency, state.lang, 2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubTab === 'managers' && !useEntityWorkspace && (
              <div className="md:hidden p-4 space-y-3">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${(item.role === 'super_admin' || item['الصلاحية'] === 'Super Admin') ? 'bg-amber-500/10 text-amber-600' : 'bg-teal-500/10 text-teal-600'}`}>
                          {(getManagerName(item) || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{getManagerName(item)}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{item.username || item['اسم الدخول'] || '-'}</p>
                        </div>
                      </div>
                      <SmartActionMenu item={item} actions={getActions(item)} isOpen={openActionMenuId === item.id} onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)} isRTL={isRTL} isLastRows={items.length > 3 && index >= items.length - 1} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الدور' : 'Role'}</p>
                        <p className="mt-2 text-xs font-black text-slate-700 dark:text-slate-300">{getManagerRole(item)}</p>
                      </div>
                      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الرصيد' : 'Balance'}</p>
                        <p className="mt-2 text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(getNumberValue(item.balance ?? item['الرصيد']), state.currency, state.lang, 2)}</p>
                      </div>
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الحد المالي' : 'Tx Limit'}</p>
                        <p className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">{(item.maxTxLimit || item['الحد المالي']) ? formatCurrency(getNumberValue(item.maxTxLimit ?? item['الحد المالي']), state.currency, state.lang, 2) : (isRTL ? 'بدون قيود' : 'No Limit')}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الحالة' : 'Status'}</p>
                        <p className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">{isManagerActive(item) ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'مجمد' : 'Disabled')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubTab !== 'subscribers' && !useEntityWorkspace && (
            <table
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`${['subscribers', 'suppliers', 'shareholders', 'managers', 'iptv'].includes(activeSubTab) ? 'hidden md:table w-full' : 'w-full'} ${activeSubTab === 'suppliers' ? 'min-w-[780px] table-auto' : ''} ${isRTL ? 'text-right' : 'text-left'} border-collapse`}
            >
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#09090B] z-[10]">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {activeTableColumns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-4 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} ${col.headerClassName || ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item: DynamicItem, index: number, items: DynamicItem[]) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    {activeTableColumns.map((col) => (
                      <td key={col.id} className={`px-4 py-4 align-middle ${col.cellClassName || ''}`}>
                        {col.render(item)}
                      </td>
                    ))}
                  <td className="px-6 py-6 text-right relative z-[30]">
                    <SmartActionMenu 
                      item={item}
                      actions={getActions(item)}
                      isOpen={openActionMenuId === item.id}
                      onToggle={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                      isRTL={isRTL}
                      isLastRows={items.length > 4 && index >= items.length - 2}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            )}
        </div>
      )}
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
                        {Object.values(routerDiagnostics).map((rd: RouterDiagnostic, idx) => (
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
        {isSyncModalOpen && (syncModalMode === 'bulk' || syncingSubscriber) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSyncModal}
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
                      {syncModalMode === 'bulk'
                        ? (isRTL ? 'مزامنة جماعية مع أجهزة MikroTik' : 'Bulk Sync to MikroTik')
                        : (isRTL ? 'مزامنة مع جهاز MikroTik' : 'Sync to MikroTik')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {syncModalMode === 'bulk'
                        ? (isRTL ? `سيتم تطبيق المزامنة على ${getBulkSyncTargets().targets.length} مشترك صالح.` : `${getBulkSyncTargets().targets.length} valid subscribers will be processed.`)
                        : (syncingSubscriber?.username || syncingSubscriber?.name || syncingSubscriber?.id)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSyncModal}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Subscriber Info Card */}
                {syncModalMode === 'single' && syncingSubscriber ? (
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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getSubscriberStatusClass(syncingSubscriber)}`}>
                          {getSubscriberStatusLabel(syncingSubscriber)}
                        </span>
                        {syncingSubscriber.plan && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg font-medium">{syncingSubscriber.plan}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {isRTL ? 'مزامنة جماعية وفق قواعد النظام' : 'Bulk Sync Using System Rules'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {isRTL ? 'سيتم تطبيق نفس قواعد الحالة والانتهاء على كل مشترك صالح للمزامنة.' : 'The same status and expiry rules will be applied to every valid subscriber.'}
                        </p>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-500/20">
                        {isRTL ? `${getBulkSyncTargets().targets.length} مشترك` : `${getBulkSyncTargets().targets.length} subscribers`}
                      </span>
                    </div>
                  </div>
                )}

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
                    {routersList.map((router: RouterRecord) => (
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
                    ? syncModalMode === 'bulk'
                      ? 'ستطبق المزامنة الجماعية القواعد نفسها على الجميع: النشط يُفعّل، المعلق يُعطّل، المنتهي يُحذف، والمنتهي زمنياً يُعطّل ويُطرد من الاتصال.'
                      : 'ستقوم المزامنة بإنشاء أو تحديث سر PPPoE للمشترك في الجهاز المحدد، ثم تطبق حالته الفعلية تلقائياً حسب الحالة والانتهاء.'
                    : syncModalMode === 'bulk'
                      ? 'Bulk sync applies the same rules to everyone: active gets enabled, suspended gets disabled, expired gets deleted, and time-expired subscribers are disabled and disconnected.'
                      : 'Sync will create or update the subscriber secret on the selected device, then apply the actual access state automatically based on status and expiry.'}
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
                        {syncResult.details.map((d: SyncResultDetail, i: number) => (
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
                            {d.success && d.profile && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <Zap size={11} className="text-indigo-400" />
                                {isRTL ? 'الباقة المطبقة:' : 'Profile applied:'} <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{d.profile}</span>
                              </div>
                            )}
                            {d.note && (
                              <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                ⚠️ {d.note}
                              </div>
                            )}
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
        {isAddModalOpen && activeSubTab !== 'subscribers' && activeSubTab !== 'suppliers' && activeSubTab !== 'shareholders' && activeSubTab !== 'managers' && activeSubTab !== 'iptv' && (
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
                    {getAddButtonLabel()}
                  </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {activeSubTab === 'shareholders' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 col-span-full">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.name}</label>
                        <input 
                          type="text" 
                          value={newItem.name || ''}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-lg"
                          placeholder={isRTL ? 'أدخل الاسم الكامل للمستثمر' : 'Enter investor full name'}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.shares}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.shares ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const shares = parseFloat(val) || 0;
                            const buyPrice = newItem.buyPrice || 0;
                            setNewItem({ ...newItem, shares: val, investment: shares * buyPrice });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-black text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.buyPrice}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.buyPrice ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const buyPrice = parseFloat(val) || 0;
                            const shares = newItem.shares || 0;
                            setNewItem({ ...newItem, buyPrice: val, investment: shares * buyPrice });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-black text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.investment}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.investment ?? 0}
                          readOnly
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-teal-600 dark:text-teal-400 font-black text-lg cursor-not-allowed font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.ownership}</label>
                        <input 
                          type="text" 
                          lang="en"
                          value={newItem.ownership || '0%'}
                          onChange={(e) => setNewItem({ ...newItem, ownership: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.dividends}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.dividends ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setNewItem({ ...newItem, dividends: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-emerald-600 font-black text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'subscribers' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الأول' : 'First Name'}</label>
                        <input
                          type="text"
                          value={newItem.firstname || newItem['الاسم الأول'] || ''}
                          onChange={(e) => setNewItem({ ...newItem, firstname: e.target.value, 'الاسم الأول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم العائلة' : 'Last Name'}</label>
                        <input
                          type="text"
                          value={newItem.lastname || newItem['اسم العائلة'] || ''}
                          onChange={(e) => setNewItem({ ...newItem, lastname: e.target.value, 'اسم العائلة': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم المستخدم' : 'Username'}</label>
                        <input
                          type="text"
                          value={newItem.username || newItem['اسم المستخدم'] || ''}
                          onChange={(e) => setNewItem({ ...newItem, username: e.target.value, 'اسم المستخدم': e.target.value, 'اسم الدخول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                        <input
                          type="text"
                          value={newItem.password || newItem['كلمة المرور'] || ''}
                          onChange={(e) => setNewItem({ ...newItem, password: e.target.value, 'كلمة المرور': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2 col-span-full">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isRTL ? 'اسم العرض على المايكروتيك' : 'MikroTik Display Name'}
                        </label>
                        <input 
                          type="text" 
                          value={newItem.name || newItem['اسم العرض على المايكروتيك'] || ''}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value, 'اسم العرض على المايكروتيك': e.target.value })}
                          placeholder={isRTL ? 'اسم لاتيني يظهر كتسمية/تعليق داخل المايكروتيك' : 'Latin display/comment shown inside MikroTik'}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isRTL ? 'هذا الحقل مخصص لاسم العرض أو التعليق في المايكروتيك، وليس اسم المشترك العربي.' : 'Used as the display/comment name in MikroTik, not the Arabic subscriber name.'}
                        </p>
                      </div>
                      {SUBSCRIBER_COLUMNS.filter(col => !['id', 'firstname', 'lastname', 'name', 'username', 'password'].includes(col.id)).map((col) => {
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
                                  {networkProfiles.map((p: NetworkProfile) => (
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
                            ) : fieldType === 'date' ? (
                            <DateInput
                              value={String(newItem[col.id] || newItem[col.key || ''] || '')}
                              onChange={(val) => setNewItem({ ...newItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            />
                            ) : (
                            <input 
                              type={['balance', 'debt', 'paid', 'bill'].includes(col.id) ? "text" : fieldType} 
                              inputMode={['balance', 'debt', 'paid', 'bill'].includes(col.id) ? "decimal" : undefined}
                              lang="en"
                              value={newItem[col.id] || newItem[col.key || ''] || (['balance', 'debt', 'paid', 'bill'].includes(col.id) ? 0 : '')}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (['balance', 'debt', 'paid', 'bill'].includes(col.id)) {
                                  val = val.replace(/[^0-9.]/g, '');
                                }
                                setNewItem({ ...newItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })
                              }}
                              className={`w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${['balance', 'debt', 'paid', 'bill'].includes(col.id) ? 'font-mono' : ''}`}
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.name}</label>
                      <input
                        type="text"
                        value={String(newItem.name || '')}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder={isRTL ? 'مثال: اشتراك IPTV بريميوم' : 'e.g. IPTV Premium Service'}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.serviceType}</label>
                        <select
                          value={String(newItem.serviceType || 'iptv')}
                          onChange={(e) => setNewItem({ ...newItem, serviceType: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="iptv">{t.management.iptv.serviceTypes.iptv}</option>
                          <option value="vpn">{t.management.iptv.serviceTypes.vpn}</option>
                          <option value="static_ip">{t.management.iptv.serviceTypes.static_ip}</option>
                          <option value="cloud_storage">{t.management.iptv.serviceTypes.cloud_storage}</option>
                          <option value="security">{t.management.iptv.serviceTypes.security}</option>
                          <option value="other">{t.management.iptv.serviceTypes.other}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.billingCycle}</label>
                        <select
                          value={String(newItem.billingCycle || 'monthly')}
                          onChange={(e) => setNewItem({ ...newItem, billingCycle: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="monthly">{t.management.iptv.billingCycles.monthly}</option>
                          <option value="quarterly">{t.management.iptv.billingCycles.quarterly}</option>
                          <option value="yearly">{t.management.iptv.billingCycles.yearly}</option>
                          <option value="one_time">{t.management.iptv.billingCycles.one_time}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.provider}</label>
                        <input 
                          type="text" 
                          value={String(newItem.platform || '')}
                          onChange={(e) => setNewItem({ ...newItem, platform: e.target.value })}
                          placeholder={isRTL ? 'اسم المزود أو المنصة' : 'Provider or platform name'}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.host}</label>
                        <input 
                          type="text" 
                          value={String(newItem.host || '')}
                          onChange={(e) => setNewItem({ ...newItem, host: e.target.value })}
                          placeholder={isRTL ? 'الرابط أو المضيف' : 'Service endpoint / host'}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.username}</label>
                        <input 
                          type="text" 
                          value={String(newItem.username || '')}
                          onChange={(e) => setNewItem({ ...newItem, username: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.password}</label>
                        <input 
                          type="text" 
                          value={String(newItem.password || '')}
                          onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.expiry}</label>
                        <DateInput
                          value={String(newItem.expiry || '')}
                          onChange={(val) => setNewItem({ ...newItem, expiry: val })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.price}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.price ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setNewItem({ ...newItem, price: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.cost}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={newItem.cost ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setNewItem({ ...newItem, cost: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.phone}</label>
                        <input 
                          type="text" 
                          value={String(newItem.phone || '')}
                          onChange={(e) => setNewItem({ ...newItem, phone: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
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
                        placeholder={isRTL ? 'أضف ملاحظات حول هذه الخدمة...' : 'Add notes about this service...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'suppliers' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SUPPLIER_FIELDS.filter(field => field.key !== 'ملاحظات').map(field => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                          <input
                            type="text"
                            inputMode={['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'decimal' : undefined}
                            lang={['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'en' : undefined}
                            value={newItem[field.key] ?? ''}
                            onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                            placeholder={field.key === 'الرصيد' ? '-' : ''}
                            className={`w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'font-mono text-lg font-black' : 'font-bold'}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                      <textarea
                        rows={4}
                        value={newItem['ملاحظات'] ?? ''}
                        onChange={(e) => setNewItem({ ...newItem, 'ملاحظات': e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        placeholder={isRTL ? 'أضف أي ملاحظات مالية أو تشغيلية عن المورد...' : 'Add financial or operational notes about this supplier...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'managers' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الاول' : 'First Name'}</label>
                        <input 
                          type="text" 
                          value={newItem.firstName || ''}
                          onChange={(e) => setNewItem({ ...newItem, firstName: e.target.value, 'الاسم الاول': e.target.value, name: `${e.target.value} ${newItem.lastName || newItem['الاسم الثاني'] || ''}`.trim() })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الثاني' : 'Last Name'}</label>
                        <input 
                          type="text" 
                          value={newItem.lastName || ''}
                          onChange={(e) => setNewItem({ ...newItem, lastName: e.target.value, 'الاسم الثاني': e.target.value, name: `${newItem.firstName || newItem['الاسم الاول'] || ''} ${e.target.value}`.trim() })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم الدخول' : 'Username'}</label>
                        <input 
                          type="text" 
                          value={newItem.username || ''}
                          onChange={(e) => setNewItem({ ...newItem, username: e.target.value, 'اسم الدخول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الرقم السري' : 'Password'}</label>
                        <input 
                          type="password" 
                          value={newItem.password || ''}
                          onChange={(e) => setNewItem({ ...newItem, password: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهوية' : 'ID Number'}</label>
                        <input 
                          type="text" 
                          value={newItem.idNumber || ''}
                          onChange={(e) => setNewItem({ ...newItem, idNumber: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      {MANAGER_FIELDS.map(field => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                          {field.key === 'الصلاحية' ? (
                            <select
                              value={newItem[field.key] || ''}
                              onChange={(e) => {
                                const group = state.securityGroups.find(g => g.name === e.target.value);
                                setNewItem({ 
                                  ...newItem, 
                                  [field.key]: e.target.value,
                                  'الصلاحية': e.target.value,
                                  role: e.target.value, // Mapping for display
                                  groupId: group?.id || ''
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                            >
                              <option value="">{isRTL ? '-- اختر المجموعة --' : '-- Select Group --'}</option>
                              {state.securityGroups.map(group => (
                                <option key={group.id} value={group.name}>{group.name}</option>
                              ))}
                            </select>
                          ) : field.key === 'تابع لـ' ? (
                            <select
                              value={newItem[field.key] || ''}
                              onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                            >
                              <option value="">{isRTL ? '-- لا يوجد (مدير رئيسي) --' : '-- None (Top Level) --'}</option>
                              {managers.map(m => (
                                <option key={m.id} value={m.name || m.username || m['اسم الدخول']}>
                                  {m.name || m.username || m['اسم الدخول']}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              value={newItem[field.key] ?? ''}
                              onChange={(e) => setNewItem({ ...newItem, [field.key]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl space-y-4">
                      <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
                        <CreditCard size={18} />
                        {isRTL ? 'الحوكمة والقيود المالية' : 'Financial Governance & Limits'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {isRTL ? 'سقف العملية (الشحن)' : 'Max Transaction Limit'}
                          </label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            lang="en"
                            value={newItem.maxTxLimit ?? 0}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setNewItem({ ...newItem, maxTxLimit: val });
                            }}
                            className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-3 h-full pt-6">
                           <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newItem.isLimitEnabled || false}
                              onChange={(e) => setNewItem({ ...newItem, isLimitEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                            <span className="ms-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                              {isRTL ? 'تفعيل الرقابة' : 'Enable Limit'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
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
        {isEditModalOpen && activeSubTab !== 'subscribers' && activeSubTab !== 'suppliers' && activeSubTab !== 'shareholders' && activeSubTab !== 'managers' && activeSubTab !== 'iptv' && (
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
                {activeSubTab !== 'subscribers' && activeSubTab !== 'suppliers' && activeSubTab !== 'admins' && activeSubTab !== 'managers' && activeSubTab !== 'shareholders' && (
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

                {activeSubTab === 'shareholders' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 col-span-full">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.name}</label>
                        <input 
                          type="text" 
                          value={editingItem.name || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.shares}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.shares ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const shares = parseFloat(val) || 0;
                            const buyPrice = editingItem.buyPrice || 0;
                            setEditingItem({ ...editingItem, shares: val, investment: shares * buyPrice });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-black text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.buyPrice}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.buyPrice ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            const buyPrice = parseFloat(val) || 0;
                            const shares = editingItem.shares || 0;
                            setEditingItem({ ...editingItem, buyPrice: val, investment: shares * buyPrice });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-black text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.investment}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.investment ?? 0}
                          readOnly
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-teal-600 dark:text-teal-400 font-black text-lg cursor-not-allowed font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.ownership}</label>
                        <input 
                          type="text" 
                          lang="en"
                          value={editingItem.ownership || '0%'}
                          onChange={(e) => setEditingItem({ ...editingItem, ownership: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-lg font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.management.investors.table.dividends}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.dividends ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setEditingItem({ ...editingItem, dividends: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-emerald-600 font-black text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'suppliers' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {SUPPLIER_FIELDS.filter(field => field.key !== 'ملاحظات').map(field => (
                        <div key={field.key} className={`space-y-2 ${field.key === 'اسم المورد' ? 'md:col-span-2' : ''}`}>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{field.label}</label>
                          <input
                            type="text"
                            inputMode={['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'decimal' : undefined}
                            lang={['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'en' : undefined}
                            value={editingItem[field.key] ?? ''}
                            onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                            placeholder={field.key === 'الرصيد' ? '-' : ''}
                            className={`w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${['مدين', 'مسدد', 'الرصيد'].includes(field.key) ? 'font-mono text-lg font-black' : 'font-bold'}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'مدين' : 'Debt'}</p>
                          <p className="mt-2 text-lg font-black text-rose-600 dark:text-rose-400">{formatSupplierAmount(editingItem['مدين'])}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'مسدد' : 'Paid'}</p>
                          <p className="mt-2 text-lg font-black text-emerald-600 dark:text-emerald-400">{formatSupplierAmount(editingItem['مسدد'])}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الرصيد' : 'Balance'}</p>
                          <p className={`mt-2 text-lg font-black ${parseSupplierAmount(editingItem['الرصيد']) < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>
                            {formatSupplierAmount(editingItem['الرصيد'])}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                      <textarea
                        rows={4}
                        value={editingItem['ملاحظات'] ?? ''}
                        onChange={(e) => setEditingItem({ ...editingItem, 'ملاحظات': e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        placeholder={isRTL ? 'أضف أي ملاحظات مالية أو تشغيلية عن المورد...' : 'Add financial or operational notes about this supplier...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'subscribers' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الأول' : 'First Name'}</label>
                        <input
                          type="text"
                          value={editingItem.firstname || editingItem['الاسم الأول'] || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, firstname: e.target.value, 'الاسم الأول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم العائلة' : 'Last Name'}</label>
                        <input
                          type="text"
                          value={editingItem.lastname || editingItem['اسم العائلة'] || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, lastname: e.target.value, 'اسم العائلة': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم المستخدم' : 'Username'}</label>
                        <input
                          type="text"
                          value={editingItem.username || editingItem['اسم المستخدم'] || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value, 'اسم المستخدم': e.target.value, 'اسم الدخول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                        <input
                          type="text"
                          value={editingItem.password || editingItem['كلمة المرور'] || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value, 'كلمة المرور': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2 col-span-full">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isRTL ? 'اسم العرض على المايكروتيك' : 'MikroTik Display Name'}
                        </label>
                        <input 
                          type="text" 
                          value={editingItem.name || editingItem['اسم العرض على المايكروتيك'] || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value, 'اسم العرض على المايكروتيك': e.target.value })}
                          placeholder={isRTL ? 'اسم لاتيني يظهر كتسمية/تعليق داخل المايكروتيك' : 'Latin display/comment shown inside MikroTik'}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isRTL ? 'هذا الحقل يُرسل كاسم عرض/تعليق للمشترك داخل المايكروتيك.' : 'This field is sent as the subscriber display/comment inside MikroTik.'}
                        </p>
                      </div>
                      {SUBSCRIBER_COLUMNS.filter(col => !['id', 'firstname', 'lastname', 'name', 'username', 'password'].includes(col.id)).map((col) => {
                        let fieldType = 'text';
                        if (['balance', 'debt', 'paid', 'bill'].includes(col.id)) fieldType = 'number';
                        if (['startDate', 'expiry'].includes(col.id)) fieldType = 'date';
                        
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
                               networkProfiles.length > 0 ? (
                                 <select
                                   value={editingItem.plan || editingItem['سرعة الخط'] || ''}
                                   onChange={(e) => {
                                     const selected = networkProfiles.find((p: NetworkProfile) => p.name === e.target.value);
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
                                   className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                 >
                                   <option value="">{isRTL ? '-- اختر الباقة --' : '-- Select Plan --'}</option>
                                   {networkProfiles.map((p: NetworkProfile) => (
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
                            ) : fieldType === 'date' ? (
                              <DateInput
                                value={String(editingItem[col.id] || editingItem[col.key || ''] || '')}
                                onChange={(val) => setEditingItem({ ...editingItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })}
                                className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                              />
                            ) : (
                              <input 
                                type={['balance', 'debt', 'paid', 'bill'].includes(col.id) ? "text" : fieldType} 
                                inputMode={['balance', 'debt', 'paid', 'bill'].includes(col.id) ? "decimal" : undefined}
                                lang="en"
                                value={editingItem[col.id] || editingItem[col.key || ''] || (['balance', 'debt', 'paid', 'bill'].includes(col.id) ? 0 : '')}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (['balance', 'debt', 'paid', 'bill'].includes(col.id)) {
                                    val = val.replace(/[^0-9.]/g, '');
                                  }
                                  setEditingItem({ ...editingItem, [col.id]: val, ...(col.key ? { [col.key]: val } : {}) })
                                }}
                                className={`w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${['balance', 'debt', 'paid', 'bill'].includes(col.id) ? 'font-mono' : ''}`}
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.name}</label>
                      <input
                        type="text"
                        value={String(editingItem.name || '')}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.serviceType}</label>
                        <select
                          value={String(editingItem.serviceType || 'iptv')}
                          onChange={(e) => setEditingItem({ ...editingItem, serviceType: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="iptv">{t.management.iptv.serviceTypes.iptv}</option>
                          <option value="vpn">{t.management.iptv.serviceTypes.vpn}</option>
                          <option value="static_ip">{t.management.iptv.serviceTypes.static_ip}</option>
                          <option value="cloud_storage">{t.management.iptv.serviceTypes.cloud_storage}</option>
                          <option value="security">{t.management.iptv.serviceTypes.security}</option>
                          <option value="other">{t.management.iptv.serviceTypes.other}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.billingCycle}</label>
                        <select
                          value={String(editingItem.billingCycle || 'monthly')}
                          onChange={(e) => setEditingItem({ ...editingItem, billingCycle: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        >
                          <option value="monthly">{t.management.iptv.billingCycles.monthly}</option>
                          <option value="quarterly">{t.management.iptv.billingCycles.quarterly}</option>
                          <option value="yearly">{t.management.iptv.billingCycles.yearly}</option>
                          <option value="one_time">{t.management.iptv.billingCycles.one_time}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.provider}</label>
                        <input 
                          type="text" 
                          value={String(editingItem.platform || '')}
                          onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.host}</label>
                        <input 
                          type="text" 
                          value={String(editingItem.host || '')}
                          onChange={(e) => setEditingItem({ ...editingItem, host: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.price}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.price ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setEditingItem({ ...editingItem, price: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.cost}</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          lang="en"
                          value={editingItem.cost ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setEditingItem({ ...editingItem, cost: val });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.expiry}</label>
                        <DateInput
                          value={String(editingItem.expiry || '')}
                          onChange={(val) => setEditingItem({ ...editingItem, expiry: val })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.management.iptv.table.status}</label>
                        <select 
                          value={String(editingItem.status || 'active')}
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
                        value={String(editingItem.notes || '')}
                        onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        placeholder={isRTL ? 'أضف ملاحظات حول هذه الخدمة...' : 'Add notes about this service...'}
                      />
                    </div>
                  </div>
                )}

                {activeSubTab === 'managers' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الاول' : 'First Name'}</label>
                        <input 
                          type="text" 
                          value={editingItem.firstName || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, firstName: e.target.value, 'الاسم الاول': e.target.value, name: `${e.target.value} ${editingItem.lastName || editingItem['الاسم الثاني'] || ''}`.trim() })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الاسم الثاني' : 'Last Name'}</label>
                        <input 
                          type="text" 
                          value={editingItem.lastName || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, lastName: e.target.value, 'الاسم الثاني': e.target.value, name: `${editingItem.firstName || editingItem['الاسم الاول'] || ''} ${e.target.value}`.trim() })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'اسم الدخول' : 'Username'}</label>
                        <input 
                          type="text" 
                          value={editingItem.username || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value, 'اسم الدخول': e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الرقم السري' : 'Password'}</label>
                        <input 
                          type="password" 
                          value={editingItem.password || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'رقم الهوية' : 'ID Number'}</label>
                        <input 
                          type="text" 
                          value={editingItem.idNumber || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, idNumber: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                        />
                      </div>
                      {MANAGER_FIELDS.map(field => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                          {field.key === 'الصلاحية' ? (
                            <select
                              value={editingItem[field.key] || ''}
                              onChange={(e) => {
                                const group = state.securityGroups.find(g => g.name === e.target.value);
                                setEditingItem({ 
                                  ...editingItem, 
                                  [field.key]: e.target.value,
                                  'الصلاحية': e.target.value,
                                  role: e.target.value, // Mapping for display
                                  groupId: group?.id || ''
                                });
                              }}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                            >
                              <option value="">{isRTL ? '-- اختر المجموعة --' : '-- Select Group --'}</option>
                              {state.securityGroups.map(group => (
                                <option key={group.id} value={group.name}>{group.name}</option>
                              ))}
                            </select>
                          ) : field.key === 'تابع لـ' ? (
                            <select
                              value={editingItem[field.key] || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                            >
                              <option value="">{isRTL ? '-- لا يوجد (مدير رئيسي) --' : '-- None (Top Level) --'}</option>
                              {managers.filter(m => m.id !== editingItem.id).map(m => (
                                <option key={m.id} value={m.name || m.username || m['اسم الدخول']}>
                                  {m.name || m.username || m['اسم الدخول']}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              value={editingItem[field.key] ?? ''}
                              onChange={(e) => setEditingItem({ ...editingItem, [field.key]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl space-y-4">
                      <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
                        <CreditCard size={18} />
                        {isRTL ? 'الحوكمة والقيود المالية' : 'Financial Governance & Limits'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'سقف العملية' : 'Max Limit'}</label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            lang="en"
                            value={editingItem.maxTxLimit ?? 0}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setEditingItem({ ...editingItem, maxTxLimit: val });
                            }}
                            className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                           <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={editingItem.isLimitEnabled || false} onChange={(e) => setEditingItem({ ...editingItem, isLimitEnabled: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            <span className="ms-3 text-sm font-bold text-slate-600 dark:text-slate-400">{isRTL ? 'تفعيل الرقابة' : 'Enable Limit'}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#18181B] border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400">{t.management.cancel}</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2">
                  <Save size={18} /> {t.management.save}
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
                     <button onClick={() => setIsTemplatePromptOpen(true)} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-tighter">
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
        {/* Top Up Modal */}
        {isTopUpModalOpen && topUpTarget && (
          <div key="topup-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsTopUpModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Coins className="text-emerald-500 w-8 h-8" />
                  {t.financial.topUp}
                </h3>
                <button onClick={() => setIsTopUpModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">{isRTL ? 'المستلم:' : 'Recipient:'}</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{topUpTarget.name || topUpTarget['اسم الدخول'] || topUpTarget.username}</p>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.financial.amount}:</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      lang="en"
                      value={topUpAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setTopUpAmount(val);
                      }}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-3xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-center"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">{state.currency}</span>
                  </div>
                </div>
                <button 
                  onClick={handleTopUpManager}
                  disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <ShieldCheck size={24} />
                  {isRTL ? 'تأكيد الشحن الآن' : 'Confirm Recharge'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
          open={Boolean(deleteSecretCandidate)}
          onClose={() => setDeleteSecretCandidate(null)}
          onConfirm={confirmDeleteSecret}
          title={isRTL ? 'حذف من الراوتر فقط' : 'Delete from Router Only'}
          description={isRTL ? `سيتم حذف بيانات ${deleteSecretCandidate || ''} من المايكروتيك فقط مع الإبقاء عليه داخل النظام.` : `${deleteSecretCandidate || ''} will be removed from MikroTik only and kept in the CRM.`}
          confirmLabel={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
          cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
          variant="danger"
          isRTL={isRTL}
        />

        <AppConfirmDialog
          open={bulkDisconnectConfirmOpen}
          onClose={() => setBulkDisconnectConfirmOpen(false)}
          onConfirm={confirmDisconnectAll}
          title={isRTL ? 'قطع الاتصال عن الجميع' : 'Disconnect Everyone'}
          description={isRTL ? 'سيتم قطع الاتصال عن جميع المشتركين النشطين حاليًا بشكل مؤقت، وسيلزمهم إعادة الاتصال من جديد.' : 'All currently active subscribers will be temporarily disconnected and will need to reconnect again.'}
          confirmLabel={isRTL ? 'تنفيذ العملية' : 'Run Operation'}
          cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
          variant="warning"
          isRTL={isRTL}
        />

        <AppConfirmDialog
          open={Boolean(deleteCandidateId)}
          onClose={() => setDeleteCandidateId(null)}
          onConfirm={() => deleteCandidateId && handleDelete(deleteCandidateId)}
          title={isRTL ? 'حذف من النظام' : 'Delete from System'}
          description={isRTL ? `سيتم حذف ${getTabEntityLabel()} نهائيًا من قاعدة البيانات.` : `This ${getTabEntityLabel()} will be permanently removed from the database.`}
          confirmLabel={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
          cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
          variant="danger"
          isRTL={isRTL}
        />

        <AppPromptDialog
          open={isTemplatePromptOpen}
          onClose={() => { setIsTemplatePromptOpen(false); setTemplateDraftName(''); }}
          onConfirm={handleSaveMessageTemplate}
          title={isRTL ? 'حفظ قالب جديد' : 'Save New Template'}
          description={isRTL ? 'أدخل اسمًا للقالب الحالي حتى تتمكن من استخدامه لاحقًا بسرعة.' : 'Enter a name for the current template so you can reuse it quickly later.'}
          label={isRTL ? 'اسم القالب' : 'Template Name'}
          value={templateDraftName}
          onChange={setTemplateDraftName}
          placeholder={isRTL ? 'مثال: إشعار رصيد أو متابعة' : 'Example: Balance or follow-up notice'}
          confirmLabel={isRTL ? 'حفظ القالب' : 'Save Template'}
          cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
          isRTL={isRTL}
        />
      </AnimatePresence>

    </motion.div>
  );
}
