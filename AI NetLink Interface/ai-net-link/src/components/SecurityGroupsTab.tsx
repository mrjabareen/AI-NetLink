import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ChevronRight, 
  ChevronDown, 
  Lock, 
  Unlock, 
  Search, 
  Plus, 
  Info,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Database,
  Users as UsersIcon,
  CreditCard,
  Network,
  FileBarChart,
  Settings as SettingsIcon,
  Trash2,
  Edit2,
  RefreshCw,
  Save
} from 'lucide-react';
import { AppState, SecurityGroup, Permission } from '../types';

interface SecurityGroupsTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

interface PermissionCategory {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: any;
  permissions: { id: Permission; labelAr: string; labelEn: string; descriptionAr: string; descriptionEn: string }[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'system',
    labelAr: 'النظام الأساسي',
    labelEn: 'System',
    icon: SettingsIcon,
    permissions: [
      { id: 'view_dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', descriptionAr: 'عرض الإحصائيات العامة للنظام', descriptionEn: 'View overall system statistics' },
      { id: 'access_executive', labelAr: 'المركز الإداري والرقابة', labelEn: 'Executive Center', descriptionAr: 'الدخول إلى واجهة الإدارة التنفيذية', descriptionEn: 'Access executive management interface' },
      { id: 'view_security', labelAr: 'الأمان والتنبيهات', labelEn: 'Security & Alerts', descriptionAr: 'عرض سجلات الأمان والتحذيرات', descriptionEn: 'View security logs and warnings' },
      { id: 'access_files', labelAr: 'مدير الملفات', labelEn: 'File Manager', descriptionAr: 'الوصول إلى مستعرض الملفات الداخلي', descriptionEn: 'Access internal file explorer' },
      { id: 'access_chat', labelAr: 'المحادثة', labelEn: 'Chat', descriptionAr: 'الوصول إلى مركز المحادثة', descriptionEn: 'Access chat center' },
      { id: 'edit_settings', labelAr: 'إعدادات النظام', labelEn: 'System Settings', descriptionAr: 'تعديل الإعدادات العامة للمنظومة', descriptionEn: 'Modify general system settings' },
    ]
  },
  {
    id: 'financial',
    labelAr: 'المالية',
    labelEn: 'Financial',
    icon: CreditCard,
    permissions: [
      { id: 'view_central_balance', labelAr: 'الرصيد المركزي', labelEn: 'Central Balance', descriptionAr: 'رؤية إجمالي سيولة النظام', descriptionEn: 'View total system liquidity' },
      { id: 'wallet_deposit', labelAr: 'إيداع مالي', labelEn: 'Wallet Deposit', descriptionAr: 'إضافة رصيد لمحفظة المدراء والوكلاء', descriptionEn: 'Add balance to manager/agent wallets' },
      { id: 'wallet_withdraw', labelAr: 'سحب مالي', labelEn: 'Wallet Withdraw', descriptionAr: 'خصم رصيد من محافظ المدراء والوكلاء', descriptionEn: 'Deduct balance from manager/agent wallets' },
      { id: 'manage_tx_limits', labelAr: 'قيود العمليات', labelEn: 'TX Limits', descriptionAr: 'تعديل سقف العمليات المالية للموظفين', descriptionEn: 'Modify employee financial transaction limits' },
      { id: 'view_billing', labelAr: 'الفواتير والمطالبات', labelEn: 'Billing', descriptionAr: 'عرض وإدارة فواتير النظام', descriptionEn: 'View and manage system invoices' },
    ]
  },
  {
    id: 'users',
    labelAr: 'المشتركين',
    labelEn: 'Users',
    icon: UsersIcon,
    permissions: [
      { id: 'view_crm', labelAr: 'إدارة المشتركين', labelEn: 'Subscriber Management', descriptionAr: 'عرض قائمة المشتركين وبياناتهم', descriptionEn: 'View subscriber lists and data' },
      { id: 'view_subscribers', labelAr: 'عرض المشتركين', labelEn: 'View Subscribers', descriptionAr: 'عرض بيانات المشتركين دون تعديل', descriptionEn: 'View subscribers without editing' },
      { id: 'manage_subscribers', labelAr: 'إدارة المشتركين', labelEn: 'Manage Subscribers', descriptionAr: 'إضافة وتعديل وحذف المشتركين', descriptionEn: 'Add, edit, and delete subscribers' },
      { id: 'sub_activate', labelAr: 'تفعيل المشتركين', labelEn: 'Activate Subscribers', descriptionAr: 'صلاحية تفعيل وتجديد الاشتراكات', descriptionEn: 'Authority to activate/renew subscriptions' },
      { id: 'sub_edit', labelAr: 'تعديل البيانات', labelEn: 'Edit Data', descriptionAr: 'تعديل بيانات المشتركين والحزم', descriptionEn: 'Modify subscriber data and packages' },
      { id: 'sub_delete', labelAr: 'حذف مشتركين', labelEn: 'Delete Subscribers', descriptionAr: 'حذف سجلات المشتركين من النظام', descriptionEn: 'Remove subscriber records from system' },
    ]
  },
  {
    id: 'network',
    labelAr: 'الشبكة والخدمات',
    labelEn: 'Network & Services',
    icon: Network,
    permissions: [
      { id: 'view_topology', labelAr: 'خارطة الشبكة', labelEn: 'Network Topology', descriptionAr: 'عرض توبولوجيا الشبكة والأجهزة', descriptionEn: 'View network topology and devices' },
      { id: 'manage_topology', labelAr: 'إدارة التوبولوجيا', labelEn: 'Manage Topology', descriptionAr: 'تعديل خرائط الربط بين الشبكات والأجهزة', descriptionEn: 'Edit topology and device links' },
      { id: 'view_inventory', labelAr: 'المستودع', labelEn: 'Inventory', descriptionAr: 'عرض وإدارة مخزون الأجهزة والأدوات', descriptionEn: 'View and manage hardware inventory' },
      { id: 'manage_inventory', labelAr: 'إدارة المستودع', labelEn: 'Manage Inventory', descriptionAr: 'تعديل وإضافة وحذف عناصر المخزون', descriptionEn: 'Add, edit, and delete inventory items' },
      { id: 'view_field_service', labelAr: 'الخدمات الميدانية', labelEn: 'Field Services', descriptionAr: 'إدارة المهام الميدانية والفنيين', descriptionEn: 'Manage field tasks and technicians' },
      { id: 'manage_field_service', labelAr: 'إدارة الخدمات الميدانية', labelEn: 'Manage Field Services', descriptionAr: 'إدارة أوامر العمل وجدولة الفنيين', descriptionEn: 'Manage work orders and technician schedule' },
      { id: 'manage_iptv', labelAr: 'الخدمات الرقمية', labelEn: 'Digital Services', descriptionAr: 'إدارة خدمات IPTV/VPN والخدمات الرقمية', descriptionEn: 'Manage IPTV/VPN and digital services' },
    ]
  },
  {
    id: 'admins',
    labelAr: 'الإدارة',
    labelEn: 'Management',
    icon: Shield,
    permissions: [
      { id: 'view_admins', labelAr: 'عرض الطاقم الإداري', labelEn: 'View Management Staff', descriptionAr: 'عرض قائمة المدراء والوكلاء والموظفين', descriptionEn: 'View list of managers, agents, and staff' },
      { id: 'manage_admins', labelAr: 'إدارة الرتب', labelEn: 'Rank Management', descriptionAr: 'إضافة وتعديل بيانات المدراء الجدد', descriptionEn: 'Add and modify new manager data' },
      { id: 'manage_team', labelAr: 'إدارة الفريق', labelEn: 'Manage Team', descriptionAr: 'التحكم ببيانات الفريق والإشراف الإداري', descriptionEn: 'Control team data and administrative oversight' },
      { id: 'manage_security_groups', labelAr: 'مجموعات الأمان', labelEn: 'Security Groups', descriptionAr: 'تعديل صلاحيات مجموعات الأمان', descriptionEn: 'Modify security group permissions' },
    ]
  },
  {
    id: 'reports',
    labelAr: 'التقارير',
    labelEn: 'Reports',
    icon: FileBarChart,
    permissions: [
      { id: 'create_reports', labelAr: 'إنشاء التقارير', labelEn: 'Generate Reports', descriptionAr: 'توليد تقارير مخصصة وتصديرها', descriptionEn: 'Generate and export custom reports' },
      { id: 'perform_search', labelAr: 'البحث المتقدم', labelEn: 'Advanced Search', descriptionAr: 'استخدام أدوات البحث العميق في البيانات', descriptionEn: 'Use deep data search tools' },
      { id: 'view_financial', labelAr: 'عرض النظام المالي', labelEn: 'View Financial', descriptionAr: 'الوصول إلى لوحات وأرقام النظام المالي', descriptionEn: 'Access financial dashboards and metrics' },
    ]
  }
];

export default function SecurityGroupsTab({ state, setState }: SecurityGroupsTabProps) {
  const isRTL = state.lang === 'ar';
  
  const cleanName = (name: string) => {
    if (!name.includes('(')) return name;
    const parts = name.split(/[()]/).filter(p => p.trim());
    if (parts.length < 2) return name;
    const hasArabicMatch = parts.find(p => /[\u0600-\u06FF]/.test(p));
    const englishMatch = parts.find(p => /[a-zA-Z]/.test(p));
    if (state.lang === 'ar') return hasArabicMatch?.trim() || parts[0].trim();
    return englishMatch?.trim() || parts[0].trim();
  };

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    return localStorage.getItem('sas4_selected_group_id') || state.securityGroups[0]?.id || null;
  });
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [selectedPermissionInfo, setSelectedPermissionInfo] = useState<{ label: string; description: string } | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (selectedGroupId) {
      localStorage.setItem('sas4_selected_group_id', selectedGroupId);
    }
  }, [selectedGroupId]);

  const selectedGroup = state.securityGroups.find(g => g.id === selectedGroupId);
  const totalMembers = state.securityGroups.reduce((sum, group) => sum + group.memberCount, 0);
  const selectedPermCount = selectedGroup?.permissions.length || 0;

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const togglePermission = (permId: Permission) => {
    if (!selectedGroupId) return;
    setState(prev => ({
      ...prev,
      securityGroups: prev.securityGroups.map(group => {
        if (group.id !== selectedGroupId) return group;
        const hasPerm = group.permissions.includes(permId);
        const newPerms = hasPerm 
          ? group.permissions.filter(p => p !== permId)
          : [...group.permissions, permId];
        return { ...group, permissions: newPerms as Permission[] };
      })
    }));
  };

  const handleConfirmCreateGroup = () => {
    if (!newGroupName.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newGroup: SecurityGroup = {
        id: `grp_${Date.now()}`,
        name: newGroupName,
        description: newGroupDescription || 'مجموعة جديدة تم إنشاؤها',
        permissions: [],
        memberCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setState(prev => ({ ...prev, securityGroups: [...prev.securityGroups, newGroup] }));
      setSelectedGroupId(newGroup.id);
      setIsAddModalOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setIsSubmitting(false);
    }, 600);
  };

  const handleConfirmEditGroup = () => {
    if (!editGroupName.trim() || !selectedGroupId) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        securityGroups: prev.securityGroups.map(g => 
          g.id === selectedGroupId ? { ...g, name: editGroupName, description: editGroupDescription } : g
        )
      }));
      setIsEditModalOpen(false);
      setIsSubmitting(false);
    }, 600);
  };

  const handleConfirmDeleteGroup = () => {
    if (!selectedGroupId) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const currentGroups = state.securityGroups.filter(g => g.id !== selectedGroupId);
      setState(prev => ({ ...prev, securityGroups: currentGroups }));
      setSelectedGroupId(currentGroups[0]?.id || null);
      setIsDeleteModalOpen(false);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'المجموعات' : 'Groups'}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{state.securityGroups.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'الأعضاء' : 'Members'}</p>
          <p className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">{totalMembers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#101014] p-4">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'صلاحيات المجموعة' : 'Group Permissions'}</p>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">{selectedPermCount}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-col 2xl:flex-row gap-6">
      <div className="w-full 2xl:w-96 flex flex-col gap-4 overflow-y-auto 2xl:pr-2 custom-scrollbar shrink-0">
        <div className="flex flex-col gap-5 px-1">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
              {isRTL ? 'مجموعات الأمان' : 'Security Groups'}
            </h2>
            <Shield className="text-teal-500/50" size={18} />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-4 glass-panel border-none bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span>{isRTL ? 'إنشاء مجموعة جديدة' : 'Create New Group'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-1 gap-3">
          {state.securityGroups.map((group) => (
            <motion.div
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`p-4 glass-card cursor-pointer border-l-4 transition-all ${
                selectedGroupId === group.id 
                  ? 'border-l-teal-500 bg-teal-500/5 shadow-lg scale-[1.02]' 
                  : 'border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{cleanName(group.name)}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500">
                  {group.memberCount} {isRTL ? 'موظف' : 'Staff'}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{group.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        {selectedGroup ? (
          <>
            <div className="glass-card p-6 gradient-border relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-teal-500/10 rounded-xl shrink-0">
                      <Shield className="text-teal-500" size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate">
                        {cleanName(selectedGroup.name)}
                      </h3>
                      <p className="text-[10px] md:text-xs text-slate-500 flex items-center gap-2 mt-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0"></span>
                        {isRTL ? 'تخصيص الصلاحيات الدقيق لهذه المجموعة' : 'Fine-tune permissions for this group'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className="relative group w-full lg:w-72">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                    <input 
                      type="text" 
                      placeholder={isRTL ? "البحث..." : "Search..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 glass-panel !bg-slate-50/50 dark:!bg-slate-900/50 border-none w-full focus:ring-2 focus:ring-teal-500/30 transition-all outline-none text-sm font-bold dark:text-white`}
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button onClick={() => { setEditGroupName(selectedGroup.name); setEditGroupDescription(selectedGroup.description); setIsEditModalOpen(true); }} className="flex-1 sm:flex-none p-3 glass-panel border-none bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-teal-500 transition-all flex items-center justify-center"><Edit2 size={20} /></button>
                    <button onClick={() => setIsDeleteModalOpen(true)} className="flex-1 sm:flex-none p-3 glass-panel border-none bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center"><Trash2 size={20} /></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto xl:pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {PERMISSION_CATEGORIES.map((category) => {
                  const filteredPerms = category.permissions.filter(p => 
                    (isRTL ? p.labelAr : p.labelEn).includes(searchQuery) || (isRTL ? p.descriptionAr : p.descriptionEn).includes(searchQuery)
                  );
                  if (filteredPerms.length === 0) return null;
                  const isExpanded = expandedCategories.includes(category.id);
                  const activePerms = filteredPerms.filter(p => selectedGroup.permissions.includes(p.id));

                  return (
                    <div key={category.id} className="glass-card overflow-hidden">
                      <div 
                        onClick={() => toggleCategory(category.id)} 
                        className={`p-4 grid grid-cols-[1fr_auto] items-center gap-3 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}
                      >
                        {/* Icon & Title Group */}
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <div className="p-2 bg-teal-500/10 rounded-xl shrink-0">
                            <category.icon className="text-teal-500" size={18} />
                          </div>
                          <span className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter truncate">
                            {isRTL ? category.labelAr : category.labelEn}
                          </span>
                        </div>

                        {/* Status Badge & Chevron Group */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 tabular-nums whitespace-nowrap">
                            {activePerms.length} / {category.permissions.length}
                          </span>
                          <div className="transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                            <ChevronRight className={`text-slate-400 ${isRTL ? 'rotate-180' : ''}`} size={16} />
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4 space-y-3">
                              {filteredPerms.map((perm) => {
                                const isActive = selectedGroup.permissions.includes(perm.id);
                                return (
                                  <div key={perm.id} onClick={() => togglePermission(perm.id)} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-teal-500/5 border-teal-500/30' : 'bg-transparent border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
                                      <div className={`shrink-0 transition-colors ${isActive ? 'text-teal-500' : 'text-slate-300'}`}>
                                        {isActive ? <Unlock size={18} /> : <Lock size={18} />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                          {isRTL ? perm.labelAr : perm.labelEn}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5 opacity-80">
                                          {isRTL ? perm.descriptionAr : perm.descriptionEn}
                                        </p>
                                      </div>
                                      {isActive && <CheckCircle2 className="text-teal-500 shrink-0" size={14} />}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedPermissionInfo({
                                          label: isRTL ? perm.labelAr : perm.labelEn,
                                          description: isRTL ? perm.descriptionAr : perm.descriptionEn,
                                        });
                                      }}
                                      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:text-teal-500 dark:border-slate-700 dark:bg-[#111114]"
                                      aria-label={isRTL ? `شرح صلاحية ${perm.labelAr}` : `Explain ${perm.labelEn}`}
                                    >
                                      <Info size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center glass-card border-dashed">
            <AlertCircle size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500">اختر مجموعة أمان لتعديل صلاحياتها</p>
          </div>
        )}
      </div>
      </div>

      {/* Modern Add Group Modal */}
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
              className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Plus className="text-teal-500 w-8 h-8" />
                  إنشاء مجموعة جديدة
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Trash2 size={20} className="text-slate-400" /></button>
              </div>

              <div className="p-8 space-y-6 text-right" dir="rtl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block pr-1">اسم المجموعة</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="مثال: مدراء الدعم الفني"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-right"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block pr-1">نبذة عن المجموعة (اختياري)</label>
                  <textarea 
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="اكتب وصفاً مختصراً لمهام هذه المجموعة..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none text-right"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={handleConfirmCreateGroup}
                    disabled={!newGroupName.trim() || isSubmitting}
                    className="flex-1 py-5 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-teal-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    {isSubmitting ? <RefreshCw className="animate-spin" /> : <Plus size={24} />}
                    تأكيد الإنشاء
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-5 bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Edit2 className="text-teal-500 w-8 h-8" />
                  تعديل المجموعة
                </h3>
              </div>
              <div className="p-8 space-y-6 text-right" dir="rtl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block pr-1">اسم المجموعة</label>
                  <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-right" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block pr-1">النبذة/الوصف</label>
                  <textarea value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none text-right" />
                </div>
                <div className="flex gap-4 pt-2">
                  <button onClick={handleConfirmEditGroup} disabled={!editGroupName.trim() || isSubmitting} className="flex-1 py-5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-teal-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSubmitting ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                    حفظ التغييرات
                  </button>
                  <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-5 bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center" dir="rtl">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">هل أنت متأكد؟</h3>
              <p className="text-slate-500 mb-8 font-medium">سيتم حذف هذه المجموعة الأمنية نهائياً. لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleConfirmDeleteGroup} disabled={isSubmitting} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <RefreshCw className="animate-spin" /> : <Trash2 size={20} />}
                  نعم، احذف المجموعة
                </button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPermissionInfo && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPermissionInfo(null)} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-[#09090B]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-black text-teal-600 dark:text-teal-400">
                    <Info size={14} />
                    {isRTL ? 'شرح الصلاحية' : 'Permission Help'}
                  </div>
                  <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">{selectedPermissionInfo.label}</h3>
                </div>
                <button onClick={() => setSelectedPermissionInfo(null)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                {selectedPermissionInfo.description}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
