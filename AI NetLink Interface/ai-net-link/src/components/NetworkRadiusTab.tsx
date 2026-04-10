import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Server, Activity, RefreshCw, Layers, Shield, Settings, Plus, Trash2, CheckCircle2, XCircle, Save, AlertCircle, Edit2, Search, X, HelpCircle, Send, Zap, Globe } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import { getNetworkConfig, saveNetworkConfig, testMikrotikConnection, fetchProfiles, addProfile, updateProfile, deleteProfile, pushProfile } from '../api';
import { toastError, toastSuccess } from '../utils/notify';
import AppModal from './AppModal';
import AppConfirmDialog from './AppConfirmDialog';

interface NetworkRadiusTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="relative group inline-block ml-1 rtl:mr-1 rtl:ml-0 align-middle">
        <HelpCircle size={14} className="text-slate-400 hover:text-indigo-500 cursor-help" />
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-xl hidden group-hover:block transition-all pointer-events-none text-center leading-relaxed">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export default function NetworkRadiusTab({ state, setState }: NetworkRadiusTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  
  const [activeSubTab, setActiveSubTab] = useState<'routers' | 'sync' | 'profiles'>('routers');
  const [networkConfig, setNetworkConfig] = useState<any>({ routers: [], defaultExpiredProfile: '', landingPageUrl: '' });
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [backgroundStatus, setBackgroundStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Profiles State
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>(null);
  const [isPushingProfile, setIsPushingProfile] = useState<Record<string, boolean>>({});
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedProfileToPush, setSelectedProfileToPush] = useState<string | null>(null);
  const [pushTarget, setPushTarget] = useState('all'); 
  const [routersList, setRoutersList] = useState<any[]>([]);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
      const data = await fetchProfiles();
      setProfilesList(data || []);
  };

  const handleCreateProfile = () => {
      setProfileForm({
          name: '',
          mikrotikName: '',
          price: 0,
          type: 'pppoe',
          validityUnit: 'days',
          validityValue: 30,
          downloadSpeed: '',
          uploadSpeed: '',
          burstEnabled: false,
          burstRate: '',
          burstThreshold: '',
          burstTime: '',
          queuePriority: 8,
          poolName: '',
          addressList: '', 
          sharedUsers: 1,
          expiredProfileId: '',
          billingCycleDay: null,
          
          limitByDuration: { enabled: true, value: 1, unit: 'months' },
          limitByTime: { enabled: false, value: 0, unit: 'minutes' },
          limitByDownload: { enabled: false, value: 0 },
          limitByUpload: { enabled: false, value: 0 },
          limitByTotalTraffic: { enabled: false, value: 0 },
          
          isAvailableInPanel: true,
          cancelOnExpiration: true,
          privacy: 'public',
          location: 'Any',
          fixedExpirationTimeEnabled: false,
          fixedExpirationTime: '00:00'
      });
      setIsEditingProfile(true);
  };

  const handleEditProfile = (profile: any) => {
      setProfileForm({ 
          ...profile,
          limitByDuration: profile.limitByDuration || { enabled: true, value: 1, unit: 'months' },
          limitByTime: profile.limitByTime || { enabled: false, value: 0, unit: 'minutes' },
          limitByDownload: profile.limitByDownload || { enabled: false, value: 0 },
          limitByUpload: profile.limitByUpload || { enabled: false, value: 0 },
          limitByTotalTraffic: profile.limitByTotalTraffic || { enabled: false, value: 0 },
          expiredProfileId: profile.expiredProfileId || '',
          billingCycleDay: typeof profile.billingCycleDay === 'number' ? profile.billingCycleDay : null
      });
      setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
      try {
          if (profileForm.id) {
              await updateProfile(profileForm.id, profileForm);
          } else {
              await addProfile(profileForm);
          }
          await loadProfiles();
          setIsEditingProfile(false);
          setProfileForm(null);
          toastSuccess(isRTL ? 'تم حفظ البروفايل بنجاح.' : 'The profile was saved successfully.', isRTL ? 'تم الحفظ' : 'Profile Saved');
      } catch (e) {
          toastError(isRTL ? 'فشل حفظ البروفايل.' : 'Failed to save profile.', isRTL ? 'تعذر الحفظ' : 'Save Failed');
      }
  };

  const handleDeleteProfile = async () => {
      if (!profileToDelete) return;
      try {
          await deleteProfile(profileToDelete);
          await loadProfiles();
          toastSuccess(isRTL ? 'تم حذف البروفايل بنجاح.' : 'The profile was deleted successfully.', isRTL ? 'تم الحذف' : 'Profile Deleted');
      } catch (e) {
          toastError(isRTL ? 'فشل حذف البروفايل.' : 'Failed to delete profile.', isRTL ? 'تعذر الحذف' : 'Delete Failed');
      } finally {
          setProfileToDelete(null);
      }
  };

  const handlePushProfile = async () => {
      if (!selectedProfileToPush) return;
      setIsPushingProfile(prev => ({ ...prev, [selectedProfileToPush]: true }));
      setShowPushModal(false);
      try {
          const res = await pushProfile(selectedProfileToPush, pushTarget);
          toastSuccess(
            isRTL ? `تم إرسال البروفايل بنجاح. ${res.message}` : `Profile pushed successfully. ${res.message}`,
            isRTL ? 'اكتملت المزامنة' : 'Push Completed',
            4500
          );
      } catch (e: any) {
          toastError((isRTL ? 'فشل الإرسال: ' : 'Push failed: ') + e.message, isRTL ? 'تعذر الإرسال' : 'Push Failed');
      } finally {
          setIsPushingProfile(prev => ({ ...prev, [selectedProfileToPush]: false }));
          setSelectedProfileToPush(null);
          setPushTarget('all');
      }
  };

  const openPushModal = (profileId: string) => {
      setSelectedProfileToPush(profileId);
      setShowPushModal(true);
  };

  const loadConfig = async () => {
    const config = await getNetworkConfig();
    if (config) {
        if (!config.routers) config.routers = [];
        setNetworkConfig(config);
        setRoutersList(config.routers);
        config.routers.forEach((router: any) => checkRouterStatus(router));
    }
  };

  const checkRouterStatus = async (router: any) => {
      setBackgroundStatus(prev => ({ ...prev, [router.id]: 'checking' }));
      try {
          await testMikrotikConnection(router.host, router.user, router.password, router.port);
          setBackgroundStatus(prev => ({ ...prev, [router.id]: 'online' }));
      } catch (e) {
          setBackgroundStatus(prev => ({ ...prev, [router.id]: 'offline' }));
      }
  };

  const handleExplicitSave = async () => {
    setIsSaving(true);
    try {
        await saveNetworkConfig(networkConfig);
        toastSuccess(isRTL ? 'تم حفظ إعدادات الشبكة والراديوس بنجاح.' : 'Network and RADIUS settings were saved successfully.', isRTL ? 'تم الحفظ' : 'Settings Saved');
    } catch (e) {
        toastError(isRTL ? 'فشل حفظ التعديلات.' : 'Failed to save changes.', isRTL ? 'تعذر الحفظ' : 'Save Failed');
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddRouter = () => {
    const newRouters = [...(networkConfig.routers || []), {
      id: Date.now().toString(),
      name: `Router ${networkConfig.routers?.length + 1 || 1}`,
      host: '',
      user: '',
      password: '',
      port: 8728
    }];
    setNetworkConfig({ ...networkConfig, routers: newRouters });
  };

  const handleDeleteRouter = (id: string) => {
    const newRouters = networkConfig.routers.filter((r: any) => r.id !== id);
    setNetworkConfig({ ...networkConfig, routers: newRouters });
  };

  const updateRouter = (id: string, field: string, value: any) => {
    const newRouters = networkConfig.routers.map((r: any) => 
      r.id === id ? { ...r, [field]: value } : r
    );
    setNetworkConfig({ ...networkConfig, routers: newRouters });
  };

  const handleTestRouter = async (router: any) => {
    setIsTesting(prev => ({ ...prev, [router.id]: true }));
    try {
        const res = await testMikrotikConnection(router.host, router.user, router.password, router.port);
        setTestResults(prev => ({ 
            ...prev, 
            [router.id]: { success: true, message: res.data?.message || 'Success', identity: res.data?.identity } 
        }));
    } catch (err: any) {
        setTestResults(prev => ({ 
            ...prev, 
            [router.id]: { success: false, message: err.message || 'Failed' } 
        }));
    } finally {
        setIsTesting(prev => ({ ...prev, [router.id]: false }));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col pt-6 md:pt-0">
      <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
        {[
          { id: 'routers', label: isRTL ? 'أجهزة الميكروتيك' : 'MikroTik Routers', icon: Server },
          { id: 'profiles', label: isRTL ? 'بروفايلات الشبكة' : 'Network Profiles', icon: Layers },
          { id: 'sync', label: isRTL ? 'مزامنة البيانات' : 'Data Sync', icon: RefreshCw },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${
              activeSubTab === tab.id 
              ? 'text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {activeSubTab === tab.id && (
              <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSubTab === 'routers' && (
            <div className="p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isRTL ? 'إدارة أجهزة المايكروتيك' : 'MikroTik Management'}</h3>
                        <p className="text-sm text-slate-500 mt-1">{isRTL ? 'أضف وتحقق من اتصال سيرفرات المايكروتيك الخاصة بك' : 'Add and verify your MikroTik server connections'}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAddRouter} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all">
                            <Plus size={18} /> {isRTL ? 'إضافة راوتر' : 'Add Router'}
                        </button>
                        <button onClick={handleExplicitSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Global Configuration Section */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8">
                    <h4 className="text-sm font-bold text-indigo-600 flex items-center gap-2 uppercase tracking-wider mb-6">
                        <Settings size={18} />
                        {isRTL ? 'الإعدادات العامة للشبكة' : 'Global Network Settings'}
                        <InfoTooltip text={isRTL ? 'إعدادات عامة تطبق على كافة المشتركين والبروفايلات في النظام' : 'General settings that apply to all subscribers and profiles in the system'} />
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 flex items-center mb-1">
                                {isRTL ? 'بروفايل انتهاء الخدمة الافتراضي' : 'Default Expired Profile'}
                                <InfoTooltip text={isRTL ? 'اسم البروفايل الذي سيتم نقل أي مشترك إليه عند انتهاء اشتراكه (إذا لم يتم تحديد بروفايل مخصص له)' : 'The profile name to move subscribers to when their subscription ends (if no specific profile is set)'} />
                            </label>
                            <input 
                                type="text" 
                                value={networkConfig.defaultExpiredProfile || ''} 
                                onChange={(e) => setNetworkConfig({ ...networkConfig, defaultExpiredProfile: e.target.value })} 
                                placeholder="Expired_LowSpeed"
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-mono" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 flex items-center mb-1">
                                {isRTL ? 'رابط صفحة الهبوط (Landing Page)' : 'Landing Page URL'}
                                <InfoTooltip text={isRTL ? 'الرابط الذي سيتم توجيه المشتركين المنتهية صلاحيتهم إليه (اختياري)' : 'The URL expired subscribers will be redirected to (Optional)'} />
                            </label>
                            <input 
                                type="text" 
                                value={networkConfig.landingPageUrl || ''} 
                                onChange={(e) => setNetworkConfig({ ...networkConfig, landingPageUrl: e.target.value })} 
                                placeholder="http://10.0.0.1/renew"
                                className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-mono" 
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {networkConfig.routers.map((router: any) => (
                        <div key={router.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${backgroundStatus[router.id] === 'online' ? 'bg-emerald-100 text-emerald-600' : backgroundStatus[router.id] === 'offline' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Server size={24} />
                                    </div>
                                    <div>
                                        <input type="text" value={router.name} onChange={(e) => updateRouter(router.id, 'name', e.target.value)} className="bg-transparent border-none text-lg font-bold text-slate-800 dark:text-slate-100 focus:ring-0 p-0" />
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${backgroundStatus[router.id] === 'online' ? 'bg-emerald-500' : backgroundStatus[router.id] === 'offline' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                                            <span className="text-xs font-bold text-slate-500 capitalize">{backgroundStatus[router.id] || 'unknown'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleTestRouter(router)} disabled={isTesting[router.id]} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all">
                                        {isTesting[router.id] ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                                    </button>
                                    <button onClick={() => handleDeleteRouter(router.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'عنوان IP' : 'Host'}</label>
                                        <input type="text" value={router.host} onChange={(e) => updateRouter(router.id, 'host', e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'المنفذ' : 'Port'}</label>
                                        <input type="number" lang="en" value={router.port} onChange={(e) => updateRouter(router.id, 'port', parseInt(e.target.value))} className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-mono" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'المستخدم' : 'Username'}</label>
                                        <input type="text" value={router.user} onChange={(e) => updateRouter(router.id, 'user', e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                        <input type="password" value={router.password} onChange={(e) => updateRouter(router.id, 'password', e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {activeSubTab === 'profiles' && (
            <div className="flex-1 overflow-hidden flex flex-col">
                {isEditingProfile ? (
                    <div className="p-6 overflow-y-auto w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                               <Layers className="text-amber-500" />
                               {profileForm?.id ? (isRTL ? 'تعديل بروفايل' : 'Edit Profile') : (isRTL ? 'إنشاء بروفايل جديد' : 'New Profile')}
                            </h3>
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                <button onClick={handleSaveProfile} className="px-6 py-2 bg-teal-500 text-white rounded-xl font-bold flex items-center gap-2"><Save size={18}/> {isRTL ? 'حفظ' : 'Save'}</button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl pb-12">
                            {/* General Section */}
                            <div className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-1.5 rounded-lg inline-block uppercase">{isRTL ? 'بيانات أساسية' : 'General Info'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="col-span-2">
                                         <label className="text-xs font-bold text-slate-500">
                                             {isRTL ? 'اسم الخدمة' : 'Service Name'}
                                             <InfoTooltip text={isRTL ? 'الاسم الذي سيظهر للموظفين وعند اختيار البروفايل' : 'The name displayed to staff when selecting a profile'} />
                                         </label>
                                         <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2" />
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-indigo-500">
                                             {isRTL ? 'اسم الميكروتيك' : 'MikroTik Name'}
                                             <InfoTooltip text={isRTL ? 'الاسم الفعلي للبروفايل داخل جهاز الميكروتيك (يجب ألا يحتوي على مسافات)' : 'The actual profile name inside MikroTik (avoid spaces)'} />
                                         </label>
                                         <input type="text" value={profileForm.mikrotikName} onChange={(e) => setProfileForm({...profileForm, mikrotikName: e.target.value})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-indigo-200 dark:border-indigo-900/50 rounded-xl px-4 py-2 font-mono" />
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-slate-500">
                                             {isRTL ? 'السعر (ILS)' : 'Price'}
                                             <InfoTooltip text={isRTL ? 'سعر البروفايل بالعملة المحلية للخصم من رصيد الموزع/المشترك' : 'Profile price in local currency'} />
                                         </label>
                                         <input type="number" value={profileForm.price} onChange={(e) => setProfileForm({...profileForm, price: parseFloat(e.target.value)})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2" />
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-slate-500">
                                             {isRTL ? 'النوع' : 'Type'}
                                             <InfoTooltip text={isRTL ? 'تحديد إذا كان هذا البروفايل مخصص لخدمات PPPoE أو Hotspot أو كليهما' : 'Select whether this profile is for PPPoE, Hotspot, or both'} />
                                         </label>
                                         <select value={profileForm.type} onChange={(e) => setProfileForm({...profileForm, type: e.target.value})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
                                             <option value="pppoe">PPPoE</option>
                                             <option value="hotspot">Hotspot</option>
                                             <option value="both">{isRTL ? 'كلاهما' : 'Both'}</option>
                                         </select>
                                     </div>
                                     <div className="flex items-center gap-3 mt-4 col-span-2">
                                         <button onClick={() => setProfileForm({...profileForm, isAvailableInPanel: !profileForm.isAvailableInPanel})} className={`w-12 h-6 rounded-full relative transition-all ${profileForm.isAvailableInPanel ? 'bg-teal-500' : 'bg-slate-300'}`}>
                                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profileForm.isAvailableInPanel ? 'right-7' : 'right-1'}`} />
                                         </button>
                                         <span className="text-sm font-bold">
                                             {isRTL ? 'متوفر في لوحة المشتركين' : 'Available in Panel'}
                                             <InfoTooltip text={isRTL ? 'عند تفعيل الخيار، سيظهر هذا البروفايل للمشتركين ليتمكنوا من شرائه عبر لوحة التحكم الخاصة بهم' : 'When enabled, this profile shows up for subscribers in their user panel'} />
                                         </span>
                                     </div>
                                </div>
                            </div>

                            {/* Speed Section */}
                            <div className="space-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg inline-block uppercase">{isRTL ? 'تحديد السرعة' : 'Traffic Shaping'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">
                                            Download (rx)
                                            <InfoTooltip text={isRTL ? 'سرعة التحميل القصوى (مثال: 10M أو 20M)' : 'Maximum download speed (e.g., 10M or 20M)'} />
                                        </label>
                                        <input type="text" placeholder="10M" value={profileForm.downloadSpeed} onChange={(e) => setProfileForm({...profileForm, downloadSpeed: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono font-bold text-blue-600" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">
                                            Upload (tx)
                                            <InfoTooltip text={isRTL ? 'سرعة الرفع القصوى (مثال: 5M أو 10M)' : 'Maximum upload speed (e.g., 5M or 10M)'} />
                                        </label>
                                        <input type="text" placeholder="10M" value={profileForm.uploadSpeed} onChange={(e) => setProfileForm({...profileForm, uploadSpeed: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono font-bold text-blue-600" />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-dashed border-blue-200 dark:border-blue-800">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                {isRTL ? 'إعدادات Burst' : 'Burst Settings'}
                                                <InfoTooltip text={isRTL ? 'تسمح للمشترك بالحصول على سرعة مضاعفة في بداية الاتصال لزمن معين' : 'Allows subscribers to get high burst speeds at the start of a connection for a specific duration'} />
                                            </span>
                                            <button onClick={() => setProfileForm({...profileForm, burstEnabled: !profileForm.burstEnabled})} className={`w-10 h-5 rounded-full relative transition-all ${profileForm.burstEnabled ? 'bg-blue-500' : 'bg-slate-400'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${profileForm.burstEnabled ? 'right-5.5' : 'right-0.5'}`} />
                                            </button>
                                        </div>
                                        {profileForm.burstEnabled && (
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="relative">
                                                     <input type="text" placeholder="Rate" value={profileForm.burstRate} onChange={(e) => setProfileForm({...profileForm, burstRate: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono" />
                                                     <InfoTooltip text={isRTL ? 'السرعة العالية التي سيصل لها المشترك مؤقتاً' : 'The high speed subscriber reaches temporarily during burst'} />
                                                </div>
                                                <div className="relative">
                                                     <input type="text" placeholder="Thr" value={profileForm.burstThreshold} onChange={(e) => setProfileForm({...profileForm, burstThreshold: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono" />
                                                     <InfoTooltip text={isRTL ? 'الحد الذي إذا نزل عنه الاستهلاك يبدأ الـ Burst' : 'The average speed below which burst is activated'} />
                                                </div>
                                                <div className="relative">
                                                     <input type="text" placeholder="Time" value={profileForm.burstTime} onChange={(e) => setProfileForm({...profileForm, burstTime: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono" />
                                                     <InfoTooltip text={isRTL ? 'مدة حساب المتوسط للـ Burst بالثواني' : 'The interval in seconds to calculate average speed for burst'} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SAS4 Limiters */}
                            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner space-y-8">
                                <h4 className="text-md font-black text-indigo-600 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/50 pb-4"><Zap size={20}/> {isRTL ? 'محددات الخدمة والكوتا (SAS4)' : 'SAS4 Service Limiters'}</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Duration */}
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-bold text-sm flex items-center gap-2 text-amber-600">
                                                <Activity size={18}/> 
                                                {isRTL ? 'محدد بمدة' : 'Limited by Duration'}
                                                <InfoTooltip text={isRTL ? 'يحدد الصلاحية الزمنية للبروفايل منذ لحظة التفعيل (مثال: 30 يوم)' : 'Defines the validity period of the profile from activation (e.g., 30 days)'} />
                                            </span>
                                            <button onClick={() => setProfileForm({...profileForm, limitByDuration: {...profileForm.limitByDuration, enabled: !profileForm.limitByDuration.enabled}})} className={`w-10 h-5 rounded-full relative transition-all ${profileForm.limitByDuration.enabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${profileForm.limitByDuration.enabled ? 'right-5.5' : 'right-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className={`flex gap-2 ${!profileForm.limitByDuration.enabled && 'opacity-30 pointer-events-none'}`}>
                                            <input type="number" value={profileForm.limitByDuration.value} onChange={(e) => setProfileForm({...profileForm, limitByDuration: {...profileForm.limitByDuration, value: parseInt(e.target.value)}})} className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3 py-2 text-center font-bold" />
                                            <select value={profileForm.limitByDuration.unit} onChange={(e) => setProfileForm({...profileForm, limitByDuration: {...profileForm.limitByDuration, unit: e.target.value}})} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3 py-2 font-bold">
                                                <option value="months">{isRTL ? 'شهر' : 'Month'}</option>
                                                <option value="days">{isRTL ? 'يوم' : 'Day'}</option>
                                                <option value="hours">{isRTL ? 'ساعة' : 'Hour'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Connection Time */}
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-bold text-sm flex items-center gap-2 text-indigo-600">
                                                <RefreshCw size={18}/> 
                                                {isRTL ? 'محدد بوقت' : 'Limited by Time'}
                                                <InfoTooltip text={isRTL ? 'إجمالي الدقائق المسموح للمشترك استهلاكها كبقاء متصل فعلياً' : 'Total active connection time allowed for the subscriber'} />
                                            </span>
                                            <button onClick={() => setProfileForm({...profileForm, limitByTime: {...profileForm.limitByTime, enabled: !profileForm.limitByTime.enabled}})} className={`w-10 h-5 rounded-full relative transition-all ${profileForm.limitByTime.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${profileForm.limitByTime.enabled ? 'right-5.5' : 'right-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className={`flex gap-2 ${!profileForm.limitByTime.enabled && 'opacity-30 pointer-events-none'}`}>
                                            <input type="number" value={profileForm.limitByTime.value} onChange={(e) => setProfileForm({...profileForm, limitByTime: {...profileForm.limitByTime, value: parseInt(e.target.value)}})} className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3 py-2 text-center font-bold" />
                                            <select value={profileForm.limitByTime.unit} onChange={(e) => setProfileForm({...profileForm, limitByTime: {...profileForm.limitByTime, unit: e.target.value}})} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3 py-2 font-bold">
                                                <option value="minutes">{isRTL ? 'دقيقة' : 'Minute'}</option>
                                                <option value="hours">{isRTL ? 'ساعة' : 'Hour'}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Data Limits Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { key: 'limitByDownload', label: isRTL ? 'التحميل (MB)' : 'Download (MB)', color: 'bg-emerald-500', hint: isRTL ? 'إجمالي حجم البيانات المسموح بتحميلها خلال فترة التفعيل' : 'Total data the user can download during activation' },
                                        { key: 'limitByUpload', label: isRTL ? 'الرفع (MB)' : 'Upload (MB)', color: 'bg-blue-500', hint: isRTL ? 'إجمالي حجم البيانات المسموح برفعها خلال فترة التفعيل' : 'Total data the user can upload during activation' },
                                        { key: 'limitByTotalTraffic', label: isRTL ? 'الترافيك (MB)' : 'Total (MB)', color: 'bg-rose-500', hint: isRTL ? 'إجمالي حركة البيانات الكلية (تحميل + رفع)' : 'Total combined traffic (upload + download)' }
                                    ].map(limit => (
                                        <div key={limit.key} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black uppercase text-slate-500">
                                                    {limit.label}
                                                    <InfoTooltip text={limit.hint} />
                                                </span>
                                                <button onClick={() => setProfileForm({...profileForm, [limit.key]: {...profileForm[limit.key], enabled: !profileForm[limit.key].enabled}})} className={`w-8 h-4 rounded-full relative transition-all ${profileForm[limit.key].enabled ? limit.color : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${profileForm[limit.key].enabled ? 'right-4.5' : 'right-0.5'}`} />
                                                </button>
                                            </div>
                                            <input type="number" value={profileForm[limit.key].value} disabled={!profileForm[limit.key].enabled} onChange={(e) => setProfileForm({...profileForm, [limit.key]: {...profileForm[limit.key], value: parseInt(e.target.value)}})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-lg px-2 py-2 text-center font-bold disabled:opacity-20" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Advanced Characteristics */}
                            <div className="space-y-6 md:col-span-2 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h4 className="text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg inline-block uppercase">{isRTL ? 'إعدادات متقدمة' : 'Advanced Characteristics'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'إلغاء عند الانتهاء' : 'Cancel Expiry'}
                                            <InfoTooltip text={isRTL ? 'عند تعطيل هذا الخيار، سيتم نقل المشترك لبروفايل "السرعة المنخفضة" بدل فصله نهائياً' : 'If disabled, the user is moved to a "Slow Speed" profile instead of being cut off'} />
                                        </label>
                                        <button onClick={() => setProfileForm({...profileForm, cancelOnExpiration: !profileForm.cancelOnExpiration})} className={`w-full py-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${profileForm.cancelOnExpiration ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            <CheckCircle2 size={16}/> {profileForm.cancelOnExpiration ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'ساعة انتهاء' : 'Fixed Expiry'}
                                            <InfoTooltip text={isRTL ? 'تحديد ساعة معينة تنتهي فيها اشتراكات هذا البروفايل دائماً (مثلاً منتصف الليل)' : 'Set a specific hour of the day when subscriptions of this profile always expire'} />
                                        </label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setProfileForm({...profileForm, fixedExpirationTimeEnabled: !profileForm.fixedExpirationTimeEnabled})} className={`p-2 rounded-xl border ${profileForm.fixedExpirationTimeEnabled ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200'}`}><Settings size={18}/></button>
                                            <input type="time" disabled={!profileForm.fixedExpirationTimeEnabled} value={profileForm.fixedExpirationTime} onChange={(e) => setProfileForm({...profileForm, fixedExpirationTime: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 text-sm font-bold disabled:opacity-30" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'بداية الشهر لهذه الباقة' : 'Billing Cycle Day'}
                                            <InfoTooltip text={isRTL ? 'حدد اليوم الذي تعتبره بداية الشهر لهذه الباقة. مثال: 1 أو 5 أو 15 أو 20. إذا تُرك فارغاً فسيعتمد النظام المدة العادية من تاريخ التفعيل.' : 'Set the day that should be treated as the month start for this package. Example: 1, 5, 15, or 20. Leave empty to use the normal duration from activation date.'} />
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                max={28}
                                                value={profileForm.billingCycleDay ?? ''}
                                                onChange={(e) => setProfileForm({...profileForm, billingCycleDay: e.target.value ? Math.max(1, Math.min(28, parseInt(e.target.value, 10) || 1)) : null})}
                                                placeholder={isRTL ? 'اختياري' : 'Optional'}
                                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setProfileForm({...profileForm, billingCycleDay: null})}
                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-500 hover:bg-slate-100"
                                            >
                                                {isRTL ? 'إلغاء' : 'Clear'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'الخصوصية' : 'Privacy'}
                                            <InfoTooltip text={isRTL ? 'خاص: لا يمكن للمشتركين رؤية البروفايل في لوحة التحكم إلا إذا كان مضافاً لهم مسبقاً' : 'Private: Hidden from general view, only visible to assigned users'} />
                                        </label>
                                        <select value={profileForm.privacy} onChange={(e) => setProfileForm({...profileForm, privacy: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold">
                                            <option value="public">PUBLIC</option>
                                            <option value="private">PRIVATE</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'عنوان IP البوابة (Local IP)' : 'Local Gateway IP'}
                                            <InfoTooltip text={isRTL ? 'عنوان الـ IP الذي سيعطى للراوتر كبوابة افتراضية للمشترك' : 'The IP address that will be assigned as the gateway for the subscriber'} />
                                        </label>
                                        <input type="text" value={profileForm.addressList} onChange={(e) => setProfileForm({...profileForm, addressList: e.target.value})} placeholder="e.g. 192.168.88.1" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-2 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'أولوية الترافيك' : 'Traffic Priority'}
                                            <InfoTooltip text={isRTL ? 'القيمة 1 هي الأعلى أولوية و 8 هي الأدنى (تؤثر على جودة الخدمة عند ضغط الشبكة)' : '1 is highest priority, 8 is lowest (affects QoS during congestion)'} />
                                        </label>
                                        <input type="number" min={1} max={8} value={profileForm.queuePriority} onChange={(e) => setProfileForm({...profileForm, queuePriority: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                            {isRTL ? 'البروفايل التالي عند الانتهاء' : 'Next Profile on Expiry'}
                                            <InfoTooltip text={isRTL ? 'تحديد بروفايل مخصص ينتقل إليه المشترك فور انتهاء صلاحية هذا البروفايل' : 'Select a specific profile to transition the subscriber to immediately upon expiry'} />
                                        </label>
                                        <select 
                                            value={profileForm.expiredProfileId || ''} 
                                            onChange={(e) => setProfileForm({...profileForm, expiredProfileId: e.target.value})} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-indigo-600"
                                        >
                                            <option value="">{isRTL ? '-- استخدم الافتراضي --' : '-- Use Global Default --'}</option>
                                            {profilesList.filter(p => p.id !== profileForm.id).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                               <Layers className="text-indigo-500" />
                               {isRTL ? 'استعراض بروفايلات السرعة' : 'Profile Viewer'}
                            </h3>
                            <button onClick={handleCreateProfile} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                                <Plus size={16} /> {isRTL ? 'إنشاء بروفايل' : 'Create Profile'}
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
                           {profilesList.length === 0 ? (
                               <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400">
                                   <Layers size={48} className="mb-4 opacity-50" />
                                   <p className="font-bold text-lg">{isRTL ? 'لا يوجد بروفايلات. قم بإنشاء أول بروفايل.' : 'No profiles found.'}</p>
                               </div>
                           ) : (
                               <div className="overflow-x-auto">
                                   <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
                                       <thead>
                                           <tr className="border-b border-slate-200 dark:border-slate-800">
                                               <th className="p-4 text-xs font-bold text-slate-500 uppercase">{isRTL ? 'اسم الخدمة' : 'Name'}</th>
                                               <th className="p-4 text-xs font-bold text-slate-500 uppercase">{isRTL ? 'السرعة' : 'Rate'}</th>
                                               <th className="p-4 text-xs font-bold text-slate-500 uppercase">{isRTL ? 'السعر' : 'Price'}</th>
                                               <th className="p-4 text-xs font-bold text-slate-500 uppercase">{isRTL ? 'المدة' : 'Validity'}</th>
                                               <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                           </tr>
                                       </thead>
                                       <tbody>
                                           {profilesList.map(p => (
                                               <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                   <td className="p-4">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                               {p.name}
                                                               <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase">{p.type}</span>
                                                            </div>
                                                            {p.mikrotikName && <div className="text-[10px] text-indigo-500 font-mono mt-0.5">MW: {p.mikrotikName}</div>}
                                                        </div>
                                                    </td>
                                                   <td className="p-4 font-mono text-sm text-indigo-600 dark:text-indigo-400 font-bold">
                                                       {p.downloadSpeed}/{p.uploadSpeed}
                                                   </td>
                                                   <td className="p-4 font-bold text-teal-600 dark:text-teal-400">{p.price} ILS</td>
                                                   <td className="p-4 font-bold text-slate-600 dark:text-slate-400">
                                                       {p.validityValue} {isRTL ? (p.validityUnit === 'months' ? 'شهر' : p.validityUnit === 'hours' ? 'ساعة' : 'يوم') : p.validityUnit}
                                                   </td>
                                                   <td className="p-4 text-center">
                                                       <div className="flex items-center justify-center gap-2">
                                                           <button onClick={() => openPushModal(p.id)} disabled={isPushingProfile[p.id]} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                                                               {isPushingProfile[p.id] ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                                           </button>
                                                           <button onClick={() => handleEditProfile(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                                                           <button onClick={() => setProfileToDelete(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={18}/></button>
                                                       </div>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeSubTab === 'sync' && (
            <div className="p-6 flex-1">
                <h3 className="text-xl font-bold mb-4">{isRTL ? 'المزامنة الذكية' : 'Smart Sync'}</h3>
                <p className="text-slate-500">{isRTL ? 'قريباً...' : 'Coming soon...'}</p>
            </div>
        )}
      </div>

      <AppModal
        open={showPushModal && Boolean(selectedProfileToPush)}
        onClose={() => { setShowPushModal(false); setSelectedProfileToPush(null); }}
        title={isRTL ? 'إرسال للميكروتيك' : 'Push to MikroTik'}
        subtitle={isRTL ? 'حدد الراوتر المستهدف ثم أرسل البروفايل ضمن نفس النمط الموحد للنوافذ.' : 'Choose the target router and push the profile using the same unified modal style.'}
        icon={<Send size={22} />}
        maxWidthClassName="max-w-md"
        isRTL={isRTL}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowPushModal(false); setSelectedProfileToPush(null); }} className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 font-black text-slate-700 transition-all hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            <button onClick={handlePushProfile} className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 font-black text-white shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-600 flex items-center justify-center gap-2"><Send size={18} /> {isRTL ? 'إرسال' : 'Push'}</button>
          </div>
        }
      >
        <label className="mb-2 block text-sm font-black text-slate-500">{isRTL ? 'الهدف' : 'Target'}</label>
        <select value={pushTarget} onChange={(e) => setPushTarget(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-teal-500 dark:border-slate-800 dark:bg-[#18181B] dark:text-slate-100">
          <option value="all">{isRTL ? 'جميع الراوترات' : 'All routers'}</option>
          {routersList.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name || r.host || r.id}</option>
          ))}
        </select>
      </AppModal>

      <AppConfirmDialog
        open={Boolean(profileToDelete)}
        onClose={() => setProfileToDelete(null)}
        onConfirm={handleDeleteProfile}
        title={isRTL ? 'حذف البروفايل' : 'Delete Profile'}
        description={isRTL ? 'سيتم حذف هذا البروفايل نهائيًا من قاعدة البيانات وإعدادات الراديوس.' : 'This profile will be permanently removed from the database and RADIUS settings.'}
        confirmLabel={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="danger"
        isRTL={isRTL}
      />
    </motion.div>
  );
}
