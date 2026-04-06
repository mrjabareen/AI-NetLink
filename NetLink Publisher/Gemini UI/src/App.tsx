/**
 * ============================================================================
 * NetLink ID - Developer & Company Identity
 * ============================================================================
 * Company Name: NetLink
 * Owner & Developer: Muhammad Rateb Jabarin (محمد راتب جبارين)
 * Official Website: https://aljabareen.com
 * Official Email: admin@aljabareen.com
 * Personal Email: mrjabarin@gmail.com
 * WhatsApp: +970597409040
 * ============================================================================
 * Copyright © 2026 NetLink. All rights reserved.
 * This code is proprietary and protected by intellectual property laws.
 * ============================================================================
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Folder, Eye, EyeOff, Save, RefreshCw, UploadCloud, FileJson, CheckCircle2, AlertCircle, Loader2, Terminal, Sun, Moon, Trash2, Lock, X } from 'lucide-react';

const translations = {
  ar: {
    title: 'NetLink Windows Publisher',
    subtitle: 'منصة النشر وإدارة الإصدارات المتقدمة',
    badge1: 'Publisher Console',
    badge2: 'GitHub Main Sync',
    section1: 'ربط المشروع و GitHub',
    projectFolder: 'مجلد المشروع',
    chooseFolder: 'اختيار المجلد',
    repoUrl: 'رابط المستودع GitHub',
    githubUser: 'اسم المستخدم GitHub',
    githubToken: 'GitHub Token',
    saveSettings: 'حفظ الإعدادات',
    settingsSaved: 'تم حفظ الإعدادات محليًا.',
    section2: 'حالة المشروع الحالية',
    projectName: 'اسم المشروع',
    repoRoot: 'جذر المستودع',
    frontendFolder: 'مجلد الواجهة',
    loadedVersion: 'الإصدار المحمّل',
    buildDate: 'تاريخ البناء',
    githubVersion: 'الإصدار الموجود على GitHub',
    section3: 'بيانات الإصدار',
    versionNumber: 'رقم الإصدار',
    changelog: 'سجل التغييرات',
    updateData: 'تحديث البيانات',
    loadVersion: 'تحميل من version.json',
    publish: 'نشر إلى GitHub',
    section4: 'سجل التنفيذ',
    statusReady: 'جاهز',
    statusPublishing: 'جاري النشر',
    statusError: 'يوجد خطأ',
    logPlaceholder: 'بانتظار بدء العمليات...',
    clearLog: 'مسح السجل',
    enterPin: 'أدخل الرقم السري (PIN)',
    pinDescription: 'يرجى إدخال الرقم السري لتأكيد عملية النشر إلى GitHub.',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    invalidPin: 'الرقم السري غير صحيح!',
    publishingProgress: 'جاري النشر...',
    logStartPublish: 'بدء عملية النشر...',
    logBuild: 'جاري تجهيز الإصدار المحلي...',
    logUpload: 'جاري الرفع إلى GitHub...',
    logFinalize: 'إنهاء الإصدار وتحديث الحالة...',
    logSuccess: 'تم النشر بنجاح على GitHub.',
    logLoaded: 'تم تحميل بيانات المشروع الحالية.',
    logRefreshed: 'تم تحديث بيانات المشروع من المجلد الحالي.',
    logVersionFile: 'تم تحميل version.json الحالي.',
    logDraftSaved: 'تم حفظ التعديلات مباشرة داخل version.json.',
    logProjectChosen: 'تم اختيار مجلد المشروع.',
    logSettingsMissing: 'اختر مجلد المشروع وأدخل بيانات GitHub ثم حدث البيانات.',
    year: 'السنة',
    month: 'الشهر',
    day: 'اليوم',
  },
  en: {
    title: 'NetLink Windows Publisher',
    subtitle: 'Advanced Publishing and Version Management Platform',
    badge1: 'Publisher Console',
    badge2: 'GitHub Main Sync',
    section1: 'Project & GitHub Connection',
    projectFolder: 'Project Folder',
    chooseFolder: 'Choose Folder',
    repoUrl: 'GitHub Repository URL',
    githubUser: 'GitHub Username',
    githubToken: 'GitHub Token',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings were saved locally.',
    section2: 'Current Project Status',
    projectName: 'Project Name',
    repoRoot: 'Repository Root',
    frontendFolder: 'Frontend Folder',
    loadedVersion: 'Loaded Version',
    buildDate: 'Build Date',
    githubVersion: 'GitHub Version',
    section3: 'Release Data',
    versionNumber: 'Version Number',
    changelog: 'Changelog',
    updateData: 'Update Data',
    loadVersion: 'Load from version.json',
    publish: 'Publish to GitHub',
    section4: 'Execution Log',
    statusReady: 'Ready',
    statusPublishing: 'Publishing',
    statusError: 'Error',
    logPlaceholder: 'Waiting for operations to start...',
    clearLog: 'Clear Log',
    enterPin: 'Enter PIN',
    pinDescription: 'Please enter your PIN to confirm publishing to GitHub.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    invalidPin: 'Invalid PIN!',
    publishingProgress: 'Publishing...',
    logStartPublish: 'Starting publish process...',
    logBuild: 'Preparing local release files...',
    logUpload: 'Uploading to GitHub...',
    logFinalize: 'Finalizing release and refreshing status...',
    logSuccess: 'Published successfully to GitHub.',
    logLoaded: 'Loaded the current project data.',
    logRefreshed: 'Refreshed current project data.',
    logVersionFile: 'Loaded version.json from the current project.',
    logDraftSaved: 'Saved the current release fields into version.json.',
    logProjectChosen: 'Project folder was selected.',
    logSettingsMissing: 'Choose the project folder and fill GitHub settings, then refresh data.',
    year: 'Year',
    month: 'Month',
    day: 'Day',
  },
} as const;

type Lang = 'ar' | 'en';
type Theme = 'dark' | 'light';
type Status = 'ready' | 'publishing' | 'error';
type LogEntry = { id: number; time: string; msg: string; type: 'info' | 'success' | 'error' };
type ReleaseDateParts = { year: string; month: string; day: string };

const DEFAULT_SETTINGS: PublisherSettings = {
  projectPath: '',
  repoUrl: '',
  githubUser: '',
  githubToken: '',
};

function splitBuildDate(value?: string | null): ReleaseDateParts {
  const current = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
  const [year, month, day] = current.split('-');
  return { year, month, day };
}

function buildDateFromParts(parts: ReleaseDateParts): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<Theme>('dark');
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<Status>('ready');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [publishProgress, setPublishProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  const [settings, setSettings] = useState<PublisherSettings>(DEFAULT_SETTINGS);
  const [project, setProject] = useState<PublisherProjectState | null>(null);
  const [version, setVersion] = useState('');
  const [buildParts, setBuildParts] = useState<ReleaseDateParts>(splitBuildDate());
  const [changelogText, setChangelogText] = useState('');

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#111111' : '#F3F4F6';
  }, [theme]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [...prev, { id: logCounter.current++, time, msg, type }]);
  };

  const applyProjectState = (data: PublisherProjectState | null) => {
    setProject(data);
    if (data) {
      setVersion(data.loadedVersion || '');
      setBuildParts(splitBuildDate(data.buildDate));
      setChangelogText((data.changelog || []).join('\n'));
    }
  };

  const currentBuildDate = useMemo(() => buildDateFromParts(buildParts), [buildParts]);

  const getPublisherPayload = () => ({
    ...settings,
    version,
    buildDate: currentBuildDate,
    changelog: changelogText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  });

  const saveDraft = async (payload = getPublisherPayload()) => {
    if (!payload.projectPath || !payload.version || !payload.buildDate || payload.changelog.length === 0) {
      return;
    }

    try {
      const state = await window.netlinkPublisher.saveVersionDraft(payload);
      applyProjectState(state);
      addLog(t.logDraftSaved, 'info');
    } catch (error) {
      addLog(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const refreshProject = async (mode: 'refresh' | 'load' = 'refresh', nextSettings?: PublisherSettings) => {
    const effective = nextSettings || settings;
    if (!effective.projectPath) {
      addLog(t.logSettingsMissing, 'error');
      setStatus('error');
      return;
    }

    try {
      const state = mode === 'load'
        ? await window.netlinkPublisher.loadVersion(effective)
        : await window.netlinkPublisher.refreshProject(effective);
      applyProjectState(state);
      setStatus('ready');
      addLog(mode === 'load' ? t.logVersionFile : t.logRefreshed, 'info');
    } catch (error) {
      setStatus('error');
      addLog(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const initial = await window.netlinkPublisher.getInitialState();
        setSettings(initial.settings || DEFAULT_SETTINGS);
        applyProjectState(initial.project);
        addLog(initial.project ? t.logLoaded : t.logSettingsMissing, initial.project ? 'info' : 'error');
      } catch (error) {
        setStatus('error');
        addLog(error instanceof Error ? error.message : String(error), 'error');
      }
    };
    loadInitialState();
  }, []);

  const clearLogs = () => setLogs([]);

  const handleChooseFolder = async () => {
    try {
      const selected = await window.netlinkPublisher.chooseProjectFolder();
      if (!selected) return;
      const nextSettings = { ...settings, projectPath: selected };
      setSettings(nextSettings);
      addLog(t.logProjectChosen, 'info');
      await refreshProject('refresh', nextSettings);
    } catch (error) {
      setStatus('error');
      addLog(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await window.netlinkPublisher.saveSettings(settings);
      addLog(t.settingsSaved, 'success');
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      addLog(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handlePublishClick = () => {
    if (isPublishing) return;
    setShowPinModal(true);
    setPin('');
    setPinError('');
  };

  const startPublishing = async () => {
    setIsPublishing(true);
    setStatus('publishing');
    setPublishProgress(8);
    addLog(t.logStartPublish, 'info');

    try {
      await window.netlinkPublisher.saveSettings(settings);
      await saveDraft();
      setPublishProgress(28);
      addLog(t.logBuild, 'info');

      setPublishProgress(60);
      addLog(t.logUpload, 'info');
      const state = await window.netlinkPublisher.publishRelease(getPublisherPayload());

      setPublishProgress(92);
      addLog(t.logFinalize, 'info');
      applyProjectState(state);
      await refreshProject('refresh');

      setPublishProgress(100);
      setStatus('ready');
      addLog(t.logSuccess, 'success');
      window.setTimeout(() => setPublishProgress(0), 1500);
    } catch (error) {
      setStatus('error');
      setPublishProgress(0);
      addLog(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === '1993') {
      setShowPinModal(false);
      await startPublishing();
    } else {
      setPinError(t.invalidPin);
    }
  };

  const projectCards = [
    { label: t.projectName, value: project?.projectName || '-' },
    { label: t.repoRoot, value: project?.repoRoot || '-' },
    { label: t.frontendFolder, value: project?.frontendFolder || '-' },
    { label: t.loadedVersion, value: project?.loadedVersion ? `v${project.loadedVersion}` : '-', highlight: true },
    { label: t.buildDate, value: project?.buildDate || '-' },
    { label: t.githubVersion, value: project?.githubVersion ? `v${project.githubVersion}` : '-' },
  ];

  return (
    <div className={theme}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-neutral-100 dark:bg-[#111111] text-neutral-900 dark:text-neutral-100 p-4 md:p-6 font-sans transition-colors duration-200">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6 relative">
          
          {/* Header - Desktop App Style */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1C1C1C] p-5 rounded-xl border border-neutral-200 dark:border-[#2A2A2A] shadow-sm">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t.title}
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t.subtitle}</p>
              <div className="flex gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-[#2A2A2A] border border-neutral-200 dark:border-[#333] text-neutral-600 dark:text-neutral-300 text-xs font-medium flex items-center gap-1.5">
                  <Terminal size={12} />
                  {t.badge1}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/30 text-teal-600 dark:text-teal-400 text-xs font-medium flex items-center gap-1.5">
                  <Globe size={12} />
                  {t.badge2}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-lg bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#333] transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Language Toggle */}
              <div className="flex bg-neutral-100 dark:bg-[#2A2A2A] p-1 rounded-lg border border-neutral-200 dark:border-[#333]">
                <button 
                  onClick={() => setLang('ar')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-white dark:bg-[#444] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                >
                  العربية
                </button>
                <button 
                  onClick={() => setLang('en')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${lang === 'en' ? 'bg-white dark:bg-[#444] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                >
                  English
                </button>
              </div>
            </div>
          </header>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Section 1: Connection */}
              <section className="bg-white dark:bg-[#1C1C1C] rounded-xl p-6 border border-neutral-200 dark:border-[#2A2A2A] shadow-sm flex-1">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                  <Globe className="text-teal-500" size={20} />
                  {t.section1}
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.projectFolder}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.projectPath}
                        onChange={(e) => setSettings((prev) => ({ ...prev, projectPath: e.target.value }))}
                        onBlur={() => refreshProject('refresh')}
                        className="flex-1 bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 transition-colors"
                      />
                      <button onClick={handleChooseFolder} className="bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-neutral-300 dark:border-[#333]">
                        <Folder size={16} />
                        {t.chooseFolder}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.repoUrl}</label>
                      <input
                        type="text"
                        value={settings.repoUrl}
                        onChange={(e) => setSettings((prev) => ({ ...prev, repoUrl: e.target.value }))}
                        className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.githubUser}</label>
                      <input
                        type="text"
                        value={settings.githubUser}
                        onChange={(e) => setSettings((prev) => ({ ...prev, githubUser: e.target.value }))}
                        className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.githubToken}</label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={settings.githubToken}
                        onChange={(e) => setSettings((prev) => ({ ...prev, githubToken: e.target.value }))}
                        className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 transition-colors"
                      />
                      <button 
                        onClick={() => setShowToken(!showToken)}
                        className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors`}
                      >
                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button onClick={handleSaveSettings} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                      <Save size={16} />
                      {t.saveSettings}
                    </button>
                  </div>
                </div>
              </section>

              {/* Section 2: Status */}
              <section className="bg-white dark:bg-[#1C1C1C] rounded-xl p-6 border border-neutral-200 dark:border-[#2A2A2A] shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  {t.section2}
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {projectCards.map((item, i) => (
                    <div key={i} className="bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-[#333] rounded-lg p-3">
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs mb-1">{item.label}</p>
                      <p dir="ltr" className={`text-sm font-semibold text-left ${item.highlight ? 'text-teal-600 dark:text-teal-400' : 'text-neutral-900 dark:text-neutral-100'} font-mono`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 flex flex-col">
               {/* Section 3: Release Data */}
               <section className="bg-white dark:bg-[#1C1C1C] rounded-xl p-6 border border-neutral-200 dark:border-[#2A2A2A] shadow-sm flex-1 flex flex-col relative overflow-hidden">
                {/* Progress Bar Overlay */}
                {publishProgress > 0 && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-neutral-100 dark:bg-[#2A2A2A]">
                    <div 
                      className="h-full bg-violet-500 transition-all duration-300 ease-out"
                      style={{ width: `${publishProgress}%` }}
                    ></div>
                  </div>
                )}

                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                  <UploadCloud className="text-violet-500" size={20} />
                  {t.section3}
                </h2>
                
                <div className="space-y-5 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.versionNumber}</label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        onBlur={() => saveDraft()}
                        className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-2 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors font-mono"
                        disabled={isPublishing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.buildDate}</label>
                      <div className="flex gap-2" dir="ltr">
                        <div className="flex-1">
                          <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1 text-center">{t.year}</label>
                          <select value={buildParts.year} onChange={(e) => setBuildParts((prev) => ({ ...prev, year: e.target.value }))} onBlur={() => saveDraft()} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-2 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors font-mono appearance-none text-center" disabled={isPublishing}>
                            {Array.from({ length: 10 }, (_, i) => (2024 + i).toString()).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1 text-center">{t.month}</label>
                          <select value={buildParts.month} onChange={(e) => setBuildParts((prev) => ({ ...prev, month: e.target.value }))} onBlur={() => saveDraft()} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-2 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors font-mono appearance-none text-center" disabled={isPublishing}>
                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-neutral-500 dark:text-neutral-400 mb-1 text-center">{t.day}</label>
                          <select value={buildParts.day} onChange={(e) => setBuildParts((prev) => ({ ...prev, day: e.target.value }))} onBlur={() => saveDraft()} className="w-full bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-2 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors font-mono appearance-none text-center" disabled={isPublishing}>
                            {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{t.changelog}</label>
                    <textarea 
                      className="w-full flex-1 min-h-[160px] bg-neutral-50 dark:bg-[#111111] border border-neutral-300 dark:border-[#333] rounded-lg px-3 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors resize-none leading-relaxed"
                      value={changelogText}
                      onChange={(e) => setChangelogText(e.target.value)}
                      onBlur={() => saveDraft()}
                      disabled={isPublishing}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => refreshProject('refresh')} disabled={isPublishing} className="bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-200 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-neutral-300 dark:border-[#333] disabled:opacity-50 disabled:cursor-not-allowed">
                        <RefreshCw size={16} />
                        {t.updateData}
                      </button>
                      <button onClick={() => refreshProject('load')} disabled={isPublishing} className="bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-200 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-neutral-300 dark:border-[#333] disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileJson size={16} />
                        {t.loadVersion}
                      </button>
                    </div>
                    <button 
                      onClick={handlePublishClick}
                      disabled={isPublishing}
                      className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-semibold text-base transition-colors shadow-sm flex items-center justify-center gap-2 mt-1 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          {t.publishingProgress} {publishProgress}%
                        </>
                      ) : (
                        <>
                          <UploadCloud size={20} />
                          {t.publish}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Section 4: Execution Log */}
          <section className="bg-white dark:bg-[#1C1C1C] rounded-xl p-6 border border-neutral-200 dark:border-[#2A2A2A] shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Terminal className="text-neutral-500" size={20} />
                  {t.section4}
                </h2>
                <button 
                  onClick={clearLogs}
                  className="text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 text-xs font-medium bg-neutral-100 dark:bg-[#2A2A2A] px-2.5 py-1 rounded-md border border-neutral-200 dark:border-[#333]"
                >
                  <Trash2 size={14} />
                  {t.clearLog}
                </button>
              </div>
              
              <div className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold border ${
                status === 'ready' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                status === 'publishing' ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400' :
                'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
              }`}>
                {status === 'ready' && <CheckCircle2 size={14} />}
                {status === 'publishing' && <Loader2 size={14} className="animate-spin" />}
                {status === 'error' && <AlertCircle size={14} />}
                {status === 'ready' ? t.statusReady : status === 'publishing' ? t.statusPublishing : t.statusError}
              </div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-[#0A0A0A] rounded-lg border border-neutral-200 dark:border-[#2A2A2A] p-4 font-mono text-xs md:text-sm text-neutral-600 dark:text-neutral-400 h-48 overflow-y-auto flex flex-col gap-1.5">
              {logs.length === 0 ? (
                <div className="opacity-60">{t.logPlaceholder}</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`flex gap-2 ${
                    log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                    log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    <span className="opacity-50 shrink-0">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#333] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-violet-100 dark:bg-violet-500/20 p-2.5 rounded-xl text-violet-600 dark:text-violet-400">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{t.enterPin}</h3>
                </div>
                <button 
                  onClick={() => setShowPinModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">
                {t.pinDescription}
              </p>

              <form onSubmit={handlePinSubmit}>
                <div className="mb-6">
                  <input 
                    type="password" 
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className={`w-full bg-neutral-50 dark:bg-[#111111] border ${pinError ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 dark:border-[#333] focus:border-violet-500 dark:focus:border-violet-500'} rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-900 dark:text-neutral-100 focus:outline-none transition-colors font-mono`}
                    placeholder="••••"
                    maxLength={4}
                  />
                  {pinError && (
                    <p className="text-red-500 text-sm mt-2 text-center font-medium">{pinError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200 dark:hover:bg-[#333] text-neutral-700 dark:text-neutral-200 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    {t.confirm}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Copyright Footer */}
      <footer className="mt-auto py-6 text-center text-xs text-neutral-500 dark:text-neutral-500 border-t border-neutral-200 dark:border-[#2A2A2A] w-full max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-400">© {new Date().getFullYear()} NetLink. All rights reserved.</p>
          <p>Developed by Muhammad Rateb Jabarin (محمد راتب جبارين)</p>
          <div className="flex items-center gap-2 mt-1">
            <a href="https://aljabareen.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 transition-colors">aljabareen.com</a>
            <span>|</span>
            <a href="mailto:admin@aljabareen.com" className="hover:text-teal-500 transition-colors" dir="ltr">admin@aljabareen.com</a>
            <span>|</span>
            <span dir="ltr">+970597409040</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

