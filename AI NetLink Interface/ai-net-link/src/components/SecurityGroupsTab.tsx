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
    id: 'super',
    labelAr: 'صلاحيات شاملة',
    labelEn: 'Global Overrides',
    icon: Shield,
    permissions: [
      { id: 'all', labelAr: 'صلاحية شاملة كاملة', labelEn: 'Full Global Access', descriptionAr: 'تعطي هذه المجموعة كل الصلاحيات داخل النظام بالكامل. استخدمها فقط للحسابات العليا جداً.', descriptionEn: 'Grants this group full access across the entire system. Use only for top-level accounts.' },
    ]
  },
  {
    id: 'system',
    labelAr: 'النظام الأساسي',
    labelEn: 'System',
    icon: SettingsIcon,
    permissions: [
      { id: 'view_dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', descriptionAr: 'عرض الإحصائيات العامة للنظام', descriptionEn: 'View overall system statistics' },
      { id: 'access_executive', labelAr: 'المركز الإداري والرقابة', labelEn: 'Executive Center', descriptionAr: 'الدخول إلى واجهة الإدارة التنفيذية', descriptionEn: 'Access executive management interface' },
      { id: 'view_security', labelAr: 'الأمان والتنبيهات', labelEn: 'Security & Alerts', descriptionAr: 'عرض سجلات الأمان والتحذيرات', descriptionEn: 'View security logs and warnings' },
      { id: 'manage_security', labelAr: 'إدارة الأمان', labelEn: 'Manage Security', descriptionAr: 'تنفيذ إجراءات وضبط إعدادات الأمان والتنبيهات', descriptionEn: 'Perform actions and configure security settings and alerts' },
      { id: 'view_audit_logs', labelAr: 'سجلات التدقيق', labelEn: 'Audit Logs', descriptionAr: 'عرض سجلات التتبع والمراجعة والتاريخ', descriptionEn: 'View tracking, auditing, and history logs' },
      { id: 'access_files', labelAr: 'مدير الملفات', labelEn: 'File Manager', descriptionAr: 'الوصول إلى مستعرض الملفات الداخلي', descriptionEn: 'Access internal file explorer' },
      { id: 'access_chat', labelAr: 'المحادثة', labelEn: 'Chat', descriptionAr: 'الوصول إلى مركز المحادثة', descriptionEn: 'Access chat center' },
      { id: 'manage_portal', labelAr: 'بوابة المشتركين', labelEn: 'Subscriber Portal', descriptionAr: 'التحكم ببوابة المشتركين والواجهة الذاتية', descriptionEn: 'Control subscriber portal and self-service interface' },
      { id: 'manage_ai', labelAr: 'إدارة الذكاء الاصطناعي', labelEn: 'Manage AI', descriptionAr: 'التحكم بإعدادات وخصائص وحدات الذكاء الاصطناعي', descriptionEn: 'Control AI settings and assistant capabilities' },
      { id: 'perform_backup', labelAr: 'النسخ الاحتياطي والاستعادة', labelEn: 'Backup & Restore', descriptionAr: 'تشغيل النسخ الاحتياطي والاستعادة والتصدير', descriptionEn: 'Run backup, restore, and export operations' },
      { id: 'edit_settings', labelAr: 'إعدادات النظام', labelEn: 'System Settings', descriptionAr: 'تعديل الإعدادات العامة للمنظومة', descriptionEn: 'Modify general system settings' },
    ]
  },
  {
    id: 'financial',
    labelAr: 'المالية',
    labelEn: 'Financial',
    icon: CreditCard,
    permissions: [
      { id: 'view_financial', labelAr: 'عرض المركز المالي', labelEn: 'View Financial Center', descriptionAr: 'الوصول إلى لوحات وأرقام النظام المالي', descriptionEn: 'Access financial dashboards and system metrics' },
      { id: 'view_central_balance', labelAr: 'الرصيد المركزي', labelEn: 'Central Balance', descriptionAr: 'رؤية إجمالي سيولة النظام', descriptionEn: 'View total system liquidity' },
      { id: 'wallet_deposit', labelAr: 'إيداع مالي', labelEn: 'Wallet Deposit', descriptionAr: 'إضافة رصيد لمحفظة المدراء والوكلاء', descriptionEn: 'Add balance to manager/agent wallets' },
      { id: 'wallet_withdraw', labelAr: 'سحب مالي', labelEn: 'Wallet Withdraw', descriptionAr: 'خصم رصيد من محافظ المدراء والوكلاء', descriptionEn: 'Deduct balance from manager/agent wallets' },
      { id: 'manage_tx_limits', labelAr: 'قيود العمليات', labelEn: 'TX Limits', descriptionAr: 'تعديل سقف العمليات المالية للموظفين', descriptionEn: 'Modify employee financial transaction limits' },
      { id: 'view_billing', labelAr: 'الفواتير والمطالبات', labelEn: 'Billing', descriptionAr: 'عرض وإدارة فواتير النظام', descriptionEn: 'View and manage system invoices' },
      { id: 'manage_billing', labelAr: 'إدارة الفواتير', labelEn: 'Manage Billing', descriptionAr: 'إنشاء وتعديل وإدارة المطالبات والفواتير والتحصيل', descriptionEn: 'Create, edit, and manage invoices, collections, and billing actions' },
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
      { id: 'sub_add', labelAr: 'إضافة مشترك', labelEn: 'Add Subscriber', descriptionAr: 'إضافة مشترك جديد إلى النظام', descriptionEn: 'Add a new subscriber to the system' },
      { id: 'sub_activate', labelAr: 'تفعيل المشتركين', labelEn: 'Activate Subscribers', descriptionAr: 'صلاحية تفعيل وتجديد الاشتراكات', descriptionEn: 'Authority to activate/renew subscriptions' },
      { id: 'sub_edit', labelAr: 'تعديل بيانات المشترك', labelEn: 'Edit Subscriber Data', descriptionAr: 'تعديل بيانات المشترك الأساسية', descriptionEn: 'Modify core subscriber information' },
      { id: 'sub_edit_package', labelAr: 'تعديل الباقة والحزمة', labelEn: 'Edit Package & Plan', descriptionAr: 'تعديل الباقة وسرعة الخط والحزمة المرتبطة', descriptionEn: 'Modify the assigned package, plan, and speed profile' },
      { id: 'sub_delete', labelAr: 'حذف مشتركين', labelEn: 'Delete Subscribers', descriptionAr: 'حذف سجلات المشتركين من النظام', descriptionEn: 'Remove subscriber records from system' },
      { id: 'manage_subscribers', labelAr: 'إدارة المشتركين كاملة', labelEn: 'Full Subscriber Management', descriptionAr: 'صلاحية مجمعة تشمل الإضافة والتعديل والحذف والتفعيل للمشتركين', descriptionEn: 'Combined subscriber permission including add, edit, delete, and activation' },
      { id: 'manage_crm', labelAr: 'إدارة CRM', labelEn: 'Manage CRM', descriptionAr: 'صلاحية أوسع لإدارة وحدة المشتركين وبيانات العملاء', descriptionEn: 'Broader access to manage the CRM and subscriber/customer module' },
    ]
  },
  {
    id: 'investors',
    labelAr: 'المستثمرون والشركاء',
    labelEn: 'Investors & Partners',
    icon: UsersIcon,
    permissions: [
      { id: 'view_investors', labelAr: 'عرض المستثمرين', labelEn: 'View Investors', descriptionAr: 'عرض بيانات المستثمرين والشركاء', descriptionEn: 'View investor and partner records' },
      { id: 'manage_investors', labelAr: 'إدارة المستثمرين', labelEn: 'Manage Investors', descriptionAr: 'إضافة وتعديل وحذف المستثمرين', descriptionEn: 'Add, edit, and delete investor records' },
      { id: 'view_shareholders', labelAr: 'عرض المساهمين', labelEn: 'View Shareholders', descriptionAr: 'عرض سجل المساهمين والملكية', descriptionEn: 'View shareholder records and ownership data' },
      { id: 'manage_shareholders', labelAr: 'إدارة المساهمين', labelEn: 'Manage Shareholders', descriptionAr: 'إضافة وتعديل وحذف المساهمين', descriptionEn: 'Add, edit, and delete shareholder records' },
      { id: 'view_directors', labelAr: 'عرض المدراء التنفيذيين', labelEn: 'View Directors', descriptionAr: 'عرض بيانات المديرين في سجلات المستثمرين', descriptionEn: 'View directors within investor records' },
      { id: 'manage_directors', labelAr: 'إدارة المدراء التنفيذيين', labelEn: 'Manage Directors', descriptionAr: 'إدارة بيانات المديرين التنفيذيين', descriptionEn: 'Manage director records' },
      { id: 'view_deputies', labelAr: 'عرض النواب', labelEn: 'View Deputies', descriptionAr: 'عرض بيانات النواب أو الوكلاء المرتبطين', descriptionEn: 'View deputy-related records' },
      { id: 'manage_deputies', labelAr: 'إدارة النواب', labelEn: 'Manage Deputies', descriptionAr: 'إضافة وتعديل وحذف بيانات النواب', descriptionEn: 'Add, edit, and delete deputy records' },
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
      { id: 'view_boi', labelAr: 'عرض مركز الانتهاء', labelEn: 'View Expiry Center', descriptionAr: 'عرض المشتركين المنتهية اشتراكاتهم ومركز التحكم الذكي', descriptionEn: 'View expired subscribers and the smart expiry center' },
      { id: 'view_iptv', labelAr: 'عرض الخدمات الرقمية', labelEn: 'View Digital Services', descriptionAr: 'عرض بيانات خدمات IPTV والخدمات الرقمية', descriptionEn: 'View IPTV and digital service data' },
      { id: 'manage_iptv', labelAr: 'الخدمات الرقمية', labelEn: 'Digital Services', descriptionAr: 'إدارة خدمات IPTV/VPN والخدمات الرقمية', descriptionEn: 'Manage IPTV/VPN and digital services' },
      { id: 'iptv_manage', labelAr: 'إدارة IPTV التفصيلية', labelEn: 'Detailed IPTV Management', descriptionAr: 'صلاحية تفصيلية إضافية لإدارة باقات وخدمات IPTV', descriptionEn: 'Detailed permission for managing IPTV plans and services' },
      { id: 'manage_boi', labelAr: 'إدارة الانتهاء والاشتراكات', labelEn: 'Manage Expiry Center', descriptionAr: 'إدارة مركز انتهاء الاشتراكات والتجديد الذكي', descriptionEn: 'Manage expiry center and smart renewal operations' },
    ]
  },
  {
    id: 'admins',
    labelAr: 'الإدارة',
    labelEn: 'Management',
    icon: Shield,
    permissions: [
      { id: 'view_admins', labelAr: 'عرض الطاقم الإداري', labelEn: 'View Management Staff', descriptionAr: 'عرض قائمة المدراء والوكلاء والموظفين', descriptionEn: 'View list of managers, agents, and staff' },
      { id: 'manage_admins', labelAr: 'إدارة المدراء والوكلاء', labelEn: 'Manage Managers & Agents', descriptionAr: 'إضافة وتعديل وحذف بيانات المدراء والوكلاء', descriptionEn: 'Add, edit, and delete managers and agents' },
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
      { id: 'view_reports', labelAr: 'عرض التقارير والتحليلات', labelEn: 'View Reports & Analytics', descriptionAr: 'الوصول إلى لوحات التقارير والتحليلات فقط', descriptionEn: 'Access reports and analytics dashboards' },
      { id: 'manage_widgets', labelAr: 'إدارة الويدجت', labelEn: 'Manage Widgets', descriptionAr: 'تخصيص الواجهات والبطاقات والعناصر التحليلية', descriptionEn: 'Customize widgets, cards, and analytical components' },
    ]
  }
];

export default function SecurityGroupsTab({ state, setState }: SecurityGroupsTabProps) {
  const isRTL = state.lang === 'ar';
  const SECURITY_GROUPS_KEY = 'sas4_security_groups';
  
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = () => {
    setIsSubmitting(true);
    window.setTimeout(() => {
      localStorage.setItem(SECURITY_GROUPS_KEY, JSON.stringify(state.securityGroups));
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
    }, 300);
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

  const filteredCategoryEntries = PERMISSION_CATEGORIES.map((category) => {
    const filteredPerms = category.permissions.filter((perm) =>
      (isRTL ? perm.labelAr : perm.labelEn).includes(searchQuery) ||
      (isRTL ? perm.descriptionAr : perm.descriptionEn).includes(searchQuery)
    );

    return {
      category,
      filteredPerms,
      activePerms: selectedGroup ? filteredPerms.filter((perm) => selectedGroup.permissions.includes(perm.id)) : [],
    };
  }).filter((entry) => entry.filteredPerms.length > 0);

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8">
        <div className="flex flex-col gap-5 border-b border-slate-200/70 pb-6 dark:border-slate-800/70">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-xs font-black text-teal-600 dark:text-teal-400">
                <Shield size={14} />
                {isRTL ? 'نظام الصلاحيات الأمنية' : 'Security Permission System'}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                {isRTL ? 'إدارة المجموعات الأمنية' : 'Security Groups Management'}
              </h1>
              <p className="max-w-4xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                {isRTL
                  ? 'صفحة مفتوحة لتصميم الصلاحيات بالتفصيل: اختر المجموعة من الأعلى ثم فعّل أو امنع كل بند بدقة، بدون حصر داخل صناديق ضيقة.'
                  : 'An open permission-design workspace: choose a group from the top, then allow or deny every capability precisely without cramped boxed layouts.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 px-6 py-4 text-sm font-black text-white transition-all hover:from-teal-600 hover:to-blue-700"
              >
                <Plus size={18} />
                {isRTL ? 'إنشاء مجموعة جديدة' : 'Create New Group'}
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={!hasUnsavedChanges || isSubmitting}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-6 py-4 text-sm font-black text-teal-600 transition-all hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-500/20 dark:bg-[#101014] dark:text-teal-400 dark:hover:bg-teal-500/10"
              >
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {isRTL ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 text-start shadow-sm shadow-slate-200/50 dark:border-slate-800/70 dark:bg-[#101014] dark:shadow-black/10">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
                  <Database size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-400">{isRTL ? 'مجموعات' : 'GROUPS'}</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{isRTL ? 'عدد المجموعات' : 'Groups Count'}</p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{state.securityGroups.length}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 text-start shadow-sm shadow-slate-200/50 dark:border-slate-800/70 dark:bg-[#101014] dark:shadow-black/10">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-400">
                  <UsersIcon size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-400">{isRTL ? 'أعضاء' : 'MEMBERS'}</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{isRTL ? 'إجمالي الأعضاء' : 'Total Members'}</p>
              <p className="mt-2 text-3xl font-black text-teal-600 dark:text-teal-400">{totalMembers}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 text-start shadow-sm shadow-slate-200/50 dark:border-slate-800/70 dark:bg-[#101014] dark:shadow-black/10">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                  <Shield size={18} />
                </div>
                <span className="text-[10px] font-black text-slate-400">{isRTL ? 'صلاحيات' : 'PERMS'}</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{isRTL ? 'صلاحيات المجموعة المختارة' : 'Selected Group Permissions'}</p>
              <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{selectedPermCount}</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{isRTL ? 'المجموعات المتاحة' : 'Available Groups'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isRTL ? 'اضغط على أي مجموعة لفتح صلاحياتها كاملة.' : 'Click any group to open its full permission matrix.'}
              </p>
            </div>
            <div className="relative w-full xl:max-w-md">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
              <input
                type="text"
                placeholder={isRTL ? 'ابحث عن صلاحية أو وصف...' : 'Search permissions or descriptions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-800 dark:bg-[#101014] dark:text-white ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {state.securityGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`group min-w-[240px] rounded-[1.75rem] border px-5 py-4 text-start transition-all ${
                    isSelected
                      ? 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10'
                      : 'border-slate-200 bg-white shadow-sm shadow-slate-200/40 hover:border-slate-300 dark:border-slate-800 dark:bg-[#101014] dark:shadow-black/10 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className={`mb-3 inline-flex rounded-2xl p-3 ${isSelected ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                        <Shield size={16} />
                      </div>
                      <div className="truncate text-sm font-black text-slate-900 dark:text-white">{cleanName(group.name)}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{group.description}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {group.memberCount} {isRTL ? 'عضو' : 'Member'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {selectedGroup ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 dark:border-slate-800/70 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-teal-500">
                  <Shield size={14} />
                  {isRTL ? 'المجموعة المختارة' : 'Selected Group'}
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{cleanName(selectedGroup.name)}</h2>
                <p className="max-w-4xl text-sm leading-7 text-slate-500 dark:text-slate-400">{selectedGroup.description}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setEditGroupName(selectedGroup.name);
                    setEditGroupDescription(selectedGroup.description);
                    setIsEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition-all hover:border-teal-300 hover:text-teal-600 dark:border-slate-800 dark:text-slate-200 dark:hover:border-teal-500/30 dark:hover:text-teal-400"
                >
                  <Edit2 size={16} />
                  {isRTL ? 'تعديل المجموعة' : 'Edit Group'}
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-600 transition-all hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={16} />
                  {isRTL ? 'حذف المجموعة' : 'Delete Group'}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {filteredCategoryEntries.map(({ category, filteredPerms, activePerms }) => {
                const isExpanded = expandedCategories.includes(category.id);

                return (
                  <section key={category.id} className="rounded-[1.9rem] border border-slate-200/70 bg-white/70 p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800/70 dark:bg-white/[0.02] dark:shadow-black/10">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="flex w-full items-center justify-between gap-4 py-2 text-start"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-500">
                          <category.icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">{isRTL ? category.labelAr : category.labelEn}</h3>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {isRTL ? `${activePerms.length} مفعلة من أصل ${category.permissions.length}` : `${activePerms.length} enabled out of ${category.permissions.length}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {activePerms.length}/{category.permissions.length}
                        </span>
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className={`${isRTL ? 'rotate-180' : ''} text-slate-400`} size={18} />
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-800/70">
                            {filteredPerms.map((perm) => {
                              const isActive = selectedGroup.permissions.includes(perm.id);
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => togglePermission(perm.id)}
                                  className={`grid cursor-pointer grid-cols-1 gap-4 py-4 transition-colors md:grid-cols-[1fr_auto] ${isActive ? 'bg-teal-500/5' : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/20'}`}
                                >
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div className={`mt-1 shrink-0 ${isActive ? 'text-teal-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                      {isActive ? <Unlock size={18} /> : <Lock size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`flex items-center gap-2 text-sm font-black ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                        <span>{isRTL ? perm.labelAr : perm.labelEn}</span>
                                        <Info size={14} className="text-slate-400" />
                                      </div>
                                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                                        {isRTL ? perm.descriptionAr : perm.descriptionEn}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-start md:justify-end">
                                    <span className={`inline-flex min-w-[110px] items-center justify-center rounded-full px-4 py-2 text-xs font-black ${
                                      isActive
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                      {isActive ? (isRTL ? 'مسموح' : 'Allowed') : (isRTL ? 'ممنوع' : 'Blocked')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
            <AlertCircle size={42} className="text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-lg font-black text-slate-700 dark:text-slate-200">
              {isRTL ? 'اختر مجموعة من الأعلى لتبدأ توزيع الصلاحيات' : 'Choose a group from above to start assigning permissions'}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isRTL ? 'لن نحبس الصفحة داخل صندوق ضيق. كل شيء هنا مفتوح وواضح بعرض الصفحة.' : 'This page stays open and wide instead of trapping everything in a cramped box.'}
            </p>
          </div>
        )}
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

    </div>
  );
}
