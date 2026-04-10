/**
 * © 2026 NetLink. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Settings, User, Network, Cpu, CreditCard, Users, Shield, Save, Key, Database, Server, Lock, Bell, Globe, Moon, Sun, Plus, Trash2, TrendingUp, RefreshCw, Clock, CheckCircle2, XCircle, DollarSign, Calendar, Percent, Eye, EyeOff, Mail, Send, Smartphone, ScanLine, Activity, MessageSquare, QrCode, ShieldCheck, Search, Download, Upload, Cloud, FileJson, FileSpreadsheet, ArchiveRestore, HardDrive, GitCompareArrows, Layers3, CircleHelp, ExternalLink } from 'lucide-react';
import { AppState, BackupDatasetId, BackupExportFormat, BackupHistoryItem, BackupRestorePreview, Currency, GatewayConfig, Permission, Role, SettingsCategoryId, TeamMember, WhatsAppStatus } from '../types';
import { dict } from '../dict';
import { formatNumber, normalizeDigits, parseNumericInput } from '../utils/format';
import { getGatewaysConfig, saveGatewaysConfig, getWhatsappStatus, restartWhatsappEngine, getNetworkConfig, saveNetworkConfig, testMikrotikConnection, BASE_URL, checkSystemUpdate, startSystemUpdate, testAiProvider, exportBackupDataset, getBackupOverview, previewRestoreArchive, restoreSystemBackup, runSystemBackup, saveBackupConfig, testGoogleDriveBackupConnection, toggleBackupHistoryProtection, deleteLocalBackupHistoryItem } from '../api';
import { hasPermission as canAccess } from '../permissions';
import { showAppToast, toastError, toastInfo, toastSuccess } from '../utils/notify';
import NumericInput from './NumericInput';
import DateInput from './DateInput';
import AppConfirmDialog from './AppConfirmDialog';
import AppPromptDialog from './AppPromptDialog';

interface SettingsTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type SettingsCategory = {
  id: SettingsCategoryId;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  permission?: Permission;
};

export default function SettingsTab({ state, setState }: SettingsTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  
  const hasPermission = (perm: Permission) => canAccess(state, perm);

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [gateways, setGateways] = useState<GatewayConfig | null>(null);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [aiTestingProviderId, setAiTestingProviderId] = useState<string | null>(null);
  const [smsTestNumber, setSmsTestNumber] = useState('');
  const [emailTestAddress, setEmailTestAddress] = useState('');
  const [isSmsPromptOpen, setIsSmsPromptOpen] = useState(false);
  const [isEmailPromptOpen, setIsEmailPromptOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [backupHistoryItemToDelete, setBackupHistoryItemToDelete] = useState<BackupHistoryItem | null>(null);
  const [backupOverview, setBackupOverview] = useState<{ history?: BackupHistoryItem[]; nextRunAt?: string | null; storage?: { localFileCount?: number; totalBytes?: number }; datasets?: Array<{ id: string; label: string; records: number }> } | null>(null);
  const [backupActionId, setBackupActionId] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupRestorePreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<'full' | 'selective'>('full');
  const [selectedRestoreDatasets, setSelectedRestoreDatasets] = useState<BackupDatasetId[]>([]);
  const [showBackupEncryptionPassword, setShowBackupEncryptionPassword] = useState(false);
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackupDataset, setSelectedBackupDataset] = useState<BackupDatasetId>('subscribers');
  const [selectedBackupFormat, setSelectedBackupFormat] = useState<BackupExportFormat>('xlsx');
  const [activeBackupHelpTopic, setActiveBackupHelpTopic] = useState<string | null>(null);
  const [isBackupGuideOpen, setIsBackupGuideOpen] = useState(false);

  const activeCategory = state.activeSettingsCategory;

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (activeCategory === 'gateways') {
      loadGatewaysOnce();
      interval = setInterval(loadWaStatusOnly, 3000);
    }

    if (activeCategory === 'backup') {
      loadBackupCenter();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCategory]);

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

  const resolveApiFileUrl = (relativeUrl: string) => (
    relativeUrl.startsWith('http') ? relativeUrl : `${BASE_URL.replace(/\/api$/, '')}${relativeUrl}`
  );

  const loadBackupCenter = async () => {
    try {
      const overview = await getBackupOverview();
      setBackupOverview(overview);
      if (overview?.config) {
        setState(prev => ({
          ...prev,
          backupSettings: {
            ...prev.backupSettings,
            ...overview.config,
            encryption: {
              ...prev.backupSettings.encryption,
              ...(overview.config.encryption || {}),
            },
            googleDrive: {
              ...prev.backupSettings.googleDrive,
              ...(overview.config.googleDrive || {}),
            },
          },
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر تحميل مركز النسخ الاحتياطي.' : 'Failed to load backup center.');
      toastError(message, isRTL ? 'خطأ في التحميل' : 'Load Failed');
    }
  };

  const waitForUpdatedVersionAndReload = (targetVersion?: string | null) => {
    const currentVersion = state.versionInfo.version;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if ((targetVersion && data.version === targetVersion) || (!targetVersion && data.version !== currentVersion)) {
            sessionStorage.setItem('sas4_update_success_toast', JSON.stringify({
              type: 'success',
              title: isRTL ? 'تم التحديث' : 'Update Completed',
              message: isRTL ? 'تم تحديث النظام بنجاح.' : 'The system was updated successfully.',
            }));
            window.location.reload();
            return;
          }
        }
      } catch {
        // Ignore transient downtime while the service restarts.
      }

      if (attempts >= 36) {
        sessionStorage.setItem('sas4_update_success_toast', JSON.stringify({
          type: 'success',
          title: isRTL ? 'اكتمل التحديث' : 'Update Finished',
          message: isRTL ? 'اكتملت عملية التحديث وسيتم تحميل الواجهة من جديد.' : 'The update process finished and the interface will reload now.',
        }));
        window.location.reload();
        return;
      }

      window.setTimeout(poll, 5000);
    };

    window.setTimeout(poll, 6000);
  };

  const handleSaveAllSettings = () => {
    localStorage.setItem('sas4_ai_settings', JSON.stringify(state.aiSettings));
    showAppToast({
      type: 'success',
      title: isRTL ? 'تم الحفظ' : 'Saved',
      message: isRTL ? 'تم حفظ الإعدادات محليًا.' : 'Settings saved locally.',
    });
  };

  const handleTestAiConnection = async (providerId: string) => {
    try {
      setAiTestingProviderId(providerId);
      const result = await testAiProvider({
        aiSettings: state.aiSettings,
        providerId,
        language: state.lang,
      });

      showAppToast({
        type: 'success',
        title: isRTL ? 'نجح الاتصال' : 'Connection Succeeded',
        message: isRTL
          ? `تم الاتصال بنجاح: ${result.provider?.name || providerId}`
          : `Connected successfully: ${result.provider?.name || providerId}`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : (isRTL ? 'خطأ غير معروف' : 'Unknown error');
      showAppToast({
        type: 'error',
        title: isRTL ? 'فشل الاتصال' : 'Connection Failed',
        message: isRTL ? `فشل الاتصال: ${message}` : `Connection failed: ${message}`,
      });
    } finally {
      setAiTestingProviderId(null);
    }
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
          latestBuildDate: hasUpdate ? payload.buildDate || null : null,
          latestChangelog: hasUpdate ? payload.changelog || [] : [],
          checking: false,
          error: undefined
        }
      }));

      if (!hasUpdate) {
        showAppToast({
          type: 'info',
          title: isRTL ? 'لا يوجد تحديث' : 'No Update',
          message: t.settings.update.upToDate,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isRTL ? 'فشل التحقق من التحديثات' : 'Failed to check for updates');
      setState(prev => ({ 
        ...prev, 
        updateStatus: { ...prev.updateStatus, checking: false, error: message } 
      }));
    }
  };

  const handleUpdateSystem = async () => {
    if (!state.updateStatus.hasUpdate) return;
    const targetVersion = state.updateStatus.latestVersion;
    setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: true } }));
    
    try {
      const result = await startSystemUpdate();
      setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: false } }));
      showAppToast({
        type: 'info',
        title: isRTL ? 'بدأ التحديث' : 'Update Started',
        message: result.message || (isRTL ? 'بدأ التحديث. ستتم إعادة تحميل الصفحة تلقائياً بعد اكتمال التثبيت.' : 'Update started. The page will refresh automatically after installation.'),
        duration: 4500,
      });
      waitForUpdatedVersionAndReload(targetVersion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setState(prev => ({ ...prev, updateStatus: { ...prev.updateStatus, checking: false, error: message } }));
      showAppToast({
        type: 'error',
        title: isRTL ? 'فشل التحديث' : 'Update Failed',
        message: message || (isRTL ? 'فشلت عملية التحديث.' : 'The update process failed.'),
      });
    }
  };

  const handleSaveGateways = async () => {
    const success = await saveGatewaysConfig(gateways);
    if (success) {
      toastSuccess(isRTL ? 'تم حفظ إعدادات البوابات بنجاح.' : 'Gateway settings were saved successfully.', isRTL ? 'تم الحفظ' : 'Saved');
    } else {
      toastError(isRTL ? 'تعذر حفظ إعدادات البوابات.' : 'Failed to save gateway settings.', isRTL ? 'فشل الحفظ' : 'Save Failed');
    }
  };

  const handleSmsGatewayTest = async () => {
    if (!smsTestNumber.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: smsTestNumber, text: 'Test NetLink API' })
      });
      if (res.ok) {
        toastSuccess(isRTL ? 'تم إرسال رسالة الاختبار بنجاح.' : 'Test SMS sent successfully.', isRTL ? 'نجح الاختبار' : 'Test Sent');
        setIsSmsPromptOpen(false);
        setSmsTestNumber('');
      } else {
        toastError(isRTL ? 'فشل اختبار بوابة SMS.' : 'SMS gateway test failed.', isRTL ? 'تعذر الاختبار' : 'Test Failed');
      }
    } catch {
      toastError(isRTL ? 'حدث خطأ أثناء الاتصال ببوابة SMS.' : 'An error occurred while connecting to the SMS gateway.', isRTL ? 'خطأ في الاتصال' : 'Connection Error');
    }
  };

  const handleEmailGatewayTest = async () => {
    if (!emailTestAddress.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [emailTestAddress], text: 'Test Email from NetLink API', subject: 'NetLink Connectivity Test' })
      });
      if (res.ok) {
        toastSuccess(isRTL ? 'تم إرسال رسالة البريد التجريبية بنجاح.' : 'Test email sent successfully.', isRTL ? 'نجح الاختبار' : 'Test Sent');
        setIsEmailPromptOpen(false);
        setEmailTestAddress('');
      } else {
        const data = await res.json();
        toastError(isRTL ? `فشل الإرسال: ${data.error || 'تأكد من صحة إعدادات البوابة'}` : `Failed: ${data.error || 'Check gateway configs'}`, isRTL ? 'تعذر الإرسال' : 'Send Failed');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : (isRTL ? 'خطأ غير معروف' : 'Unknown error');
      toastError(isRTL ? `خطأ في الاتصال: ${message}` : `Connection error: ${message}`, isRTL ? 'خطأ في الاتصال' : 'Connection Error');
    }
  };

  const handleDeleteTeamMember = () => {
    if (!memberToDelete) return;
    setState(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== memberToDelete.id)
    }));
    setMemberToDelete(null);
    toastSuccess(isRTL ? 'تم حذف المستخدم من الفريق.' : 'The user was removed from the team.', isRTL ? 'تم الحذف' : 'User Removed');
  };

  const handleSaveBackupSettings = async () => {
    if (state.backupSettings.encryption.enabled && !state.backupSettings.encryption.password.trim()) {
      toastInfo(
        isRTL ? 'أدخل كلمة مرور التشفير قبل حفظ الإعدادات.' : 'Enter a backup encryption password before saving.',
        isRTL ? 'كلمة المرور مطلوبة' : 'Password Required'
      );
      return;
    }

    if (state.backupSettings.encryption.enabled && state.backupSettings.encryption.password.trim().length < 8) {
      toastInfo(
        isRTL ? 'كلمة مرور التشفير يجب أن تكون 8 أحرف على الأقل.' : 'Backup encryption password must be at least 8 characters long.',
        isRTL ? 'كلمة المرور قصيرة' : 'Password Too Short'
      );
      return;
    }

    try {
      setBackupActionId('save-backup-settings');
      await saveBackupConfig(state.backupSettings);
      await loadBackupCenter();
      toastSuccess(isRTL ? 'تم حفظ إعدادات النسخ الاحتياطي والاستعادة.' : 'Backup and recovery settings were saved successfully.', isRTL ? 'تم الحفظ' : 'Saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر حفظ إعدادات النسخ الاحتياطي.' : 'Failed to save backup settings.');
      toastError(message, isRTL ? 'فشل الحفظ' : 'Save Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleRunBackup = async (uploadToDrive = false) => {
    try {
      setBackupActionId(uploadToDrive ? 'run-backup-drive' : 'run-backup-local');
      const result = await runSystemBackup({ uploadToDrive, trigger: 'manual' });
      await loadBackupCenter();
      toastSuccess(
        uploadToDrive
          ? (isRTL ? 'تم إنشاء النسخة الاحتياطية ورفعها إلى Google Drive.' : 'Backup created and uploaded to Google Drive.')
          : (isRTL ? 'تم إنشاء النسخة الاحتياطية الكاملة بنجاح.' : 'Full system backup was created successfully.'),
        isRTL ? 'اكتمل النسخ' : 'Backup Completed'
      );
      if (result?.downloadUrl) {
        window.open(resolveApiFileUrl(result.downloadUrl), '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر إنشاء النسخة الاحتياطية.' : 'Failed to create backup.');
      toastError(message, isRTL ? 'فشل النسخ' : 'Backup Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleExportDataset = async () => {
    if (state.backupSettings.encryption.applyToExports && (!state.backupSettings.encryption.enabled || !state.backupSettings.encryption.password.trim())) {
      toastInfo(
        isRTL ? 'فعّل تشفير النسخ الرئيسية وأدخل كلمة المرور أولًا حتى يتم تشفير ملف التصدير.' : 'Enable backup encryption and set a password first to encrypt export files.',
        isRTL ? 'التشفير غير جاهز' : 'Encryption Not Ready'
      );
      return;
    }

    try {
      setBackupActionId('export-dataset');
      const result = await exportBackupDataset({
        dataset: selectedBackupDataset,
        format: selectedBackupFormat,
        encrypt: state.backupSettings.encryption.applyToExports,
      });
      await loadBackupCenter();
      toastSuccess(
        state.backupSettings.encryption.applyToExports
          ? (isRTL ? 'تم تجهيز ملف التصدير المشفّر بنجاح.' : 'Encrypted export file prepared successfully.')
          : (isRTL ? 'تم تجهيز ملف التصدير بنجاح.' : 'Export file prepared successfully.'),
        isRTL ? 'نجح التصدير' : 'Export Ready'
      );
      if (result?.downloadUrl) {
        window.open(resolveApiFileUrl(result.downloadUrl), '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر تصدير البيانات.' : 'Failed to export data.');
      toastError(message, isRTL ? 'فشل التصدير' : 'Export Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleTestBackupDrive = async () => {
    try {
      setBackupActionId('test-drive');
      const result = await testGoogleDriveBackupConnection(state.backupSettings.googleDrive);
      setState(prev => ({
        ...prev,
        backupSettings: {
          ...prev.backupSettings,
          googleDrive: {
            ...prev.backupSettings.googleDrive,
            connectionStatus: 'connected',
            connectionMessage: result?.message || (isRTL ? 'تم الاتصال بنجاح.' : 'Connected successfully.'),
          },
        },
      }));
      await loadBackupCenter();
      toastSuccess(result?.message || (isRTL ? 'تم ربط Google Drive بنجاح.' : 'Google Drive connected successfully.'), isRTL ? 'تم الربط' : 'Connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر الاتصال بـ Google Drive.' : 'Failed to connect to Google Drive.');
      setState(prev => ({
        ...prev,
        backupSettings: {
          ...prev.backupSettings,
          googleDrive: {
            ...prev.backupSettings.googleDrive,
            connectionStatus: 'error',
            connectionMessage: message,
          },
        },
      }));
      toastError(message, isRTL ? 'فشل الاتصال' : 'Connection Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handlePreviewBackupRestore = async () => {
    if (!restoreFile) {
      toastInfo(isRTL ? 'اختر ملف نسخة احتياطية أولًا.' : 'Select a backup file first.', isRTL ? 'ملف مطلوب' : 'File Required');
      return;
    }

    try {
      setBackupActionId('preview-restore');
      const preview = await previewRestoreArchive(restoreFile, restorePassword);
      setRestorePreview(preview);
      setSelectedRestoreDatasets(preview.datasetDiffs.filter(item => item.availableInArchive).map(item => item.id));
      if (preview.requiresPassword) {
        toastInfo(
          isRTL ? 'هذه النسخة مشفرة. أدخل كلمة المرور ثم أعد التحليل لعرض المقارنة.' : 'This archive is encrypted. Enter the password and analyze again to unlock the comparison.',
          isRTL ? 'نسخة مشفرة' : 'Encrypted Archive'
        );
      } else {
        toastSuccess(isRTL ? 'تم تحليل النسخة الاحتياطية وعرض المقارنة.' : 'Backup archive analyzed and comparison is ready.', isRTL ? 'المعاينة جاهزة' : 'Preview Ready');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر معاينة النسخة الاحتياطية.' : 'Failed to preview backup archive.');
      setRestorePreview(null);
      setSelectedRestoreDatasets([]);
      toastError(message, isRTL ? 'فشل التحليل' : 'Preview Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restorePreview?.previewToken) {
      toastInfo(isRTL ? 'قم أولًا بتحليل ملف النسخة الاحتياطية قبل الاسترجاع.' : 'Preview the backup archive before restoring.', isRTL ? 'المعاينة مطلوبة' : 'Preview Required');
      return;
    }

    if (restoreMode === 'selective' && selectedRestoreDatasets.length === 0) {
      toastInfo(isRTL ? 'اختر جدولًا واحدًا على الأقل للاستعادة الانتقائية.' : 'Select at least one dataset for selective restore.', isRTL ? 'تحديد مطلوب' : 'Selection Required');
      return;
    }

    try {
      setBackupActionId('restore-backup');
      await restoreSystemBackup({
        previewToken: restorePreview.previewToken,
        mode: restoreMode,
        datasets: restoreMode === 'selective' ? selectedRestoreDatasets : [],
        password: restorePassword,
      });
      setRestoreFile(null);
      setRestorePreview(null);
      setSelectedRestoreDatasets([]);
      setRestoreMode('full');
      await loadBackupCenter();
      toastSuccess(
        restoreMode === 'selective'
          ? (isRTL ? 'تمت الاستعادة الانتقائية بنجاح. قم بتحديث الصفحة لتحميل البيانات المستعادة.' : 'Selective restore completed successfully. Refresh the page to load restored data.')
          : (isRTL ? 'تمت استعادة النظام بنجاح. قم بتحديث الصفحة لتحميل البيانات المستعادة.' : 'System restore completed successfully. Refresh the page to load restored data.'),
        isRTL ? 'اكتملت الاستعادة' : 'Restore Completed'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذرت استعادة النسخة الاحتياطية.' : 'Failed to restore backup.');
      toastError(message, isRTL ? 'فشل الاستعادة' : 'Restore Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleToggleBackupProtection = async (item: BackupHistoryItem) => {
    try {
      setBackupActionId(`protect-${item.id}`);
      await toggleBackupHistoryProtection(item.id, !item.isProtected);
      await loadBackupCenter();
      toastSuccess(
        !item.isProtected
          ? (isRTL ? 'تمت حماية النسخة من الحذف التلقائي.' : 'The backup is now protected from automatic deletion.')
          : (isRTL ? 'تم إلغاء حماية النسخة وإعادتها لسياسة الاحتفاظ التلقائي.' : 'The backup protection was removed and retention policy applies again.'),
        isRTL ? 'تم تحديث الحماية' : 'Protection Updated'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر تحديث حالة حماية النسخة.' : 'Failed to update backup protection.');
      toastError(message, isRTL ? 'فشل التحديث' : 'Update Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const handleDeleteBackupHistoryItem = async () => {
    if (!backupHistoryItemToDelete) return;

    try {
      setBackupActionId(`delete-${backupHistoryItemToDelete.id}`);
      await deleteLocalBackupHistoryItem(backupHistoryItemToDelete.id);
      setBackupHistoryItemToDelete(null);
      await loadBackupCenter();
      toastSuccess(
        isRTL ? 'تم حذف النسخة الاحتياطية المحلية من التخزين والسجل.' : 'The local backup was deleted from storage and history.',
        isRTL ? 'تم الحذف' : 'Deleted'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRTL ? 'تعذر حذف النسخة الاحتياطية المحلية.' : 'Failed to delete the local backup.');
      toastError(message, isRTL ? 'فشل الحذف' : 'Delete Failed');
    } finally {
      setBackupActionId(null);
    }
  };

  const categories = useMemo<SettingsCategory[]>(() => [
    { id: 'profile', icon: User, label: t.settings.categories.profile },
    { id: 'gateways', icon: Send, label: isRTL ? 'إدارة البوابات' : 'Gateways', permission: 'manage_team' as Permission },
    { id: 'ai', icon: Cpu, label: t.settings.categories.ai, permission: 'manage_ai' as Permission },
    { id: 'billing', icon: CreditCard, label: t.settings.categories.billing, permission: 'view_billing' as Permission },
    { id: 'investors', icon: TrendingUp, label: t.settings.categories.investors, permission: 'view_investors' as Permission },
    { id: 'backup', icon: Database, label: t.settings.categories.backup, permission: 'perform_backup' as Permission },
    { id: 'team', icon: Users, label: t.settings.categories.team, permission: 'manage_team' as Permission },
    { id: 'security', icon: Shield, label: t.settings.categories.security, permission: 'view_security' as Permission },
    { id: 'about', icon: Activity, label: t.settings.categories.about },
  ].filter(cat => !cat.permission || hasPermission(cat.permission)), [hasPermission, isRTL, t.settings.categories]);

  React.useEffect(() => {
    if (!categories.some((category) => category.id === activeCategory)) {
      setState(prev => ({ ...prev, activeSettingsCategory: categories[0]?.id || 'profile' }));
    }
  }, [activeCategory, categories, setState]);

  const activeCategoryMeta = categories.find((category) => category.id === activeCategory);
  const backupHistory = backupOverview?.history || [];
  const backupDatasets = useMemo<Array<{ id: BackupDatasetId; label: string }>>(() => ([
    { id: 'subscribers', label: isRTL ? 'جدول المشتركين' : 'Subscribers Table' },
    { id: 'investors', label: isRTL ? 'جدول المستثمرين' : 'Investors Table' },
    { id: 'suppliers', label: isRTL ? 'جدول الموردين' : 'Suppliers Table' },
    { id: 'managers', label: isRTL ? 'جدول المدراء' : 'Managers Table' },
    { id: 'directors', label: isRTL ? 'جدول المديرين' : 'Directors Table' },
    { id: 'deputies', label: isRTL ? 'جدول النواب' : 'Deputies Table' },
    { id: 'iptv', label: isRTL ? 'جدول IPTV' : 'IPTV Table' },
    { id: 'profiles', label: isRTL ? 'ملفات البروفايلات' : 'Profiles File' },
    { id: 'all_tables', label: isRTL ? 'كل الجداول دفعة واحدة' : 'All Tables Bundle' },
  ]), [isRTL]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return isRTL ? '0 بايت' : '0 B';
    if (bytes < 1024) return `${bytes} ${isRTL ? 'بايت' : 'B'}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${isRTL ? 'ك.ب' : 'KB'}`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${isRTL ? 'م.ب' : 'MB'}`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${isRTL ? 'ج.ب' : 'GB'}`;
  };

  const backupHelpTopics = useMemo<Record<string, { title: string; summary: string; details: string[] }>>(() => ({
    overview: {
      title: isRTL ? 'ما هو مركز النسخ الاحتياطي؟' : 'What Is The Backup Center?',
      summary: isRTL ? 'هذا المركز هو لوحة التحكم الكاملة لكل ما يتعلق بحماية بيانات النظام واستعادتها ونقلها.' : 'This center is the master control panel for protecting, restoring, and transferring system data.',
      details: isRTL
        ? ['ينشئ نسخة كاملة للنظام عند الطلب أو حسب الجدولة.', 'يصدر الجداول بصيغ متعددة للاحتفاظ أو التحليل.', 'يرفع النسخ إلى Google Drive عند تفعيل الربط.', 'يعرض سجلًا واضحًا لكل عملية نسخ أو استعادة أو تصدير.']
        : ['Creates full system backups on demand or on schedule.', 'Exports datasets in multiple formats for storage or analysis.', 'Uploads backups to Google Drive when integration is enabled.', 'Shows a clear history for every backup, restore, and export action.'],
    },
    retention: {
      title: isRTL ? 'ما معنى عدد النسخ المحتفظ بها؟' : 'What Is Retention Count?',
      summary: isRTL ? 'هو العدد الأقصى للنسخ التلقائية التي يحتفظ بها النظام قبل حذف الأقدم منها.' : 'It is the maximum number of automatic backups the system keeps before deleting older ones.',
      details: isRTL
        ? ['إذا كان الرقم 14 فسيحتفظ النظام بأحدث 14 نسخة غير محمية.', 'النسخ التي تقوم بحمايتها من السجل لن تُحذف تلقائيًا.', 'كلما زاد العدد زادت المساحة المطلوبة في التخزين المحلي أو السحابي.']
        : ['If the value is 14, the system keeps the latest 14 unprotected backups.', 'Backups you protect in history are excluded from automatic cleanup.', 'Higher values require more local or cloud storage space.'],
    },
    schedule: {
      title: isRTL ? 'كيف تعمل الجدولة التلقائية؟' : 'How Does Auto Scheduling Work?',
      summary: isRTL ? 'الجدولة تجعل النظام ينشئ النسخة الاحتياطية تلقائيًا حسب التكرار والوقت المحددين.' : 'Scheduling makes the system create backups automatically based on the selected frequency and time.',
      details: isRTL
        ? ['يمكنك الاختيار بين يومي أو أسبوعي أو شهري.', 'وقت التنفيذ يحدد متى يحاول النظام إنشاء النسخة.', 'يُفضّل اختيار وقت يكون فيه ضغط الاستخدام منخفضًا.']
        : ['You can choose daily, weekly, or monthly scheduling.', 'The scheduled time defines when the system attempts the backup.', 'It is best to choose a time with low usage traffic.'],
    },
    compression: {
      title: isRTL ? 'ما معنى مستوى الضغط؟' : 'What Is Compression Level?',
      summary: isRTL ? 'يحدد مستوى الضغط التوازن بين سرعة إنشاء النسخة وحجم الملف النهائي.' : 'It controls the balance between backup speed and final archive size.',
      details: isRTL
        ? ['السريع ينشئ النسخة أسرع لكن بحجم أكبر قليلًا.', 'المتوازن مناسب لمعظم الحالات.', 'أقصى ضغط يقلل الحجم أكثر لكنه قد يستغرق وقتًا أطول.']
        : ['Fast creates backups faster but with slightly larger files.', 'Balanced is suitable for most cases.', 'Maximum compression reduces size more but may take longer.'],
    },
    verify: {
      title: isRTL ? 'ما معنى التحقق بعد الإنشاء؟' : 'What Is Verify After Backup?',
      summary: isRTL ? 'يجعل النظام يتأكد بعد إنشاء النسخة أن الملف الناتج صالح ويمكن الاعتماد عليه.' : 'It makes the system verify that the generated backup file is valid after creation.',
      details: isRTL
        ? ['مفيد جدًا إذا كانت النسخة مهمة أو ستعتمد عليها في الطوارئ.', 'قد يزيد وقت العملية قليلًا لكنه يرفع الثقة في النتيجة.', 'يُنصح بتفعيله في البيئات الحساسة.']
        : ['Very useful when the backup is important or intended for emergencies.', 'It adds a little time but increases confidence in the result.', 'Recommended for sensitive environments.'],
    },
    restorePoint: {
      title: isRTL ? 'ما هي نقطة الاستعادة قبل الاسترجاع؟' : 'What Is Restore Point Before Restore?',
      summary: isRTL ? 'هي نسخة أمان ينشئها النظام تلقائيًا قبل تنفيذ الاستعادة، حتى يمكنك الرجوع إذا لم تعجبك النتيجة.' : 'It is a safety snapshot created automatically before restore so you can roll back if needed.',
      details: isRTL
        ? ['مهمة جدًا قبل الاستعادة الكاملة.', 'تحميك إذا تبين أن الملف القديم غير مناسب.', 'تستهلك مساحة إضافية لكن فائدتها كبيرة.']
        : ['Very important before a full restore.', 'Protects you if the old archive turns out to be unsuitable.', 'Consumes extra space but is highly valuable.'],
    },
    uploads: {
      title: isRTL ? 'ما معنى تضمين ملفات الرفع؟' : 'What Does Include Uploads Mean?',
      summary: isRTL ? 'يجعل النسخة تشمل الملفات المرفوعة أو الأصول المساندة المرتبطة بالنظام.' : 'It makes the backup include uploaded files or supporting assets related to the system.',
      details: isRTL
        ? ['فعّلها إذا كان لديك صور أو ملفات مرفوعة مهمة.', 'قد تزيد حجم النسخة بشكل ملحوظ.', 'إذا لم تكن تستخدم ملفات مرفوعة كثيرًا يمكن تركها حسب الحاجة.']
        : ['Enable it if uploaded images or assets are important.', 'It can increase backup size significantly.', 'If uploads are not important in your setup, keep it based on your need.'],
    },
    drive: {
      title: isRTL ? 'ما فائدة ربط Google Drive؟' : 'Why Connect Google Drive?',
      summary: isRTL ? 'للاحتفاظ بنسخة خارج الجهاز بحيث تبقى البيانات آمنة حتى لو تعطل الخادم المحلي.' : 'It stores an off-device copy so data remains safe even if the local server fails.',
      details: isRTL
        ? ['يمكن رفع النسخة تلقائيًا بعد كل عملية نسخ.', 'يمكن استخدامه كنسخة احتياطية خارجية للطوارئ.', 'يحتاج إلى بيانات OAuth صحيحة وFolder ID مناسب.']
        : ['It can upload each backup automatically after creation.', 'It serves as an external emergency recovery copy.', 'It requires valid OAuth credentials and a correct folder ID.'],
    },
    encryption: {
      title: isRTL ? 'ما فائدة تشفير النسخ الاحتياطية؟' : 'Why Encrypt Backups?',
      summary: isRTL ? 'التشفير يمنع أي شخص من قراءة النسخة أو استعادتها دون كلمة المرور الصحيحة.' : 'Encryption prevents anyone from reading or restoring the archive without the correct password.',
      details: isRTL
        ? ['احفظ كلمة المرور في مكان آمن جدًا.', 'إذا فُقدت كلمة المرور فلن يمكن فتح النسخة المشفرة.', 'يمكن أيضًا تطبيق نفس الحماية على ملفات التصدير.']
        : ['Store the password in a very safe place.', 'If the password is lost, the encrypted archive cannot be opened.', 'The same protection can also be applied to exported files.'],
    },
    export: {
      title: isRTL ? 'ما هو مركز تصدير الجداول؟' : 'What Is The Dataset Export Center?',
      summary: isRTL ? 'يسمح لك بتنزيل جدول واحد أو كل الجداول بصيغ مناسبة للأرشفة أو التقارير أو النقل بين الأنظمة.' : 'It lets you download one dataset or all datasets in formats suitable for archival, reporting, or transfer.',
      details: isRTL
        ? ['JSON مناسب للأنظمة والنسخ البرمجية.', 'CSV وXLSX مناسبين للإكسل والتحليل.', 'ZIP مناسب لتجميع عدة ملفات في تنزيل واحد.']
        : ['JSON is best for systems and structured archival.', 'CSV and XLSX are ideal for Excel and analytics.', 'ZIP is useful when you want multiple files in one download.'],
    },
    exportFormat: {
      title: isRTL ? 'كيف أختار صيغة التصدير؟' : 'How Do I Choose Export Format?',
      summary: isRTL ? 'اختيار الصيغة يعتمد على هدفك: أرشفة، تحليل، مشاركة، أو نقل إلى نظام آخر.' : 'The format depends on whether your goal is archival, analysis, sharing, or moving to another system.',
      details: isRTL
        ? ['JSON للنسخ البرمجية والتكامل مع الأنظمة.', 'CSV وXLSX للتحليل والتقارير والإكسل.', 'ZIP عندما تريد تنزيلًا واحدًا يحتوي عدة ملفات.']
        : ['JSON for structured archival and integrations.', 'CSV and XLSX for analytics, reports, and Excel.', 'ZIP when you want one download containing multiple files.'],
    },
    archiveFile: {
      title: isRTL ? 'ما هو ملف النسخة الاحتياطية المطلوب هنا؟' : 'What Backup Archive File Should I Upload Here?',
      summary: isRTL ? 'هذا هو الملف الذي سبق أن أنشأته من النظام أو حملته من السجل أو من Google Drive.' : 'This is the archive you previously created from the system or downloaded from history or Google Drive.',
      details: isRTL
        ? ['يمكن أن يكون ZIP عاديًا أو NBK مشفرًا.', 'بعد رفعه سيقوم النظام بتحليله قبل الاستعادة.', 'إذا كان الملف مشفرًا أدخل كلمة المرور الصحيحة أولًا.']
        : ['It can be a normal ZIP file or an encrypted NBK archive.', 'After upload, the system analyzes it before restoring.', 'If it is encrypted, enter the correct password first.'],
    },
    backupPassword: {
      title: isRTL ? 'متى أحتاج كلمة مرور النسخة؟' : 'When Do I Need The Backup Password?',
      summary: isRTL ? 'تحتاجها فقط إذا كانت النسخة التي تحاول فتحها أو استعادتها مشفرة.' : 'You only need it if the archive you are trying to preview or restore is encrypted.',
      details: isRTL
        ? ['إذا كانت النسخة غير مشفرة يمكنك ترك الحقل فارغًا.', 'إذا كانت كلمة المرور خاطئة فلن تظهر المقارنة أو لن تنجح الاستعادة.', 'احتفظ بكلمة المرور في مكان آمن لأن فقدانها يعني فقدان الوصول للنسخة المشفرة.']
        : ['If the archive is not encrypted, you can leave the field empty.', 'If the password is wrong, preview and restore will fail.', 'Store the password safely because losing it means losing access to the encrypted archive.'],
    },
    restore: {
      title: isRTL ? 'كيف تعمل المعاينة والاستعادة؟' : 'How Do Preview And Restore Work?',
      summary: isRTL ? 'ترفع الملف أولًا، ثم يفحصه النظام ويعرض مقارنة واضحة قبل تنفيذ الاستعادة.' : 'You upload the archive first, then the system analyzes it and shows a clear comparison before restoring.',
      details: isRTL
        ? ['الاستعادة الكاملة تستبدل بيانات النظام بالكامل.', 'الاستعادة الانتقائية تعيد فقط الجداول التي تختارها.', 'إذا كانت النسخة مشفرة فستحتاج كلمة المرور أولًا.']
        : ['A full restore replaces the entire system data.', 'A selective restore restores only the datasets you choose.', 'If the archive is encrypted, the password is required first.'],
    },
    history: {
      title: isRTL ? 'ما فائدة سجل النسخ والاستعادة؟' : 'Why Is The Backup History Important?',
      summary: isRTL ? 'السجل هو المكان الذي تراجع منه كل ما تم إنشاؤه أو استعادته أو تصديره مع التاريخ والحجم والحالة.' : 'History is where you review everything that was created, restored, or exported along with date, size, and status.',
      details: isRTL
        ? ['يمكنك تنزيل الملفات القديمة منه مباشرة.', 'يمكنك معرفة هل الملف مشفر أم لا.', 'يمكنك حماية بعض النسخ من الحذف التلقائي من هذا السجل.']
        : ['You can download older files directly from it.', 'You can see whether an archive is encrypted or not.', 'You can protect selected backups from automatic deletion here.'],
    },
    protect: {
      title: isRTL ? 'ما معنى حماية النسخة من الحذف التلقائي؟' : 'What Does Protect From Auto Delete Mean?',
      summary: isRTL ? 'هذه الميزة تجعل النسخة المختارة تبقى محفوظة حتى لو تجاوزت سياسة الاحتفاظ التلقائي.' : 'This feature keeps the selected backup محفوظة even if it exceeds the automatic retention policy.',
      details: isRTL
        ? ['استخدمها للنسخ المهمة قبل تحديث كبير أو قبل عملية استعادة.', 'النسخة المحمية تبقى في التخزين المحلي حتى تلغي الحماية أو تحذفها يدويًا.', 'يُفضّل عدم حماية عدد كبير جدًا من النسخ حتى لا تمتلئ المساحة.']
        : ['Use it for important backups before major updates or restores.', 'A protected backup stays in local storage until you unprotect or delete it manually.', 'Avoid protecting too many backups to prevent storage exhaustion.'],
    },
  }), [isRTL]);

  const backupGuideSections = useMemo<Array<{ title: string; content: string[] }>>(() => ([
    {
      title: isRTL ? '1. ما هو هذا النظام؟' : '1. What Is This System?',
      content: isRTL
        ? ['مركز النسخ الاحتياطي هو المكان الذي تنشئ منه نسخًا كاملة للنظام، تصدر البيانات، ترفعها إلى Google Drive، وتستعيدها عند الحاجة.', 'تم تصميمه للمبتدئين أيضًا، لذلك كل خطوة فيه تهدف إلى تقليل المخاطرة قبل أي استعادة أو حذف تلقائي.']
        : ['The backup center is where you create full system backups, export data, upload archives to Google Drive, and restore when needed.', 'It is also designed for beginners, so every step aims to reduce risk before restore or automatic cleanup.'],
    },
    {
      title: isRTL ? '2. متى أستخدم النسخة الكاملة؟' : '2. When Should I Use A Full Backup?',
      content: isRTL
        ? ['قبل أي تحديث كبير للنظام.', 'قبل نقل النظام إلى خادم جديد.', 'قبل تنفيذ استعادة لبيانات قديمة.', 'عندما تريد نقطة أمان يمكنك الرجوع لها بسرعة.']
        : ['Before any major system update.', 'Before moving the system to a new server.', 'Before restoring older data.', 'When you want a safe rollback point.'],
    },
    {
      title: isRTL ? '3. كيف أبدأ كمبتدئ؟' : '3. How Should A Beginner Start?',
      content: isRTL
        ? ['فعّل المركز والجدولة التلقائية.', 'اختر وقتًا مناسبًا ليلًا.', 'اجعل عدد النسخ المحتفظ بها مناسبًا لمساحة الخادم.', 'أنشئ نسخة محلية كاملة يدويًا أولًا وتأكد من ظهورها في السجل.', 'بعد ذلك فعّل Google Drive إذا أردت نسخة خارجية.']
        : ['Enable the backup center and auto scheduling.', 'Choose a suitable nighttime schedule.', 'Set a retention count that fits your storage space.', 'Create one manual local full backup first and confirm it appears in history.', 'Then enable Google Drive if you need an off-site copy.'],
    },
    {
      title: isRTL ? '4. ما الفرق بين التصدير والنسخة الكاملة؟' : '4. What Is The Difference Between Export And Full Backup?',
      content: isRTL
        ? ['النسخة الكاملة تحفظ النظام كاملًا مع بنيته للاستعادة الشاملة.', 'التصدير مخصص لجداول محددة أو ملفات بيانات تريد تنزيلها أو تحليلها أو نقلها.', 'لا تستخدم التصدير بدل النسخة الكاملة إذا كان هدفك تعافي النظام بالكامل بعد عطل.']
        : ['A full backup stores the complete system for full recovery.', 'Export is meant for selected datasets you want to download, analyze, or transfer.', 'Do not rely on exports alone if your goal is full system disaster recovery.'],
    },
    {
      title: isRTL ? '5. كيف أحمي نسخة مهمة؟' : '5. How Do I Protect An Important Backup?',
      content: isRTL
        ? ['من سجل النسخ والاستعادة، فعّل الحماية للنسخة المهمة.', 'النسخة المحمية لا تدخل في الحذف التلقائي ضمن سياسة الاحتفاظ.', 'استخدم هذه الميزة فقط للنسخ المهمة حتى لا تمتلئ المساحة.']
        : ['From the backup history, enable protection on the important backup.', 'Protected backups are excluded from automatic cleanup.', 'Use this only for critical backups so storage does not fill up.'],
    },
    {
      title: isRTL ? '6. ماذا أفعل قبل الاستعادة؟' : '6. What Should I Do Before Restore?',
      content: isRTL
        ? ['ارفع الملف ثم راجع شاشة المعاينة والمقارنة.', 'افهم هل تريد استعادة كاملة أم انتقائية.', 'تأكد من كلمة المرور إذا كانت النسخة مشفرة.', 'يفضل إنشاء نسخة جديدة قبل الاستعادة أو تفعيل نقطة الاستعادة التلقائية.']
        : ['Upload the archive and review the preview/comparison screen.', 'Decide whether you need full or selective restore.', 'Confirm the password if the backup is encrypted.', 'It is best to create a fresh backup first or keep restore-point mode enabled.'],
    },
    {
      title: isRTL ? '7. كيف أربط Google Drive خطوة بخطوة؟' : '7. How Do I Connect Google Drive Step By Step?',
      content: isRTL
        ? [
            'ادخل أولًا إلى Google Cloud Console وأنشئ مشروعًا جديدًا أو استخدم مشروعًا موجودًا.',
            'فعّل Google Drive API داخل المشروع.',
            'اذهب إلى OAuth Consent Screen وأكمل البيانات الأساسية للتطبيق.',
            'أنشئ OAuth Client ID من نوع Web application أو Desktop app حسب الإعداد الذي ستستخدمه للحصول على التوكن.',
            'احفظ Client ID وClient Secret لأنك ستضعهما داخل البرنامج لاحقًا.',
            'أنشئ مجلدًا مخصصًا في Google Drive لتخزين النسخ الاحتياطية وانسخ Folder ID من رابط المجلد.',
          ]
        : [
            'First open Google Cloud Console and create a new project or use an existing one.',
            'Enable Google Drive API inside that project.',
            'Go to OAuth Consent Screen and complete the basic app information.',
            'Create an OAuth Client ID using Web application or Desktop app depending on the flow you will use for tokens.',
            'Save the Client ID and Client Secret because you will enter them into the app later.',
            'Create a dedicated folder in Google Drive for backups and copy the Folder ID from its URL.',
          ],
    },
    {
      title: isRTL ? '8. كيف أحصل على Refresh Token وأدخله في البرنامج؟' : '8. How Do I Get A Refresh Token And Enter It Into The App?',
      content: isRTL
        ? [
            'أسهل طريقة للمبتدئ هي استخدام Google OAuth Playground للحصول على Refresh Token.',
            'في OAuth Playground فعّل خيار استخدام بياناتك الخاصة، ثم أدخل Client ID وClient Secret الخاصين بك.',
            'اختر صلاحية Google Drive المناسبة ثم اسمح بالوصول من حساب Google الذي تريد التخزين عليه.',
            'بعد الموافقة ستظهر لك أكواد OAuth، ومن بينها Refresh Token. انسخه كما هو.',
            'ارجع إلى البرنامج وافتح قسم Google Drive Integration داخل النسخ الاحتياطي.',
            'ضع القيم بالترتيب: Folder ID ثم Client ID ثم Client Secret ثم Refresh Token ثم Redirect URI.',
            'اضغط اختبار الربط. إذا ظهر اتصال ناجح فالتكامل أصبح جاهزًا.',
            'بعد نجاح الاختبار يمكنك تفعيل رفع تلقائي بعد كل نسخة أو تنفيذ نسخة + رفع إلى Drive يدويًا.',
          ]
        : [
            'The easiest beginner-friendly way is to use Google OAuth Playground to obtain a Refresh Token.',
            'In OAuth Playground, enable the option to use your own OAuth credentials, then enter your Client ID and Client Secret.',
            'Select the proper Google Drive scope and grant access from the Google account you want to store backups in.',
            'After approval, OAuth Playground will show your tokens, including the Refresh Token. Copy it exactly as returned.',
            'Return to the app and open Google Drive Integration inside the backup center.',
            'Fill the fields in order: Folder ID, Client ID, Client Secret, Refresh Token, and Redirect URI.',
            'Press Test Connection. If the result says connected successfully, the integration is ready.',
            'After that you can enable Auto Upload After Every Backup or run Backup + Drive Upload manually.',
          ],
    },
    {
      title: isRTL ? '9. ملاحظات أمان مهمة' : '9. Important Safety Notes',
      content: isRTL
        ? ['لا تشارك كلمة مرور التشفير مع أي شخص غير مخول.', 'احفظ نسخة من بيانات Google Drive في مكان آمن.', 'افحص السجل بانتظام للتأكد من نجاح النسخ التلقائي.', 'جرّب الاستعادة على بيئة اختبارية إذا كانت البيانات شديدة الحساسية.']
        : ['Never share the encryption password with unauthorized users.', 'Keep a safe record of your Google Drive credentials.', 'Review history regularly to confirm scheduled backups are succeeding.', 'Test restore on a staging environment if the data is highly sensitive.'],
    },
  ]), [isRTL]);

  const openBackupGuidePage = () => {
    setIsBackupGuideOpen(true);
  };

  const renderBackupHelpButton = (topicId: string) => (
    <button
      type="button"
      onClick={() => setActiveBackupHelpTopic(topicId)}
      className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-400 transition-colors"
      title={isRTL ? 'شرح هذه الميزة' : 'Explain this feature'}
    >
      <CircleHelp size={14} />
    </button>
  );

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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isRTL ? 'التحديث التلقائي للوحة التحكم' : 'Dashboard Auto Refresh'}
                </label>
                <select
                  value={String(state.dashboardRefreshIntervalSec)}
                  onChange={(e) => setState(prev => ({ ...prev, dashboardRefreshIntervalSec: Number(e.target.value) }))}
                  className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                >
                  <option value="5">{isRTL ? 'كل 5 ثوانٍ' : 'Every 5 seconds'}</option>
                  <option value="30">{isRTL ? 'كل 30 ثانية' : 'Every 30 seconds'}</option>
                  <option value="60">{isRTL ? 'كل 60 ثانية' : 'Every 60 seconds'}</option>
                  <option value="120">{isRTL ? 'كل دقيقتين' : 'Every 2 minutes'}</option>
                  <option value="300">{isRTL ? 'كل 5 دقائق' : 'Every 5 minutes'}</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isRTL ? 'يُطبق هذا الإعداد على لوحة القيادة الرئيسية للمدير.' : 'This setting controls the main admin dashboard refresh interval.'}
                </p>
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
              <button onClick={handleSaveGateways} className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20">
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
                      <button onClick={() => setIsSmsPromptOpen(true)} className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
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
                        type="number" lang="en" 
                        min="1500" 
                        value={gateways.whatsapp?.delay || 1500} 
                        onChange={(e) => setGateways({...gateways, whatsapp: {...gateways.whatsapp, delay: Math.max(1500, parseInt(e.target.value) || 1500)}})} 
                        className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono transition-all" 
                      />
                      <p className="text-[10px] text-slate-400">{isRTL ? 'الحد الأدنى 1500 (ثانية ونصف) للحماية من الحظر.' : 'Minimum 1500ms for safety against server blocks.'}</p>
                    </div>
                    
                    <button onClick={async () => {
                       await restartWhatsappEngine();
                       toastInfo(isRTL ? 'تم إرسال أمر إعادة تشغيل محرك واتساب.' : 'WhatsApp engine restart signal sent.', isRTL ? 'تم إرسال الأمر' : 'Restart Signal Sent');
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
                        <button onClick={() => setIsEmailPromptOpen(true)} className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
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
                    <option value="grok-1">xAI Grok-1 / Groq Auto</option>
                    <option value="llama-3.3-70b-versatile">Groq Llama 3.3 70B</option>
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
                          <button onClick={() => handleTestAiConnection(provider.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold rounded-lg transition-colors flex items-center gap-1.5">
                            <RefreshCw size={12} />
                            {aiTestingProviderId === provider.id ? (isRTL ? 'جاري الفحص...' : 'Testing...') : t.settings.ai.testConnection}
                          </button>
                          <div 
                            onClick={() => {
                              const nextEnabled = !provider.enabled;
                              const newProviders = state.aiSettings.providers.map((item, itemIdx) => ({
                                ...item,
                                enabled: itemIdx === idx ? nextEnabled : (nextEnabled ? false : item.enabled),
                              }));
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
                  onChange={(e) => setState(prev => ({ ...prev, currency: e.target.value as Currency }))}
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
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t.settings.backup.title}</h3>
                  {renderBackupHelpButton('overview')}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
                  {isRTL
                    ? 'مركز نسخ احتياطي واستعادة احترافي يشمل نسخة كاملة للنظام، تصدير الجداول بصيغ متعددة، وجدولة تلقائية مع دعم الربط والرفع إلى Google Drive.'
                    : 'Professional backup and recovery center with full-system snapshots, multi-format exports, automated scheduling, and Google Drive integration.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openBackupGuidePage}
                  className="px-4 py-2.5 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  {isRTL ? 'دليل المبتدئين الكامل' : 'Full Beginner Guide'}
                </button>
                <button
                  onClick={() => handleRunBackup(false)}
                  disabled={backupActionId !== null}
                  className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Database size={16} />
                  {backupActionId === 'run-backup-local' ? (isRTL ? 'جاري النسخ...' : 'Backing Up...') : (isRTL ? 'نسخة كاملة محلية' : 'Local Full Backup')}
                </button>
                <button
                  onClick={() => handleRunBackup(true)}
                  disabled={backupActionId !== null || !state.backupSettings.googleDrive.enabled}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Cloud size={16} />
                  {backupActionId === 'run-backup-drive' ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : (isRTL ? 'نسخ + رفع إلى Drive' : 'Backup + Drive Upload')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B]">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="text-teal-500" size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRTL ? 'آخر نسخة' : 'Last Backup'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{state.backupSettings.lastBackup || (isRTL ? 'لا يوجد بعد' : 'Not Available')}</div>
              </div>
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B]">
                <div className="flex items-center gap-3 mb-3">
                  <ArchiveRestore className="text-violet-500" size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRTL ? 'آخر استعادة' : 'Last Restore'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{state.backupSettings.lastRestore || (isRTL ? 'لا يوجد بعد' : 'Not Available')}</div>
              </div>
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B]">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="text-amber-500" size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRTL ? 'النسخة التالية' : 'Next Run'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{backupOverview?.nextRunAt || (isRTL ? 'غير مجدول' : 'Not Scheduled')}</div>
              </div>
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B]">
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive className="text-blue-500" size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{isRTL ? 'التخزين المحلي' : 'Local Storage'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {`${backupOverview?.storage?.localFileCount || 0} ${isRTL ? 'ملف' : 'files'} • ${formatBytes(backupOverview?.storage?.totalBytes)}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#09090B]/70 space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-teal-500" size={18} />
                    {isRTL ? 'سياسات النسخ الذكي' : 'Smart Backup Policy'}
                    {renderBackupHelpButton('schedule')}
                  </h4>
                  <button
                    onClick={handleSaveBackupSettings}
                    disabled={backupActionId !== null}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {backupActionId === 'save-backup-settings' ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الإعدادات' : 'Save Settings')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{isRTL ? 'تفعيل المركز' : 'Enable Center'}</div>
                      <div className="text-xs text-slate-500">{isRTL ? 'تشغيل خدمات النسخ الاحتياطي والاستعادة' : 'Turn on backup and recovery services'}</div>
                    </div>
                    <div onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, enabled: !prev.backupSettings.enabled } }))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.enabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{isRTL ? 'الجدولة التلقائية' : 'Auto Scheduling'}</div>
                      <div className="text-xs text-slate-500">{isRTL ? 'إنشاء نسخ دورية تلقائيًا' : 'Create scheduled backups automatically'}</div>
                    </div>
                    <div onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, automatic: !prev.backupSettings.automatic } }))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.automatic ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.automatic ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'تكرار النسخ' : 'Frequency'}</label>
                      {renderBackupHelpButton('schedule')}
                    </div>
                    <select
                      value={state.backupSettings.frequency}
                      onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, frequency: e.target.value as AppState['backupSettings']['frequency'] } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="daily">{isRTL ? 'يومي' : 'Daily'}</option>
                      <option value="weekly">{isRTL ? 'أسبوعي' : 'Weekly'}</option>
                      <option value="monthly">{isRTL ? 'شهري' : 'Monthly'}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'وقت التنفيذ' : 'Scheduled Time'}</label>
                      {renderBackupHelpButton('schedule')}
                    </div>
                    <input
                      type="time"
                      value={state.backupSettings.scheduledTime}
                      onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, scheduledTime: e.target.value } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'عدد النسخ المحتفظ بها' : 'Retention Count'}</label>
                      {renderBackupHelpButton('retention')}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={state.backupSettings.retentionCount}
                      onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, retentionCount: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'مستوى الضغط' : 'Compression Level'}</label>
                      {renderBackupHelpButton('compression')}
                    </div>
                    <select
                      value={state.backupSettings.compressionLevel}
                      onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, compressionLevel: e.target.value as AppState['backupSettings']['compressionLevel'] } }))}
                      className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="fast">{isRTL ? 'سريع' : 'Fast'}</option>
                      <option value="balanced">{isRTL ? 'متوازن' : 'Balanced'}</option>
                      <option value="maximum">{isRTL ? 'أقصى ضغط' : 'Maximum'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-4 rounded-2xl border transition-colors ${state.backupSettings.verifyAfterBackup ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, verifyAfterBackup: !prev.backupSettings.verifyAfterBackup } }))}
                        className="text-sm font-semibold text-left"
                      >
                        {isRTL ? 'تحقق بعد الإنشاء' : 'Verify After Backup'}
                      </button>
                      {renderBackupHelpButton('verify')}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-colors ${state.backupSettings.createRestorePointBeforeRestore ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, createRestorePointBeforeRestore: !prev.backupSettings.createRestorePointBeforeRestore } }))}
                        className="text-sm font-semibold text-left"
                      >
                        {isRTL ? 'نقطة استعادة قبل الاسترجاع' : 'Restore Point Before Restore'}
                      </button>
                      {renderBackupHelpButton('restorePoint')}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-colors ${state.backupSettings.includeUploadsDirectory ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, includeUploadsDirectory: !prev.backupSettings.includeUploadsDirectory } }))}
                        className="text-sm font-semibold text-left"
                      >
                        {isRTL ? 'تضمين ملفات الرفع' : 'Include Uploads'}
                      </button>
                      {renderBackupHelpButton('uploads')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#09090B]/70 space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cloud className="text-blue-500" size={18} />
                    {isRTL ? 'ربط Google Drive' : 'Google Drive Integration'}
                    {renderBackupHelpButton('drive')}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${state.backupSettings.googleDrive.connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : state.backupSettings.googleDrive.connectionStatus === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {state.backupSettings.googleDrive.connectionStatus === 'connected' ? (isRTL ? 'متصل' : 'Connected') : state.backupSettings.googleDrive.connectionStatus === 'error' ? (isRTL ? 'خطأ' : 'Error') : (isRTL ? 'غير مفعل' : 'Idle')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 md:col-span-2">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{isRTL ? 'تفعيل الربط' : 'Enable Drive Sync'}</div>
                      <div className="text-xs text-slate-500">{isRTL ? 'استخدم Google Drive كوجهة رفع تلقائي وحفظ خارجي' : 'Use Google Drive as your cloud backup destination'}</div>
                    </div>
                    <div onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, enabled: !prev.backupSettings.googleDrive.enabled } } }))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.googleDrive.enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.googleDrive.enabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                    </div>
                  </div>

                  <input value={state.backupSettings.googleDrive.folderId} onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, folderId: e.target.value } } }))} placeholder={isRTL ? 'Google Drive Folder ID' : 'Google Drive Folder ID'} className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono" />
                  <input value={state.backupSettings.googleDrive.clientId} onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, clientId: e.target.value } } }))} placeholder={isRTL ? 'Client ID' : 'Client ID'} className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono" />
                  <input type="password" value={state.backupSettings.googleDrive.clientSecret} onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, clientSecret: e.target.value } } }))} placeholder={isRTL ? 'Client Secret' : 'Client Secret'} className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono" />
                  <input type="password" value={state.backupSettings.googleDrive.refreshToken} onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, refreshToken: e.target.value } } }))} placeholder={isRTL ? 'Refresh Token' : 'Refresh Token'} className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono" />
                  <input value={state.backupSettings.googleDrive.redirectUri} onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, redirectUri: e.target.value } } }))} placeholder={isRTL ? 'Redirect URI' : 'Redirect URI'} className="w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono md:col-span-2" />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTestBackupDrive}
                    disabled={backupActionId !== null}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Globe size={16} />
                    {backupActionId === 'test-drive' ? (isRTL ? 'جاري الاختبار...' : 'Testing...') : (isRTL ? 'اختبار الربط' : 'Test Connection')}
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, googleDrive: { ...prev.backupSettings.googleDrive, autoUpload: !prev.backupSettings.googleDrive.autoUpload } } }))}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold border ${state.backupSettings.googleDrive.autoUpload ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-white dark:bg-[#18181B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'}`}
                  >
                    {isRTL ? 'رفع تلقائي بعد كل نسخة' : 'Auto Upload After Every Backup'}
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 leading-6 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 px-4 py-3">
                  {state.backupSettings.googleDrive.connectionMessage || (isRTL ? 'أدخل بيانات OAuth الخاصة بـ Google Drive ثم اختبر الربط. يمكن استخدام Google OAuth Playground للحصول على Refresh Token.' : 'Enter Google Drive OAuth credentials, then test the connection. You can use Google OAuth Playground to obtain a refresh token.')}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="text-rose-500" size={18} />
                      {isRTL ? 'تشفير النسخ الاحتياطية' : 'Backup Encryption'}
                    </h4>
                    {renderBackupHelpButton('encryption')}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isRTL
                      ? 'تشفير أرشيف النسخة الكاملة بخوارزمية قوية مع تلميح كلمة مرور، بحيث لا يمكن معاينته أو استعادته بدون كلمة المرور.'
                      : 'Encrypt full backup archives with a strong algorithm and password hint so they cannot be previewed or restored without the password.'}
                  </p>
                </div>
                <div onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, encryption: { ...prev.backupSettings.encryption, enabled: !prev.backupSettings.encryption.enabled } } }))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${state.backupSettings.encryption.enabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${state.backupSettings.encryption.enabled ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')}`}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2 xl:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة مرور التشفير' : 'Encryption Password'}</label>
                  <div className="relative">
                    <input
                      type={showBackupEncryptionPassword ? 'text' : 'password'}
                      value={state.backupSettings.encryption.password}
                      onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, encryption: { ...prev.backupSettings.encryption, password: e.target.value } } }))}
                      placeholder={isRTL ? 'أدخل كلمة مرور قوية لتشفير النسخ' : 'Enter a strong password for backup encryption'}
                      className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                    <button type="button" onClick={() => setShowBackupEncryptionPassword(prev => !prev)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {showBackupEncryptionPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'تلميح كلمة المرور' : 'Password Hint'}</label>
                  <input
                    value={state.backupSettings.encryption.passwordHint}
                    onChange={(e) => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, encryption: { ...prev.backupSettings.encryption, passwordHint: e.target.value } } }))}
                    placeholder={isRTL ? 'تلميح اختياري' : 'Optional hint'}
                    className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الخوارزمية' : 'Algorithm'}</label>
                  <div className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                    AES-256-GCM
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={`p-4 rounded-2xl border ${state.backupSettings.encryption.enabled ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
                  <div className="text-sm font-bold mb-1">{isRTL ? 'الحالة' : 'Status'}</div>
                  <div className="text-xs">{state.backupSettings.encryption.enabled ? (isRTL ? 'النسخ الجديدة ستنشأ كملفات مشفرة.' : 'New backups will be generated as encrypted archives.') : (isRTL ? 'النسخ ستنشأ بدون تشفير.' : 'Backups will be generated without encryption.')}</div>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, encryption: { ...prev.backupSettings.encryption, requirePasswordOnRestore: !prev.backupSettings.encryption.requirePasswordOnRestore } } }))}
                  className={`p-4 rounded-2xl border text-sm font-semibold transition-colors ${state.backupSettings.encryption.requirePasswordOnRestore ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
                >
                  {isRTL ? 'طلب كلمة المرور عند الاستعادة' : 'Require Password On Restore'}
                </button>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181B] text-sm text-slate-600 dark:text-slate-300">
                  <div className="font-bold mb-1">{isRTL ? 'اشتقاق المفتاح' : 'Key Derivation'}</div>
                  <div>{`${state.backupSettings.encryption.kdfIterations.toLocaleString()} PBKDF2 iterations`}</div>
                </div>
              </div>

              <button
                onClick={() => setState(prev => ({ ...prev, backupSettings: { ...prev.backupSettings, encryption: { ...prev.backupSettings.encryption, applyToExports: !prev.backupSettings.encryption.applyToExports } } }))}
                className={`w-full p-4 rounded-2xl border text-sm font-semibold transition-colors ${state.backupSettings.encryption.applyToExports ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' : 'bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
              >
                {isRTL ? 'تطبيق التشفير أيضًا على ملفات التصدير' : 'Apply Encryption To Export Files Too'}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] space-y-5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-violet-500" size={18} />
                  <h4 className="font-bold text-slate-900 dark:text-white">{isRTL ? 'مركز تصدير الجداول' : 'Dataset Export Center'}</h4>
                  {renderBackupHelpButton('export')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'الجدول أو الحزمة' : 'Dataset Bundle'}</label>
                      {renderBackupHelpButton('export')}
                    </div>
                    <select value={selectedBackupDataset} onChange={(e) => setSelectedBackupDataset(e.target.value as BackupDatasetId)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500">
                      {backupDatasets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'صيغة التصدير' : 'Export Format'}</label>
                      {renderBackupHelpButton('exportFormat')}
                    </div>
                    <select value={selectedBackupFormat} onChange={(e) => setSelectedBackupFormat(e.target.value as BackupExportFormat)} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500">
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="xlsx">XLSX</option>
                      <option value="zip">ZIP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                    <div className="font-bold mb-1 flex items-center gap-2"><FileJson size={15} /> JSON</div>
                    <div>{isRTL ? 'مثالي للأرشفة البرمجية والدمج بين الأنظمة' : 'Best for structured archival and integrations'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                    <div className="font-bold mb-1 flex items-center gap-2"><FileSpreadsheet size={15} /> CSV / XLSX</div>
                    <div>{isRTL ? 'مناسب للتحليل والإكسل والتقارير المتقدمة' : 'Ideal for Excel, analytics, and reporting'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                    <div className="font-bold mb-1 flex items-center gap-2"><Download size={15} /> ZIP</div>
                    <div>{isRTL ? 'لتجميع ملفات متعددة أو كل الجداول دفعة واحدة' : 'For bundled exports and multi-file delivery'}</div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border text-sm ${state.backupSettings.encryption.applyToExports ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20' : 'bg-slate-50 dark:bg-[#18181B] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}>
                  <div className="font-bold mb-1">{isRTL ? 'تشفير التصدير' : 'Export Encryption'}</div>
                  <div>
                    {state.backupSettings.encryption.applyToExports
                      ? (isRTL ? 'سيتم تنزيل ملف التصدير بصيغة مشفرة `NLEX` باستخدام كلمة المرور الرئيسية.' : 'The export will be downloaded as an encrypted `NLEX` file using the main backup password.')
                      : (isRTL ? 'سيتم تنزيل ملف التصدير بصيغته الأصلية بدون تشفير.' : 'The export will be downloaded in its original format without encryption.')}
                  </div>
                </div>

                <button
                  onClick={handleExportDataset}
                  disabled={backupActionId !== null}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download size={16} />
                  {backupActionId === 'export-dataset' ? (isRTL ? 'جاري تجهيز الملف...' : 'Preparing Export...') : (isRTL ? 'تصدير وتحميل' : 'Export & Download')}
                </button>
              </div>

              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] space-y-5">
                <div className="flex items-center gap-2">
                  <ArchiveRestore className="text-rose-500" size={18} />
                  <h4 className="font-bold text-slate-900 dark:text-white">{isRTL ? 'مركز المعاينة والاستعادة' : 'Preview & Recovery Center'}</h4>
                  {renderBackupHelpButton('restore')}
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-700 dark:text-rose-300 leading-6">
                  {isRTL
                    ? 'ابدأ بتحليل ملف النسخة الاحتياطية أولًا. ستظهر لك مقارنة بين بيانات النسخة والبيانات الحالية، ثم يمكنك تنفيذ استعادة كاملة أو انتقائية لجداول محددة فقط.'
                    : 'Start by analyzing the backup archive. You will see a comparison against the current system, then choose either a full restore or a selective dataset restore.'}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'ملف النسخة الاحتياطية' : 'Backup Archive File'}</label>
                    {renderBackupHelpButton('archiveFile')}
                  </div>
                  <input
                    type="file"
                    accept=".zip,.nbk"
                    onChange={(e) => {
                      setRestoreFile(e.target.files?.[0] || null);
                      setRestorePreview(null);
                      setSelectedRestoreDatasets([]);
                      setRestorePassword('');
                    }}
                    className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white dark:file:bg-slate-100 dark:file:text-slate-900"
                  />
                  {restoreFile && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {`${restoreFile.name} • ${formatBytes(restoreFile.size)}`}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'كلمة مرور النسخة الاحتياطية' : 'Backup Password'}</label>
                    {renderBackupHelpButton('backupPassword')}
                  </div>
                  <div className="relative">
                    <input
                      type={showRestorePassword ? 'text' : 'password'}
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder={isRTL ? 'أدخل كلمة المرور إذا كانت النسخة مشفرة' : 'Enter password if the archive is encrypted'}
                      className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                    <button type="button" onClick={() => setShowRestorePassword(prev => !prev)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {showRestorePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {isRTL ? 'إذا كانت النسخة مشفرة فلن تنجح المعاينة أو الاستعادة إلا بعد إدخال كلمة المرور الصحيحة.' : 'If the archive is encrypted, preview and restore require the correct password.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handlePreviewBackupRestore}
                    disabled={backupActionId !== null || !restoreFile}
                    className="py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <GitCompareArrows size={16} />
                    {backupActionId === 'preview-restore' ? (isRTL ? 'جاري التحليل...' : 'Analyzing...') : (isRTL ? 'فحص ومقارنة النسخة' : 'Analyze & Compare')}
                  </button>
                  <button
                    onClick={() => {
                      setRestoreFile(null);
                      setRestorePreview(null);
                      setSelectedRestoreDatasets([]);
                      setRestoreMode('full');
                    }}
                    disabled={backupActionId !== null}
                    className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} />
                    {isRTL ? 'مسح الحالة' : 'Reset State'}
                  </button>
                </div>

                {restorePreview && (
                  <div className="space-y-4">
                    {(restorePreview.encrypted || restorePreview.requiresPassword) && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-300 leading-6">
                        <div className="font-bold mb-1">{isRTL ? 'نسخة احتياطية مشفرة' : 'Encrypted Backup Archive'}</div>
                        <div>
                          {restorePreview.requiresPassword
                            ? (isRTL ? 'هذه النسخة محمية بكلمة مرور. أدخل كلمة المرور الصحيحة ثم أعد فحص الملف لعرض المقارنة الداخلية.' : 'This archive is password-protected. Enter the correct password and analyze again to unlock the internal comparison.')
                            : (isRTL ? 'تم فك حماية النسخة المشفرة بنجاح وأصبحت جاهزة للمقارنة والاستعادة.' : 'The encrypted archive was unlocked successfully and is ready for comparison and restore.')}
                        </div>
                        {restorePreview.passwordHint && (
                          <div className="mt-2 text-xs font-bold">{`${isRTL ? 'التلميح' : 'Hint'}: ${restorePreview.passwordHint}`}</div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">{isRTL ? 'المعرف' : 'Backup ID'}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white break-all">{restorePreview.backupId || '-'}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">{isRTL ? 'تاريخ الإنشاء' : 'Created At'}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{restorePreview.createdAt || '-'}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">{isRTL ? 'عدد الملفات' : 'Files Count'}</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{restorePreview.archiveSummary.fileCount}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">{isRTL ? 'التحقق' : 'Checksum'}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-300 break-all">{restorePreview.checksum}</div>
                      </div>
                    </div>

                    {!restorePreview.requiresPassword && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setRestoreMode('full')}
                        className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${restoreMode === 'full' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-[#18181B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'}`}
                      >
                        <Layers3 size={16} />
                        {isRTL ? 'استعادة كاملة' : 'Full Restore'}
                      </button>
                      <button
                        onClick={() => setRestoreMode('selective')}
                        className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${restoreMode === 'selective' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' : 'bg-slate-50 dark:bg-[#18181B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'}`}
                      >
                        <GitCompareArrows size={16} />
                        {isRTL ? 'استعادة انتقائية' : 'Selective Restore'}
                      </button>
                    </div>
                    )}

                    {!restorePreview.requiresPassword && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{isRTL ? 'مقارنة الجداول' : 'Dataset Comparison'}</div>
                        {restoreMode === 'selective' && (
                          <button
                            onClick={() => setSelectedRestoreDatasets(restorePreview.datasetDiffs.filter(item => item.availableInArchive).map(item => item.id))}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400"
                          >
                            {isRTL ? 'تحديد المتاح كله' : 'Select All Available'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {restorePreview.datasetDiffs.map((item) => {
                          const isSelected = selectedRestoreDatasets.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={restoreMode !== 'selective' || !item.availableInArchive}
                              onClick={() => setSelectedRestoreDatasets(prev => (
                                prev.includes(item.id)
                                  ? prev.filter(id => id !== item.id)
                                  : [...prev, item.id]
                              ))}
                              className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                                !item.availableInArchive
                                  ? 'bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                                  : restoreMode === 'selective' && isSelected
                                    ? 'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20'
                                    : 'bg-slate-50 dark:bg-[#18181B] border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {item.availableInArchive
                                      ? `${isRTL ? 'الحالي' : 'Current'}: ${item.currentRecords} • ${isRTL ? 'في النسخة' : 'In Backup'}: ${item.archiveRecords}`
                                      : (isRTL ? 'غير موجود داخل الأرشيف' : 'Not available in archive')}
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${item.delta > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : item.delta < 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                  {item.delta > 0 ? `+${item.delta}` : item.delta}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {!restorePreview.requiresPassword && (
                    <button
                      onClick={handleRestoreBackup}
                      disabled={backupActionId !== null || (restoreMode === 'selective' && selectedRestoreDatasets.length === 0)}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Upload size={16} />
                      {backupActionId === 'restore-backup'
                        ? (isRTL ? 'جاري الاستعادة...' : 'Restoring...')
                        : restoreMode === 'selective'
                          ? (isRTL ? 'تنفيذ الاستعادة الانتقائية' : 'Run Selective Restore')
                          : (isRTL ? 'تنفيذ الاستعادة الكاملة' : 'Run Full Restore')}
                    </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="text-emerald-500" size={18} />
                  {isRTL ? 'سجل عمليات النسخ والاستعادة' : 'Backup & Recovery History'}
                  {renderBackupHelpButton('history')}
                </h4>
                <button
                  onClick={loadBackupCenter}
                  disabled={backupActionId !== null}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  {isRTL ? 'تحديث السجل' : 'Refresh History'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {(backupOverview?.datasets || []).map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{item.records}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {backupHistory.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500">
                    {isRTL ? 'لا توجد عمليات نسخ أو استعادة مسجلة بعد.' : 'No backup or recovery events have been recorded yet.'}
                  </div>
                ) : (
                  backupHistory.map((item) => (
                    <div key={item.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#18181B]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.fileName}</span>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                            {item.status}
                          </span>
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{item.provider}</span>
                          {item.encrypted && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                              {isRTL ? 'مشفر' : 'Encrypted'}
                            </span>
                          )}
                          {item.isProtected && (
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              {isRTL ? 'محمي' : 'Protected'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {`${item.createdAt} • ${item.dataset || ''} • ${item.format}`}
                        </div>
                        {item.message && <div className="text-xs text-slate-600 dark:text-slate-300">{item.message}</div>}
                        {item.checksum && <div className="text-[11px] font-mono text-slate-400 break-all">{item.checksum}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-slate-500">{formatBytes(item.sizeBytes)}</div>
                        {item.action === 'backup' && (
                          <button
                            onClick={() => handleToggleBackupProtection(item)}
                            disabled={backupActionId === `protect-${item.id}`}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-50 ${item.isProtected ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' : 'bg-white dark:bg-[#09090B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}
                          >
                            {backupActionId === `protect-${item.id}`
                              ? (isRTL ? 'جاري التحديث...' : 'Updating...')
                              : item.isProtected
                                ? (isRTL ? 'إلغاء الحماية' : 'Unprotect')
                                : (isRTL ? 'حماية من الحذف التلقائي' : 'Protect From Auto Delete')}
                          </button>
                        )}
                        {item.fileName && (
                          <button
                            onClick={() => setBackupHistoryItemToDelete(item)}
                            disabled={backupActionId === `delete-${item.id}`}
                            className="px-4 py-2 rounded-xl text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20 disabled:opacity-50"
                          >
                            {backupActionId === `delete-${item.id}`
                              ? (isRTL ? 'جاري الحذف...' : 'Deleting...')
                              : (isRTL ? 'حذف من اللوكال' : 'Delete Local Copy')}
                          </button>
                        )}
                        {item.downloadUrl && (
                          <button
                            onClick={() => window.open(resolveApiFileUrl(item.downloadUrl || ''), '_blank', 'noopener,noreferrer')}
                            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2"
                          >
                            <Download size={14} />
                            {isRTL ? 'تحميل' : 'Download'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                  {isRTL ? 'إدارة مديري النظام، مديري SAS NET، وصلاحيات وصولهم.' : 'Manage system administrators, SAS NET managers, and their access permissions.'}
                </p>
              </div>
              {hasPermission('manage_team') && (
                <button 
                  onClick={() => {
                    const newId = Math.random().toString(36).substr(2, 9);
                    const newMember: TeamMember = { id: newId, name: '', email: '', username: '', role: 'user', permissions: [], status: 'active', joinDate: new Date().toISOString().split('T')[0], groupId: '', balance: 0, commissionRate: 0, maxTxLimit: 0, isLimitEnabled: false };
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
                              onClick={() => setMemberToDelete(member)}
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
                            const newRole = e.target.value as Role;
                            let defaultPerms: Permission[] = [];
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
                          toastError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Please fill all required fields.', isRTL ? 'بيانات ناقصة' : 'Missing Fields');
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
                        toastSuccess(isRTL ? 'تم حفظ بيانات المستخدم بنجاح.' : 'User details were saved successfully.', isRTL ? 'تم الحفظ' : 'User Saved');
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

                  <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      {state.updateStatus.hasUpdate ? t.settings.update.availableNotes : t.settings.update.currentNotes}
                    </p>
                    {(state.updateStatus.hasUpdate ? state.updateStatus.latestChangelog : state.versionInfo.changelog)?.length ? (
                      <div className="space-y-2">
                        {(state.updateStatus.hasUpdate ? state.updateStatus.latestChangelog : state.versionInfo.changelog).map((item, index) => (
                          <div key={`${item}-${index}`} className="text-sm text-slate-700 dark:text-slate-300 rounded-xl bg-white/70 dark:bg-[#18181B] px-3 py-2 border border-slate-200 dark:border-slate-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t.settings.update.noNotes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={handleCheckUpdate}
                      disabled={state.updateStatus.checking}
                      className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {state.updateStatus.checking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                      {t.settings.update.checkNow}
                    </button>
                    {state.updateStatus.hasUpdate && (
                      <button 
                        onClick={handleUpdateSystem}
                        disabled={state.updateStatus.checking}
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
                    <div className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-bold space-y-1">
                      <p>{t.settings.update.latestVersion}: v{state.updateStatus.latestVersion}</p>
                      {state.updateStatus.latestBuildDate && <p>{t.settings.update.buildDate}: {state.updateStatus.latestBuildDate}</p>}
                    </div>
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
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{isRTL ? 'حقوق الملكية الفكرية - SAS NET' : 'IP Protection - SAS NET'}</h4>
                <p className="text-xs md:text-sm max-w-2xl leading-relaxed text-slate-500 dark:text-slate-400 mx-auto">
                  {isRTL 
                    ? 'هذا النظام محمي بموجب قوانين تكنولوجيا المعلومات الدولية وحقوق المؤلف لعام 2026. أي محاولة لفك التشفير أو الهندسة العكسية للكود المصدري تعرضك للمساءلة القانونية المباشرة تحت إشراف شركة SAS NET.'
                    : 'This system is protected under international IT laws and 2026 copyright regulations. Any attempt to decrypt or reverse-engineer the source code will lead to direct legal action under SAS NET supervision.'}
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
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm max-w-2xl leading-relaxed">
          {t.settings.subtitle}
        </p>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        {activeCategoryMeta && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1.5 font-semibold text-teal-600 dark:text-teal-400">
              <activeCategoryMeta.icon size={16} />
              {activeCategoryMeta.label}
            </span>
            <span>{isRTL ? 'أقسام الإعدادات أصبحت ضمن القائمة المنسدلة في الشريط الجانبي.' : 'Settings sections are now available from the sidebar dropdown.'}</span>
          </div>
        )}

        <div className="flex-1 glass-card p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {renderContent()}
          
          {/* Global Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button onClick={handleSaveAllSettings} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-2">
              <Save size={16} /> {t.settings.save}
            </button>
          </div>
        </div>
      </div>

      {activeBackupHelpTopic && backupHelpTopics[activeBackupHelpTopic] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{backupHelpTopics[activeBackupHelpTopic].title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{backupHelpTopics[activeBackupHelpTopic].summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBackupHelpTopic(null)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-3">
                {backupHelpTopics[activeBackupHelpTopic].details.map((detail, index) => (
                  <div key={`${activeBackupHelpTopic}-${index}`} className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs">{index + 1}</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={openBackupGuidePage}
                  className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  {isRTL ? 'فتح الدليل الكامل' : 'Open Full Guide'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBackupHelpTopic(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold"
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBackupGuideOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/80 backdrop-blur-sm">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-violet-600 px-6 py-8 sm:px-8">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="max-w-3xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold mb-4">
                        <ShieldCheck size={14} />
                        {isRTL ? 'مركز المعرفة للمبتدئين' : 'Beginner Knowledge Center'}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                        {isRTL ? 'دليل عملاق النسخ الاحتياطي والاستعادة' : 'Backup & Recovery Giant Guide'}
                      </h2>
                      <p className="text-sm sm:text-base text-white/90 leading-8">
                        {isRTL
                          ? 'هذا الدليل الداخلي يشرح كل ما يحتاجه المستخدم المبتدئ لفهم النسخ الاحتياطي، التصدير، التشفير، والاستعادة بدون تعقيد تقني.'
                          : 'This internal guide explains everything a beginner needs to understand backup, export, encryption, and restore without technical complexity.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBackupGuideOpen(false);
                          setActiveBackupHelpTopic('overview');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                        <CircleHelp size={16} />
                        {isRTL ? 'فتح شرح سريع' : 'Open Quick Help'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBackupGuideOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        {isRTL ? 'إغلاق الدليل' : 'Close Guide'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181B] p-5">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2">{isRTL ? 'ابدأ من هنا' : 'Start Here'}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-7">
                        {isRTL ? 'أنشئ نسخة كاملة أولًا، ثم احمِ النسخة المهمة من الحذف التلقائي، وبعدها فعّل الجدولة وGoogle Drive.' : 'Create one full backup first, protect the important one from auto deletion, then enable scheduling and Google Drive.'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181B] p-5">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2">{isRTL ? 'للطوارئ' : 'For Emergencies'}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-7">
                        {isRTL ? 'قبل أي استعادة كبيرة أو تحديث حساس، أنشئ نسخة جديدة ثم فعّل حمايتها من السجل.' : 'Before any major restore or sensitive update, create a fresh backup and protect it from history.'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#18181B] p-5">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-2">{isRTL ? 'للمبتدئين' : 'For Beginners'}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-7">
                        {isRTL ? 'إذا لم تفهم أي شيء، اضغط على زر ؟ بجانب الميزة نفسها وسيظهر لك شرح مباشر ومبسط.' : 'If you do not understand a feature, press the nearby ? button for a direct and simplified explanation.'}
                      </div>
                    </div>
                  </div>

                  {backupGuideSections.map((section, index) => (
                    <section key={`backup-guide-${index}`} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111827]/60 p-6">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black">
                          {index + 1}
                        </div>
                        <div className="space-y-4 w-full">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{section.title}</h3>
                          <div className="grid grid-cols-1 gap-3">
                            {section.content.map((item, itemIndex) => (
                              <div key={`backup-guide-item-${index}-${itemIndex}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-7">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  ))}

                  <div className="rounded-3xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-6 py-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="text-blue-600 dark:text-blue-400 mt-1" size={18} />
                      <div>
                        <div className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                          {isRTL ? 'الخلاصة العملية للمبتدئ' : 'Beginner Practical Summary'}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-200 leading-7">
                          {isRTL
                            ? '1) أنشئ نسخة كاملة. 2) احمِ نسخة مهمة من الحذف التلقائي. 3) فعّل الجدولة. 4) فعّل Google Drive إذا أردت نسخة خارجية. 5) استخدم المعاينة دائمًا قبل أي استعادة. 6) لا تنس كلمة مرور التشفير إذا كانت النسخة مشفرة.'
                            : '1) Create a full backup. 2) Protect an important backup from auto deletion. 3) Enable scheduling. 4) Enable Google Drive if you need an external copy. 5) Always preview before restore. 6) Never forget the encryption password if the archive is encrypted.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBackupGuideOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold"
                    >
                      {isRTL ? 'العودة إلى الإعدادات' : 'Back To Settings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AppPromptDialog
        open={isSmsPromptOpen}
        onClose={() => { setIsSmsPromptOpen(false); setSmsTestNumber(''); }}
        onConfirm={handleSmsGatewayTest}
        title={isRTL ? 'اختبار بوابة SMS' : 'Test SMS Gateway'}
        description={isRTL ? 'أدخل رقم الهاتف الذي تريد إرسال رسالة تجريبية إليه.' : 'Enter the phone number that should receive the test SMS.'}
        label={isRTL ? 'رقم الهاتف' : 'Mobile Number'}
        value={smsTestNumber}
        onChange={setSmsTestNumber}
        placeholder={isRTL ? 'مثال: 0597000000' : 'Example: 0597000000'}
        confirmLabel={isRTL ? 'إرسال الاختبار' : 'Send Test'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        type="tel"
        isRTL={isRTL}
      />

      <AppPromptDialog
        open={isEmailPromptOpen}
        onClose={() => { setIsEmailPromptOpen(false); setEmailTestAddress(''); }}
        onConfirm={handleEmailGatewayTest}
        title={isRTL ? 'اختبار بوابة البريد' : 'Test Email Gateway'}
        description={isRTL ? 'أدخل البريد الإلكتروني الذي تريد إرسال رسالة تجريبية إليه.' : 'Enter the email address that should receive the test message.'}
        label={isRTL ? 'البريد الإلكتروني' : 'Email Address'}
        value={emailTestAddress}
        onChange={setEmailTestAddress}
        placeholder="example@domain.com"
        confirmLabel={isRTL ? 'إرسال الاختبار' : 'Send Test'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        type="email"
        isRTL={isRTL}
      />

      <AppConfirmDialog
        open={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDeleteTeamMember}
        title={isRTL ? 'حذف المستخدم' : 'Delete User'}
        description={isRTL ? `سيتم حذف المستخدم ${memberToDelete?.name || ''} من الفريق نهائيًا.` : `The user ${memberToDelete?.name || ''} will be permanently removed from the team.`}
        confirmLabel={isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="danger"
        isRTL={isRTL}
      />

      <AppConfirmDialog
        open={Boolean(backupHistoryItemToDelete)}
        onClose={() => setBackupHistoryItemToDelete(null)}
        onConfirm={handleDeleteBackupHistoryItem}
        title={isRTL ? 'حذف النسخة الاحتياطية المحلية' : 'Delete Local Backup'}
        description={isRTL
          ? `سيتم حذف النسخة المحلية ${backupHistoryItemToDelete?.fileName || ''} من التخزين المحلي ومن سجل العمليات. لا يمكن التراجع عن هذه العملية.`
          : `The local backup ${backupHistoryItemToDelete?.fileName || ''} will be removed from local storage and backup history. This action cannot be undone.`}
        confirmLabel={isRTL ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="danger"
        isRTL={isRTL}
      />
    </motion.div>
  );
}
