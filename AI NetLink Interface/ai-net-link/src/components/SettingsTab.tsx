/**
 * © 2026 NetLink. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, User, Network, Cpu, CreditCard, Users, Shield, Save, Key, Database, Server, Lock, Bell, Globe, Moon, Sun, Plus, Trash2, TrendingUp, RefreshCw, Clock, CheckCircle2, XCircle, DollarSign, Calendar, Percent, Eye, EyeOff, Mail, Send, Smartphone, ScanLine, Activity, MessageSquare, QrCode, ShieldCheck, Search, Download, CloudUpload } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import { formatNumber, normalizeDigits, parseNumericInput } from '../utils/format';
import { getGatewaysConfig, saveGatewaysConfig, getWhatsappStatus, restartWhatsappEngine, getNetworkConfig, saveNetworkConfig, testMikrotikConnection, BASE_URL, checkSystemUpdate, startSystemUpdate, publishSystemToGithub } from '../api';
import NumericInput from './NumericInput';
import DateInput from './DateInput';

interface SettingsTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function SettingsTab({ state, setState }: SettingsTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  
  const userPermissions = state.currentUser?.permissions || [];
  const hasPermission = (perm: string) => state.role === 'super_admin' || userPermissions.includes('all') || userPermissions.includes(perm);

  const [activeCategory, setActiveCategory] = useState('profile');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [gateways, setGateways] = useState<any>(null);
  const [waStatus, setWaStatus] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState(() => state.versionInfo.version || '');
  const [releaseNotes, setReleaseNotes] = useState(() => (state.versionInfo.changelog || []).join('\n'));
  const [publishPin, setPublishPin] = useState('');

  React.useEffect(() => {
    if (activeCategory === 'gateways') {
      loadGatewaysOnce();
      const interval = setInterval(loadWaStatusOnly, 3000);
      return () => clearInterval(interval);
    }
  }, [activeCategory]);

  React.useEffect(() => {
    setReleaseVersion(state.versionInfo.version || '');
    setReleaseNotes((state.versionInfo.changelog || []).join('\n'));
  }, [state.versionInfo.version, state.versionInfo.changelog]);

  const loadGatewaysOnce = async () => {
    const g = await getGatewaysConfig();
    if (g) setGateways(g);
    const w = await getWhatsappStatus();
    if (w) setWaStatus(w);
  };

  const loadWaStatusOnly = async () => {
    const w = await getWhatsappStatus();
    if (w) setWaStatus(w);
  };

  const handleCheckUpdate = async () => {
    setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: true, error: undefined } }));
    try {
      const result = await checkSystemUpdate();
      const payload = result?.data;
      if (!payload) throw new Error('Missing update payload');

      const currentVersion = payload.current || state.versionInfo.version;
      const latestVersion = payload.latest || null;
      const hasUpdate = Boolean(payload.hasUpdate);

      setState(prev => ({
        ...prev,
        versionInfo: {
          ...prev.versionInfo,
          version: currentVersion
        },
        updateStatus: {
          hasUpdate,
          latestVersion: hasUpdate ? latestVersion : null,
          checking: false
        }
      }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        updateStatus: { ...prev.updateStatus, checking: false, error: isRTL ? 'فشل التحقق من التحديثات' : 'Failed to check for updates' } 
      }));
    }
  };

  const handleUpdateSystem = async () => {
    if (!state.updateStatus.hasUpdate) return;
    setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: true } }));
    
    try {
      const result = await startSystemUpdate();
      setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: false } }));
      alert(result.message || (isRTL ? 'بدأ التحديث! سيقوم النظام بإعادة التشغيل تلقائياً.' : 'Update started! The system will restart automatically.'));
    } catch (err) {
      setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: false, error: 'Update failed' } }));
    }
  };

  const handlePublishToGithub = async () => {
    const changelog = releaseNotes.split('\n').map(line => line.trim()).filter(Boolean);
    if (!releaseVersion.trim() || changelog.length === 0) {
      alert(t.settings.update.releaseRequired);
      return;
    }
    if (!publishPin.trim()) {
      alert(t.settings.update.invalidPin);
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishSystemToGithub({
        version: releaseVersion.trim(),
        changelog,
        commitMessage: `release: v${releaseVersion.trim()}`,
        pin: publishPin
      });

      const published = result.data || {
        version: releaseVersion.trim(),
        buildDate: new Date().toISOString().split('T')[0],
        changelog
      };

      setState(prev => ({
        ...prev,
        versionInfo: published,
        updateStatus: {
          ...prev.updateStatus,
          hasUpdate: false,
          latestVersion: null,
          checking: false,
          error: undefined
        }
      }));

      setReleaseVersion(published.version || '');
      setReleaseNotes((published.changelog || []).join('\n'));
      setPublishPin('');
      alert(`${t.settings.update.publishSuccess} v${published.version}`);
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const categories = [
    { id: 'profile', icon: User, label: t.settings.categories.profile },
    { id: 'gateways', icon: Send, label: isRTL ? 'إدارة البوابات' : 'Gateways', permission: 'manage_team' },
    { id: 'ai', icon: Cpu, label: t.settings.categories.ai, permission: 'manage_ai' },
    { id: 'billing', icon: CreditCard, label: t.settings.categories.billing, permission: 'view_billing' },
    { id: 'investors', icon: TrendingUp, label: t.settings.categories.investors, permission: 'view_investors' },
    { id: 'backup', icon: Database, label: t.settings.categories.backup, permission: 'perform_backup' },
    { id: 'team', icon: Users, label: t.settings.categories.team, permission: 'manage_team' },
    { id: 'security', icon: Shield, label: t.settings.categories.security, permission: 'view_security' },
    { id: 'about', icon: Activity, label: t.settings.categories.about },
  ].filter(cat => !cat.permission || hasPermission(cat.permission));

  const handleRoleSwitch = () => {
    const normalizedPin = normalizeDigits(pin);
    if (state.role === 'user') {
      if (normalizedPin === '1234') {
        setState({ ...state, role: 'sas4_manager' });
        setPin('');
        setPinError(false);
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 1000);
      }
    } else if (state.role === 'sas4_manager') {
      setState({ ...state, role: 'user' });
    }
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t.settings.categories.profile}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.profile.language}</label>
                <div className="flex bg-slate-100 dark:bg-[#18181B] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button onClick={() => setState({ ...state, lang: 'en' })} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${state.lang === 'en' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500'}`}>English</button>
                  <button onClick={() => setState({ ...state, lang: 'ar' })} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${state.lang === 'ar' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500'}`}>العربية</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.profile.theme}</label>
                <div className="flex bg-slate-100 dark:bg-[#18181B] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button onClick={() => setState({ ...state, theme: 'light' })} className={`flex-1 py-2 flex justify-center items-center gap-2 text-sm font-medium rounded-lg transition-all ${state.theme === 'light' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500'}`}><Sun size={16} /> Light</button>
                  <button onClick={() => setState({ ...state, theme: 'dark' })} className={`flex-1 py-2 flex justify-center items-center gap-2 text-sm font-medium rounded-lg transition-all ${state.theme === 'dark' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500'}`}><Moon size={16} /> Dark</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.profile.sessionTimeout}</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  defaultValue={formatNumber(30)} 
                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono" 
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.settings.profile.twoFactor}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Secure your account with an authenticator app.</p>
                </div>
                <div className="w-12 h-6 bg-teal-500 rounded-full relative cursor-pointer">
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRTL ? 'left-1' : 'right-1'}`}></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gateways':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Send className="text-teal-500" />
                {isRTL ? 'بوابات الإرسال والربط' : 'Gateways & Integrations'}
              </h3>
              <button onClick={async () => {
                const success = await saveGatewaysConfig(gateways);
                alert(success ? (isRTL?'تم الحفظ':'Saved') : (isRTL?'فشل':'Failed'));
              }} className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20">
                <Save size={16}/> {isRTL ? 'حفظ إعدادات البوابات' : 'Save Configurations'}
              </button>
            </div>

            {gateways && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
                
                {/* SMS Gateway */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 flex flex-col h-full space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Smartphone size={18} className="text-blue-500" />
                    {isRTL ? 'بوابة الرسائل القصيرة (SMS)' : 'SMS Gateway'}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500">{isRTL ? 'رابط الخدمة (URL)' : 'Endpoint URL'}</label>
                      <input type="text" value={gateways.sms?.url || ''} onChange={(e) => setGateways({...gateways, sms: {...gateways.sms, url: e.target.value}})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">{isRTL ? 'إسم المستخدم' : 'Username'}</label>
                      <input type="text" value={gateways.sms?.user_name || ''} onChange={(e) => setGateways({...gateways, sms: {...gateways.sms, user_name: e.target.value}})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                      <input type="password" value={gateways.sms?.user_pass || ''} onChange={(e) => setGateways({...gateways, sms: {...gateways.sms, user_pass: e.target.value}})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500">{isRTL ? 'إسم المرسل' : 'Sender Name'}</label>
                      <input type="text" value={gateways.sms?.sender || ''} onChange={(e) => setGateways({...gateways, sms: {...gateways.sms, sender: e.target.value}})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500" />
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button onClick={async () => {
                         const testNum = prompt(isRTL ? 'أدخل رقم هاتف للتجربة' : 'Enter mobile to test');
                         if(!testNum) return;
                         try {
                           const res = await fetch(`${BASE_URL}/sms/send`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({mobile: testNum, text: 'Test NetLink API'}) });
                           if(res.ok) alert(isRTL ? 'تم الإرسال بنجاح' : 'Test message sent');
                           else alert('Error testing');
                         } catch(e) { alert('Error testing API'); }
                      }} className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                        <Activity size={16}/> {isRTL ? 'فحص بوابة الـ SMS' : 'Test SMS Engine'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 flex flex-col">
                  {/* WhatsApp Native Engine */}
                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={18} className="text-emerald-500" />
                        {isRTL ? 'خادم واتساب المحلي' : 'Native WhatsApp Engine'}
                      </div>
                      {waStatus && (
                         <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-widest ${waStatus.ready ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                           {waStatus.status}
                         </span>
                      )}
                    </h4>
                    
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                       {waStatus?.qr ? (
                          <div className="text-center space-y-4">
                            <QrCode size={48} className="mx-auto text-slate-400" />
                            <p className="text-sm font-bold text-rose-500">{isRTL ? 'يوجد مسح QR مطلوب! تفقد شاشة السيرفر (CMD) للمسح.' : 'QR Code pending! Check your Server Console (CMD) to scan.'}</p>
                          </div>
                       ) : waStatus?.ready ? (
                          <div className="text-center space-y-2">
                             <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32}/></div>
                             <h5 className="font-bold text-slate-800 dark:text-slate-200">{isRTL ? 'المحرك نشط ومتصل' : 'Engine is Active'}</h5>
                             <p className="text-xs text-slate-500">{isRTL ? 'سيرفر الواتساب جاهز لإرسال الرسائل الجماعية' : 'Server is ready to dispatch bulk messages.'}</p>
                          </div>
                       ) : (
                          <p className="text-sm text-slate-500">{isRTL ? 'جاري تهيئة المحرك...' : 'Initializing Engine...'}</p>
                       )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'تأخير الرسائل الجماعية (ملي ثانية)' : 'Bulk Delay (ms)'}</label>
                      <input 
                        type="number" 
                        min="1500" 
                        value={gateways.whatsapp?.delay || 1500} 
                        onChange={(e) => setGateways({...gateways, whatsapp: {...gateways.whatsapp, delay: Math.max(1500, parseInt(e.target.value) || 1500)}})} 
                        className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono transition-all" 
                      />
                      <p className="text-[10px] text-slate-400">{isRTL ? 'الحد الأدنى 1500 (ثانية ونصف) للحماية من الحظر.' : 'Minimum 1500ms for safety against server blocks.'}</p>
                    </div>
                    
                    <button onClick={async () => {
                       await restartWhatsappEngine();
                       alert(isRTL ? 'تم إرسال أمر إعادة التشغيل' : 'Restart signal sent');
                    }} className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all mt-auto">
                      <RefreshCw size={16}/> {isRTL ? 'إعادة الإقناع (Restart Engine)' : 'Restart Engine'}
                    </button>
                  </div>

                  {/* Email Gateway */}
                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 flex flex-col h-full space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                      <Mail size={18} className="text-violet-500" />
                      {isRTL ? 'بوابة البريد الإلكتروني (SMTP)' : 'Email Gateway (SMTP)'}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'خادم المضيف (Host)' : 'SMTP Host'}</label>
                        <input type="text" value={gateways.email?.host || ''} onChange={(e) => setGateways({...gateways, email: {...gateways.email, host: e.target.value}})} placeholder="smtp.hostinger.com" className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 font-mono" />
                      </div>
                      <div className="flex gap-2">
                         <div className="flex-1">
                           <label className="text-xs font-bold text-slate-500">{isRTL ? 'معرف الدخول (User)' : 'Username'}</label>
                           <input type="text" value={gateways.email?.user || ''} onChange={(e) => setGateways({...gateways, email: {...gateways.email, user: e.target.value}})} placeholder="info@netlinkps.top" className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 font-mono" />
                         </div>
                         <div className="w-1/3">
                           <label className="text-xs font-bold text-slate-500">{isRTL ? 'المنفذ (Port)' : 'Port'}</label>
                           <input type="number" value={gateways.email?.port || ''} onChange={(e) => setGateways({...gateways, email: {...gateways.email, port: parseInt(e.target.value)||465}})} placeholder="465" className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 font-mono" />
                         </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'كلمة المرور' : 'Password'}</label>
                        <input type="password" value={gateways.email?.pass || ''} onChange={(e) => setGateways({...gateways, email: {...gateways.email, pass: e.target.value}})} className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">{isRTL ? 'البريد المُرسِل (From)' : 'From Email'}</label>
                        <input type="text" value={gateways.email?.from || ''} onChange={(e) => setGateways({...gateways, email: {...gateways.email, from: e.target.value}})} placeholder="info@netlinkps.top" className="w-full mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 font-mono" />
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={async () => {
                           const testMail = prompt(isRTL ? 'أدخل إيميل للتجربة' : 'Enter email to test');
                           if(!testMail) return;
                           try {
                             const res = await fetch(`${BASE_URL}/email/send`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({emails: [testMail], text: 'Test Email from NetLink API', subject: 'NetLink Connectivity Test'}) });
                             if(res.ok) {
                               alert(isRTL ? 'تم الإرسال بنجاح' : 'Test message sent');
                             } else {
                               const data = await res.json();
                               alert(isRTL ? `فشل الإرسال: ${data.error || 'تأكد من صحة إعدادات البوابة'}` : `Failed: ${data.error || 'Check gateway configs'}`);
                             }
                           } catch(e: any) { alert(isRTL ? `خطأ في الاتصال: ${e.message}` : `Connection error: ${e.message}`); }
                        }} className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                          <Activity size={16}/> {isRTL ? 'فحص بوابة البريد' : 'Test Email Engine'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-8">
            <header>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t.settings.categories.ai}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isRTL 
                  ? 'قم بتكوين نماذج الذكاء الاصطناعي المحلية وعبر API. يدعم النظام Gemini و GPT و Grok و Open Router و Anthropic و Mistral.' 
                  : 'Configure local and API-based AI models. System supports Gemini, GPT, Grok, Open Router, Anthropic, and Mistral.'}
              </p>
            </header>

            <div className="grid grid-cols-1 gap-8">
              {/* Primary Configuration */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t.settings.ai.model}</label>
                  <select 
                    value={state.aiSettings.primaryModel}
                    onChange={(e) => setState(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, primaryModel: e.target.value } }))}
                    className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all"
                  >
                    <option value="gemini-3-flash-preview">Google Gemini 3 Flash</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="grok-1">xAI Grok-1</option>
                    <option value="local-llama-3">Local Llama 3 (Ollama)</option>
                  </select>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.settings.ai.autoRemediation}</h4>
                    <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-extrabold rounded-md uppercase">
                      {state.aiSettings.autoRemediation === 1 ? 'Manual' : state.aiSettings.autoRemediation === 2 ? 'Semi-Auto' : 'Autonomous'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.settings.ai.autoRemediationDesc}</p>
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    value={state.aiSettings.autoRemediation} 
                    onChange={(e) => setState(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, autoRemediation: parseInt(e.target.value) } }))}
                    className="w-full accent-teal-500" 
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>{isRTL ? 'يدوي فقط' : 'Manual Only'}</span>
                    <span>{isRTL ? 'شبه تلقائي' : 'Semi-Auto'}</span>
                    <span>{isRTL ? 'مستقل تماماً' : 'Fully Autonomous'}</span>
                  </div>
                </div>
              </div>

              {/* AI Providers & API Keys */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Key size={16} className="text-teal-500" />
                  {t.settings.ai.providers}
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {state.aiSettings.providers.map((provider, idx) => (
                    <div key={provider.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] hover:border-teal-500/30 transition-all group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${provider.enabled ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {provider.id === 'local' ? <Server size={20} /> : <Globe size={20} />}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white text-sm">{provider.name}</h5>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {provider.enabled ? t.settings.ai.active : t.settings.ai.inactive}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold rounded-lg transition-colors flex items-center gap-1.5">
                            <RefreshCw size={12} />
                            {t.settings.ai.testConnection}
                          </button>
                          <div 
                            onClick={() => {
                              const newProviders = [...state.aiSettings.providers];
                              newProviders[idx].enabled = !newProviders[idx].enabled;
                              setState(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, providers: newProviders } }));
                            }}
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${provider.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${provider.enabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.settings.ai.apiKey}</label>
                          <div className="relative">
                            <input 
                              type="password" 
                              value={provider.apiKey}
                              onChange={(e) => {
                                const newProviders = [...state.aiSettings.providers];
                                newProviders[idx].apiKey = e.target.value;
                                setState(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, providers: newProviders } }));
                              }}
                              placeholder="sk-••••••••••••••••••••••••"
                              className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                            />
                            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.settings.ai.endpoint}</label>
                          <input 
                            type="text" 
                            value={provider.endpoint}
                            onChange={(e) => {
                              const newProviders = [...state.aiSettings.providers];
                              newProviders[idx].endpoint = e.target.value;
                              setState(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, providers: newProviders } }));
                            }}
                            placeholder="https://api.example.com/v1"
                            className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t.settings.categories.billing}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.billing.currency}</label>
                <select 
                  value={state.currency}
                  onChange={(e) => setState(prev => ({ ...prev, currency: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all"
                >
                  <option value="ILS">{t.currencies.ILS}</option>
                  <option value="USD">{t.currencies.USD}</option>
                  <option value="JOD">{t.currencies.JOD}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.billing.taxRate}</label>
                <input type="text" inputMode="numeric" defaultValue={formatNumber(15)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.billing.suspendDays}</label>
                <input type="text" inputMode="numeric" defaultValue={formatNumber(7)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.billing.decimalPlaces}</label>
                <NumericInput 
                  value={state.numberSettings.decimalPlaces}
                  onChange={(val) => setState(prev => ({ ...prev, numberSettings: { ...prev.numberSettings, decimalPlaces: val } }))}
                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.settings.billing.autoSuspend}</h4>
                </div>
                <div className="w-12 h-6 bg-teal-500 rounded-full relative cursor-pointer">
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRTL ? 'left-1' : 'right-1'}`}></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'investors':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t.settings.categories.investors}</h3>
              <p className="text-sm text-slate-500 mb-6">Configure core stock metrics and trading parameters for the investor portal.</p>
            </div>

            <div className="space-y-6">
              {/* Pricing Section */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  {t.settings.investors.pricingValuation}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.sharePrice}</label>
                    <NumericInput 
                      value={state.investorSettings.sharePrice}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, sharePrice: val } }))}
                      isFloat={true}
                      formatOptions={{ minimumFractionDigits: 2 }}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.buyPrice}</label>
                    <NumericInput 
                      value={state.investorSettings.buyPrice}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, buyPrice: val } }))}
                      isFloat={true}
                      formatOptions={{ minimumFractionDigits: 2 }}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.sellPrice}</label>
                    <NumericInput 
                      value={state.investorSettings.sellPrice}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, sellPrice: val } }))}
                      isFloat={true}
                      formatOptions={{ minimumFractionDigits: 2 }}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  {t.settings.investors.performanceData}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.totalShares}</label>
                    <NumericInput 
                      value={state.investorSettings.totalShares}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, totalShares: val } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.eps}</label>
                    <NumericInput 
                      value={state.investorSettings.eps}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, eps: val } }))}
                      isFloat={true}
                      formatOptions={{ minimumFractionDigits: 2 }}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.dividendYield}</label>
                    <NumericInput 
                      value={state.investorSettings.dividendYield}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, dividendYield: val } }))}
                      isFloat={true}
                      formatOptions={{ minimumFractionDigits: 1 }}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  {t.settings.investors.keyDates}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.lastDividendDate}</label>
                    <DateInput 
                      value={state.investorSettings.lastDividendDate}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, lastDividendDate: val } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.settings.investors.nextEarningsDate}</label>
                    <DateInput 
                      value={state.investorSettings.nextEarningsDate}
                      onChange={(val) => setState(prev => ({ ...prev, investorSettings: { ...prev.investorSettings, nextEarningsDate: val } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t.settings.backup.title}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.settings.backup.enabled}</h4>
                </div>
                <div 
                  onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, enabled: !prev.backupSettings.enabled } }))}
                  className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.enabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.settings.backup.automatic}</h4>
                </div>
                <div 
                  onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, automatic: !prev.backupSettings.automatic } }))}
                  className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.automatic ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.automatic ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.backup.frequency}</label>
                <select 
                  value={state.backupSettings.frequency}
                  onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, frequency: e.target.value as any } }))}
                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all"
                >
                  <option value="daily">{isRTL ? 'يومي' : 'Daily'}</option>
                  <option value="weekly">{isRTL ? 'أسبوعي' : 'Weekly'}</option>
                  <option value="monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">{t.settings.backup.lastBackup}</h4>
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-mono text-sm">
                  <Clock size={14} className="text-teal-500" />
                  {state.backupSettings.lastBackup || 'Never'}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500">
                <Database size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{t.settings.backup.status}</h4>
                <p className="text-sm text-slate-500">{isRTL ? 'النظام جاهز للنسخ الاحتياطي' : 'System is ready for backup'}</p>
              </div>
              <button className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                <RefreshCw size={16} />
                {t.settings.backup.runNow}
              </button>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.settings.categories.team}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isRTL ? 'إدارة مديري النظام، مديري SAS 4، وصلاحيات وصولهم.' : 'Manage system administrators, SaaS 4 managers, and their access permissions.'}
                </p>
              </div>
              {hasPermission('manage_team') && (
                <button 
                  onClick={() => {
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newMember: any = { id: newId, name: '', email: '', username: '', role: 'user', permissions: [], status: 'active', joinDate: new Date().toISOString().split('T')[0] };
                    setEditingMember(newMember);
                    setIsAddingMember(true);
                  }}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
                >
                  <Plus size={18} /> {t.settings.team.addUser}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {state.teamMembers.map((member) => (
                <div key={member.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-teal-500/30 transition-all group shadow-sm">
                  <div className="flex items-center gap-4 mb-4 lg:mb-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg shadow-inner">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {member.name}
                        <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail size={12} /> {member.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User size={12} /> @{member.username}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800 w-full lg:w-auto mt-2 lg:mt-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                        member.role === 'super_admin' ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' :
                        member.role === 'admin' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {t.roles[member.role]}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {member.permissions.length} {isRTL ? 'صلاحيات' : 'Permissions'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPermission('manage_team') ? (
                        <>
                          <button 
                            onClick={() => {
                              setEditingMember({ ...member });
                              setIsAddingMember(false);
                            }}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-500 hover:text-white text-slate-600 dark:text-slate-400 rounded-xl transition-all"
                          >
                            <Settings size={18} />
                          </button>
                          {member.role !== 'super_admin' && (
                            <button 
                              onClick={() => {
                                if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) {
                                  setState(prev => ({
                                    ...prev,
                                    teamMembers: prev.teamMembers.filter(m => m.id !== member.id)
                                  }));
                                }
                              }}
                              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-400 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">{isRTL ? 'عرض فقط' : 'Read Only'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Member Modal Overlay */}
            {editingMember && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                        {isAddingMember ? t.settings.team.addUser : t.settings.team.editUser}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">ID: {editingMember.id}</p>
                    </div>
                    <button onClick={() => setEditingMember(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <XCircle size={24} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.settings.team.name}</label>
                        <input 
                          type="text" 
                          value={editingMember.name}
                          onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.settings.team.email}</label>
                        <input 
                          type="email" 
                          value={editingMember.email}
                          onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.settings.team.username}</label>
                        <input 
                          type="text" 
                          value={editingMember.username}
                          onChange={(e) => setEditingMember({ ...editingMember, username: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.settings.team.role}</label>
                        <select 
                          value={editingMember.role}
                          onChange={(e) => {
                            const newRole = e.target.value as any;
                            let defaultPerms: string[] = [];
                            if (newRole === 'super_admin') defaultPerms = ['all'];
                            else if (newRole === 'admin') defaultPerms = ['view_dashboard', 'access_chat', 'perform_search', 'view_subscribers', 'view_suppliers', 'view_shareholders', 'view_directors', 'view_deputies', 'view_admins', 'access_files', 'view_topology', 'view_security', 'access_executive', 'view_billing', 'view_inventory', 'view_crm', 'view_field_service', 'view_reports', 'view_investors', 'view_boi'];
                            else if (newRole === 'sas4_manager') defaultPerms = ['view_dashboard', 'perform_search', 'view_subscribers', 'manage_subscribers', 'view_suppliers', 'manage_suppliers', 'view_shareholders', 'manage_shareholders', 'view_directors', 'manage_directors', 'view_deputies', 'manage_deputies', 'view_admins', 'manage_admins'];
                            else if (newRole === 'user') defaultPerms = ['view_dashboard', 'perform_search'];
                            
                            setEditingMember({ ...editingMember, role: newRole, permissions: defaultPerms });
                          }}
                          className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all"
                        >
                          <option value="super_admin">{t.roles.super_admin}</option>
                          <option value="admin">{t.roles.admin}</option>
                          <option value="sas4_manager">{t.roles.sas4_manager}</option>
                          <option value="user">{t.roles.user}</option>
                        </select>
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${editingMember.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t.settings.team.status}</h4>
                      </div>
                      <div 
                        onClick={() => setEditingMember({ ...editingMember, status: editingMember.status === 'active' ? 'inactive' : 'active' })}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${editingMember.status === 'active' ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingMember.status === 'active' ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                      </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Shield size={18} className="text-teal-500" />
                          {t.settings.team.permissions}
                        </h4>
                        {editingMember.role !== 'super_admin' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingMember({ ...editingMember, permissions: Object.keys(t.settings.team.perms) })}
                              className="text-[10px] font-bold text-teal-500 uppercase hover:underline"
                            >
                              {isRTL ? 'تحديد الكل' : 'Select All'}
                            </button>
                            <span className="text-slate-300">|</span>
                            <button 
                              onClick={() => setEditingMember({ ...editingMember, permissions: [] })}
                              className="text-[10px] font-bold text-rose-500 uppercase hover:underline"
                            >
                              {isRTL ? 'إلغاء الكل' : 'Deselect All'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-8">
                        {[
                          { id: 'dashboard', perms: ['view_dashboard', 'manage_widgets'] },
                          { id: 'chat', perms: ['access_chat', 'clear_chat', 'export_chat'] },
                          { id: 'search', perms: ['perform_search'] },
                          { id: 'management', perms: ['view_subscribers', 'manage_subscribers', 'view_suppliers', 'manage_suppliers', 'view_shareholders', 'manage_shareholders', 'view_directors', 'manage_directors', 'view_deputies', 'manage_deputies', 'view_admins', 'manage_admins'] },
                          { id: 'files', perms: ['access_files', 'upload_files', 'delete_files'] },
                          { id: 'network', perms: ['view_topology', 'manage_topology'] },
                          { id: 'security', perms: ['view_security', 'manage_security', 'view_audit_logs'] },
                          { id: 'executive', perms: ['access_executive', 'manage_ai'] },
                          { id: 'billing', perms: ['view_billing', 'manage_billing'] },
                          { id: 'inventory', perms: ['view_inventory', 'manage_inventory', 'view_crm', 'manage_crm', 'view_field_service', 'manage_field_service'] },
                          { id: 'reports', perms: ['view_reports', 'create_reports', 'manage_portal'] },
                          { id: 'settings', perms: ['view_investors', 'manage_investors', 'view_boi', 'manage_boi', 'edit_settings', 'manage_team', 'perform_backup'] },
                        ].map((group) => (
                          <div key={group.id} className="space-y-3">
                            <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">
                              {t.settings.team.categories[group.id]}
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {group.perms.map((permId) => {
                                const isChecked = editingMember.permissions.includes(permId) || editingMember.permissions.includes('all');
                                const isSuperAdmin = editingMember.role === 'super_admin';
                                
                                return (
                                  <label 
                                    key={permId} 
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                      isChecked 
                                        ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30' 
                                        : 'bg-white dark:bg-[#09090B] border-slate-100 dark:border-slate-800'
                                    } ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-teal-500/50'}`}
                                  >
                                    <div className="relative flex items-center shrink-0">
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        disabled={isSuperAdmin}
                                        onChange={(e) => {
                                          if (isSuperAdmin) return;
                                          const newPerms = e.target.checked 
                                            ? [...editingMember.permissions, permId]
                                            : editingMember.permissions.filter(p => p !== permId);
                                          setEditingMember({ ...editingMember, permissions: newPerms });
                                        }}
                                        className="peer sr-only" 
                                      />
                                      <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all" />
                                      <CheckCircle2 className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-0.5 transition-opacity" />
                                    </div>
                                    <span className={`text-[11px] font-bold leading-tight ${isChecked ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                      {t.settings.team.perms[permId]}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {editingMember.role === 'super_admin' && (
                        <div className="p-4 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-2xl flex items-center gap-3">
                          <Shield size={20} className="text-violet-500" />
                          <p className="text-xs font-bold text-violet-700 dark:text-violet-400">
                            {t.settings.team.all}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <button 
                      onClick={() => setEditingMember(null)}
                      className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {t.management.cancel}
                    </button>
                    <button 
                      onClick={() => {
                        if (!editingMember.name || !editingMember.email || !editingMember.username) {
                          alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
                          return;
                        }
                        
                        setState(prev => {
                          const exists = prev.teamMembers.find(m => m.id === editingMember.id);
                          const newTeam = exists 
                            ? prev.teamMembers.map(m => m.id === editingMember.id ? editingMember : m)
                            : [...prev.teamMembers, editingMember];
                          
                          return { ...prev, teamMembers: newTeam };
                        });
                        setEditingMember(null);
                      }}
                      className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
                    >
                      <Save size={18} /> {t.settings.team.saveUser}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t.settings.categories.security}</h3>
            
            {/* Role Management (Moved here from old settings) */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="text-teal-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t.settings.roleMgmt}</h3>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t.settings.currentUser}:</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${['super_admin', 'admin', 'sas4_manager'].includes(state.role) ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                    {t.roles[state.role]}
                  </span>
                </div>
                
                {state.role === 'user' ? (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-48">
                        <input 
                          type={showPin ? "text" : "password"} 
                          placeholder={t.settings.enterPin}
                          value={pin}
                          onChange={(e) => setPin(normalizeDigits(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && handleRoleSwitch()}
                          className={`bg-white dark:bg-[#18181B] border rounded-xl pl-3 pr-10 py-2 text-sm focus:outline-none w-full text-slate-800 dark:text-slate-200 font-mono transition-all ${
                            pinError 
                              ? 'border-rose-500 ring-2 ring-rose-500/20 animate-shake' 
                              : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                          }`}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button 
                        onClick={handleRoleSwitch}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-lg ${
                          pinError 
                            ? 'bg-rose-500 text-white shadow-rose-500/20' 
                            : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 shadow-slate-900/10'
                        }`}
                      >
                        {pinError ? (isRTL ? 'خطأ!' : 'Error!') : t.settings.unlock}
                      </button>
                    </div>
                    {pinError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-rose-500 uppercase tracking-wider"
                      >
                        {isRTL ? 'رمز الدخول غير صحيح' : 'Incorrect PIN code'}
                      </motion.p>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={handleRoleSwitch}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold transition-colors"
                  >
                    {t.settings.revert}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.security.ipWhitelist}</label>
                <textarea rows={2} defaultValue="192.168.1.0/24, 10.0.0.5" className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.security.auditLogs}</label>
                <input type="text" inputMode="numeric" defaultValue={formatNumber(90)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-all font-mono" />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.settings.security.requireVpn}</h4>
                </div>
                <div className="w-12 h-6 bg-teal-500 rounded-full relative cursor-pointer">
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRTL ? 'left-1' : 'right-1'}`}></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Update & System Info Card */}
              <div className="p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="text-teal-500" size={18} />
                    {isRTL ? 'تحديث النظام المحترف' : 'Professional System Update'}
                  </h4>
                  <span className={`self-start text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${state.updateStatus.hasUpdate ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                    {state.updateStatus.hasUpdate ? t.settings.update.newAvailable : t.settings.update.upToDate}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.settings.update.version}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">v{state.versionInfo.version}</p>
                    </div>
                    <div className="text-right space-y-1 border-s border-slate-200 dark:border-slate-700 ps-3">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.settings.update.buildDate}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{state.versionInfo.buildDate}</p>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.settings.update.releaseVersion}</label>
                      <input
                        type="text"
                        value={releaseVersion}
                        onChange={(e) => setReleaseVersion(e.target.value)}
                        disabled={state.updateStatus.checking || isPublishing}
                        placeholder="1.0.5"
                        className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.settings.update.releaseNotes}</label>
                      <textarea
                        rows={4}
                        value={releaseNotes}
                        onChange={(e) => setReleaseNotes(e.target.value)}
                        disabled={state.updateStatus.checking || isPublishing}
                        placeholder={t.settings.update.releasePlaceholder}
                        className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 resize-none disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t.settings.update.publishPin}</label>
                      <input
                        type="password"
                        value={publishPin}
                        onChange={(e) => setPublishPin(e.target.value)}
                        disabled={state.updateStatus.checking || isPublishing}
                        placeholder={t.settings.update.publishPinPlaceholder}
                        className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono disabled:opacity-60"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.settings.update.publishHelp}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={handleCheckUpdate}
                      disabled={state.updateStatus.checking || isPublishing}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {state.updateStatus.checking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                      {t.settings.update.checking}
                    </button>
                    <button 
                      onClick={handlePublishToGithub}
                      disabled={state.updateStatus.checking || isPublishing}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-teal-500/20 disabled:opacity-50"
                    >
                      {isPublishing ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />}
                      {isPublishing ? t.settings.update.publishing : t.settings.update.publish}
                    </button>
                    {state.updateStatus.hasUpdate && (
                      <button 
                        onClick={handleUpdateSystem}
                        disabled={state.updateStatus.checking || isPublishing}
                        className="w-full mt-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        {t.settings.update.updateNow}
                      </button>
                    )}
                  </div>
                  {state.updateStatus.error && (
                    <p className="text-[10px] text-rose-500 font-bold text-center uppercase tracking-wider">{state.updateStatus.error}</p>
                  )}
                  {state.updateStatus.latestVersion && (
                    <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-bold">
                      {t.settings.update.latestVersion}: v{state.updateStatus.latestVersion}
                    </p>
                  )}
                </div>
              </div>

              {/* Developer & Company Card */}
              <div className="p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] space-y-4 shadow-sm">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="text-violet-500" size={18} />
                  {isRTL ? 'بيانات المطور والشركة' : 'Developer & Company'}
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-500/5 dark:to-blue-500/5 border border-violet-100 dark:border-violet-500/10">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center font-bold text-violet-600 border border-violet-100 dark:border-slate-700">MR</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">Muhammad Rateb Jabarin</p>
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-widest">{isRTL ? 'المدير التقني' : 'CTO & Founder'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <a href="https://aljabareen.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{isRTL ? 'الموقع' : 'Website'}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-500 truncate ms-2">aljabareen.com</span>
                    </a>
                    <a href="mailto:admin@aljabareen.com" className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{isRTL ? 'البريد' : 'Email'}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate ms-2">admin@aljabareen.com</span>
                    </a>
                    <a href="https://wa.me/970597409040" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Smartphone size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{isRTL ? 'واتساب' : 'WhatsApp'}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-500 truncate ms-2">+970 597 409 040</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* IP Protection Banner */}
            <div className="p-6 sm:p-8 rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-violet-500/5 text-center space-y-4 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                 <ShieldCheck size={120} />
               </div>
              <ShieldCheck className="mx-auto text-blue-500 relative" size={40} />
              <div className="space-y-2 relative">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{isRTL ? 'حقوق الملكية الفكرية - NetLink' : 'IP Protection - NetLink'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  {isRTL 
                    ? 'هذا النظام محمي بموجب قوانين تكنولوجيا المعلومات الدولية وحقوق المؤلف لعام 2026. أي محاولة لفك التشفير أو الهندسة العكسية للكود المصدري تعرضك للمساءلة القانونية المباشرة تحت إشراف شركة NetLink.'
                    : 'This system is protected under international IT laws and 2026 copyright regulations. Any attempt to decrypt or reverse-engineer the source code will lead to direct legal action under NetLink supervision.'}
                </p>
              </div>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 relative">
                <div className="hidden sm:block h-px w-12 bg-slate-200 dark:bg-slate-800"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">© 2026 Muhammad Rateb Jabarin</p>
                <div className="hidden sm:block h-px w-12 bg-slate-200 dark:bg-slate-800"></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="text-slate-500" size={32} />
          {t.settings.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t.settings.subtitle}
        </p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0 overflow-x-auto md:overflow-y-auto custom-scrollbar flex md:flex-col gap-2 pb-2 md:pb-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20' 
                    : 'bg-white dark:bg-[#09090B] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-teal-500/30 hover:text-teal-600 dark:hover:text-teal-400'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 glass-card p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {renderContent()}
          
          {/* Global Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-2">
              <Save size={16} /> {t.settings.save}
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
