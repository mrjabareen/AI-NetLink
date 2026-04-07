import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Filter, MoreVertical, Phone, Mail, MapPin, Activity, Wifi, ShieldCheck, AlertCircle, Send, Plus, X, MessageSquare, CheckSquare, Square, MinusSquare, Smartphone, Zap, CheckCircle2, Calendar, WifiOff, RefreshCw } from 'lucide-react';
import { AppState, BaseSubscriberRecord, ContactEntry, MessageTemplate, RouterRecord } from '../types';
import { dict } from '../dict';
import { fetchSubscribers, BASE_URL, getMessageData, saveMessageData, activateSubscriber, fetchRoutersList, extendSubscriber } from '../api';
import { getSmartMatchScore, smartMatch } from '../utils/search';
import { toastError, toastInfo, toastSuccess } from '../utils/notify';
import AppConfirmDialog from './AppConfirmDialog';
import AppPromptDialog from './AppPromptDialog';

interface CrmTabProps {
  state: AppState;
}

type CustomerRecord = BaseSubscriberRecord & {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  plan: string;
  status: 'active' | 'inactive';
  health: 'good' | 'offline';
  type?: string;
  subType?: string;
  balance?: number | string;
};

type MessageGroup = {
  id: string;
  name: string;
  numbers: Array<string | ContactEntry>;
};

export default function CrmTab({ state }: CrmTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Bulk selection state (Set of customer IDs)
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
  
  // Modals
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [messageTypes, setMessageTypes] = useState<Set<string>>(new Set(['sms']));
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activationOption, setActivationOption] = useState<'today' | 'first_of_month'>('today');
  const [isActivating, setIsActivating] = useState(false);
  const [activationTarget, setActivationTarget] = useState('all');
  const [routersList, setRoutersList] = useState<RouterRecord[]>([]);
  const [adHocList, setAdHocList] = useState<ContactEntry[]>([{name: '', phone: '', email: ''}]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extensionTarget, setExtensionTarget] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<{unit: 'hours' | 'days', value: number} | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [managerTab, setManagerTab] = useState<'templates'|'groups'>('templates');
  const [disconnectCandidate, setDisconnectCandidate] = useState<CustomerRecord | null>(null);
  const [groupDraftName, setGroupDraftName] = useState('');
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [isGroupPromptOpen, setIsGroupPromptOpen] = useState(false);
  const [isTemplatePromptOpen, setIsTemplatePromptOpen] = useState(false);
  
  // Message Data Data
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    loadCustomers();
    loadMsgData();
  }, []);

  useEffect(() => {
    const loadRouters = async () => {
      try {
        const routers = await fetchRoutersList();
        setRoutersList(routers || []);
      } catch (e) { console.error(e); }
    };
    loadRouters();
  }, []);

  const loadMsgData = async () => {
    const data = await getMessageData();
    setTemplates(data.templates || []);
    setGroups(data.groups || []);
  };

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubscribers();
      const mapped: CustomerRecord[] = (data || []).map((item: Record<string, unknown>) => {
        const name = item.firstname || item.name || 'Unknown';
        const phone = item.phone || item['رقم الموبايل'] || '';
        const statusRaw = item.status || item['حالة الحساب'] || 'unknown';
        const isActive = statusRaw === 'active' || statusRaw === 'مفعل';
        
        return {
          ...item,
          id: item.id || item.username || `CUST-${Math.random().toString(36).substr(2, 6)}`,
          name,
          type: item['نوع الاشتراك'] || item.subType || 'Customer',
          status: isActive ? 'active' : 'inactive',
          phone,
          email: item.email || item.emailAddress || '',
          location: item.address || item['عنوان المشترك'] || item.city || (isRTL ? 'غير محدد' : 'Unknown'),
          plan: item.plan || item['سرعة الخط'] || (isRTL ? 'لا يوجد' : 'None'),
          health: isActive ? 'good' : 'offline',
        };
      });
      
      setCustomers(mapped);
      if (mapped.length > 0) setSelectedCustomer(mapped[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers
    .map(c => ({
      customer: c,
      score: Math.max(
        getSmartMatchScore(searchTerm, c.name),
        getSmartMatchScore(searchTerm, c.phone),
        getSmartMatchScore(searchTerm, c.email),
        getSmartMatchScore(searchTerm, c.id),
      ),
    }))
    .filter(({ customer, score }) =>
      !searchTerm ||
      score > 0 ||
      smartMatch(searchTerm, customer.name) ||
      smartMatch(searchTerm, customer.phone) ||
      smartMatch(searchTerm, customer.email) ||
      smartMatch(searchTerm, customer.id)
    )
    .sort((a, b) => b.score - a.score || a.customer.name.localeCompare(b.customer.name))
    .map(({ customer }) => customer);

  const toggleBulkSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelect = new Set(selectedBulk);
    if (newSelect.has(id)) newSelect.delete(id);
    else newSelect.add(id);
    setSelectedBulk(newSelect);
  };

  const toggleSelectAll = () => {
    if (selectedBulk.size > 0) {
      setSelectedBulk(new Set());
    } else {
      setSelectedBulk(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const openBulkModal = () => {
    if (selectedBulk.size === 0) return;
    setSelectedCustomer(null); // Clear single focus to prefer bulk logic
    setIsSmsModalOpen(true);
  };

  const handleSendMessage = async () => {
    // Collect target numbers & emails
    let mobileTargets: string[] = [];
    let emailTargets: string[] = [];
    
    const validAdHoc = adHocList.filter(n => (n.phone && n.phone.trim() !== '') || (n.email && n.email.trim() !== ''));
    if (validAdHoc.length > 0) {
      mobileTargets = validAdHoc.filter(n => n.phone && n.phone.trim() !== '').map(n => n.phone.trim());
      emailTargets = validAdHoc.filter(n => n.email && n.email.trim() !== '').map(n => n.email.trim());
    } else if (selectedGroup) {
      const g = groups.find(g => g.id === selectedGroup);
      if (g) {
         mobileTargets = g.numbers.map((n) => typeof n === 'string' ? n : n.phone).filter(Boolean);
      }
    } else if (selectedBulk.size > 0) {
      const selected = customers.filter(c => selectedBulk.has(c.id));
      mobileTargets = selected.map(c => c.phone).filter(Boolean);
      emailTargets = selected.map(c => c.email).filter(Boolean);
    } else if (selectedCustomer) {
      if (selectedCustomer.phone) mobileTargets.push(selectedCustomer.phone);
      if (selectedCustomer.email) emailTargets.push(selectedCustomer.email);
    }
    
    if (!messageText) {
      toastError(isRTL ? 'الرجاء إدخال نص الرسالة.' : 'Please enter a message text.', isRTL ? 'بيانات ناقصة' : 'Missing Content');
      return;
    }
    
    if (messageTypes.size === 0) {
      toastError(isRTL ? 'يجب تفعيل قناة إرسال واحدة على الأقل.' : 'Please enable at least one gateway.', isRTL ? 'بيانات ناقصة' : 'Missing Channel');
      return;
    }
    
    setIsSending(true);
    const promises = [];
    
    // WhatsApp Dispatch
    if (messageTypes.has('whatsapp') && mobileTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(r => r.json().then(data => ({ type: 'WhatsApp', ok: !data.error, data })))
          .catch(e => ({ type: 'WhatsApp', ok: false, data: { error: e.message } }))
      );
    }
    
    // SMS Dispatch
    if (messageTypes.has('sms') && mobileTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileTargets, text: messageText })
        }).then(r => r.json().then(data => ({ type: 'SMS', ok: !data.error, data })))
          .catch(e => ({ type: 'SMS', ok: false, data: { error: e.message } }))
      );
    }
    
    // Email Dispatch
    if (messageTypes.has('email') && emailTargets.length > 0) {
      promises.push(
        fetch(`${BASE_URL}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailTargets, text: messageText, subject: isRTL ? 'إشعار من ساس نت (SAS NET)' : 'Notification from SAS NET' })
        }).then(r => r.json().then(data => ({ type: 'Email', ok: !data.error, data })))
          .catch(e => ({ type: 'Email', ok: false, data: { error: e.message } }))
      );
    }
    
    if (promises.length === 0) {
      toastInfo(isRTL ? 'لا يوجد جهات اتصال تناسب القنوات المفعلة حاليًا.' : 'No valid contacts found for the selected gateways.', isRTL ? 'لا توجد نتائج' : 'No Valid Contacts');
      setIsSending(false);
      return;
    }
    
    try {
      const results = await Promise.all(promises);
      const errors = results.filter(r => !r.ok);
      
      let finalMessage = isRTL ? 'نتائج الإرسال:\n\n' : 'Dispatch Results:\n\n';
      results.forEach(r => {
         if(r.ok) finalMessage += `✅ ${r.type}: ${isRTL?'ناجح':'Success'}\n`;
         else finalMessage += `❌ ${r.type}: ${isRTL?'فشل':'Failed'} (${r.data?.error || 'Unknown'})\n`;
      });
      
      if (errors.length === 0) {
        toastSuccess(isRTL ? 'تم إرسال الرسائل بنجاح عبر القنوات المحددة.' : 'Messages were sent successfully through the selected channels.', isRTL ? 'اكتمل الإرسال' : 'Dispatch Completed', 4500);
      } else {
        toastInfo(finalMessage.replace(/\n/g, ' '), isRTL ? 'نتائج الإرسال' : 'Dispatch Results', 5000);
      }
      
      if (errors.length === 0) {
        setIsSmsModalOpen(false);
        setMessageText('');
        setSelectedBulk(new Set());
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : (isRTL ? 'خطأ غير معروف' : 'Unknown error');
      toastError(isRTL ? `حدث خطأ غير متوقع: ${message}` : `Unexpected error: ${message}`, isRTL ? 'خطأ غير متوقع' : 'Unexpected Error');
    } finally {
      setIsSending(false);
    }
  };

  const handleActivateSubscriber = async () => {
    if (!selectedCustomer) return;
    setIsActivating(true);
    try {
      const data = await activateSubscriber(selectedCustomer.id, activationOption, activationTarget);
      if (data.success) {
        toastSuccess(data.message || (isRTL ? `تم تفعيل المشترك بنجاح حتى: ${data.displayExpiry}` : `Activated successfully until: ${data.displayExpiry}`), isRTL ? 'تم التفعيل' : 'Activation Completed');
        setIsActivateModalOpen(false);
        loadCustomers(); 
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : (isRTL ? 'فشل التفعيل' : 'Activation failed');
      toastError(message, isRTL ? 'فشل التفعيل' : 'Activation Failed');
    } finally {
      setIsActivating(false);
    }
  };

  const handleExtendSubscriber = async (duration: { unit: 'hours' | 'days', value: number }) => {
    if (!selectedCustomer) return;
    setIsExtending(true);
    try {
      await extendSubscriber(selectedCustomer.id, duration, extensionTarget);
      toastSuccess(isRTL ? 'تم تمديد الصلاحية بنجاح.' : 'Service extended successfully.', isRTL ? 'تم التمديد' : 'Extension Completed');
      setIsExtendModalOpen(false);
      loadCustomers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isRTL ? 'فشل التمديد' : 'Extension failed');
      console.error(err);
      toastError(message, isRTL ? 'فشل التمديد' : 'Extension Failed');
    } finally {
      setIsExtending(false);
    }
  };

  const handleDisconnectCustomer = async () => {
    if (!disconnectCandidate) return;
    try {
      const res = await fetch(`${BASE_URL}/network/disconnect/${disconnectCandidate.username || disconnectCandidate.id}`, { method: 'POST' });
      const data = await res.json();
      toastInfo(data.message, isRTL ? 'نتيجة العملية' : 'Operation Result');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : (isRTL ? 'فشل العملية' : 'Operation failed');
      toastError(message, isRTL ? 'فشل العملية' : 'Operation Failed');
    } finally {
      setDisconnectCandidate(null);
    }
  };

  const handleSaveAdHocGroup = async () => {
    if (!groupDraftName.trim()) return;
    const validItems = adHocList.filter(n => n.phone.trim() !== '' || n.email.trim() !== '');
    if (validItems.length === 0) {
      toastInfo(isRTL ? 'لا توجد أرقام أو عناوين بريد صالحة للحفظ كمجموعة.' : 'There are no valid contacts to save as a group.', isRTL ? 'لا توجد بيانات' : 'No Valid Contacts');
      return;
    }
    const newGrp = { id: Math.random().toString(36).substr(2,9), name: groupDraftName, numbers: validItems };
    const newData = { templates, groups: [...groups, newGrp] };
    await saveMessageData(newData);
    setGroups(newData.groups);
    setGroupDraftName('');
    setIsGroupPromptOpen(false);
    toastSuccess(isRTL ? 'تم حفظ المجموعة بنجاح.' : 'Group saved successfully.', isRTL ? 'تم الحفظ' : 'Group Saved');
  };

  const handleSaveTemplatePrompt = async () => {
    if (!templateDraftName.trim()) return;
    if (!messageText.trim()) {
      toastError(isRTL ? 'أدخل نص الرسالة أولًا قبل حفظها كقالب.' : 'Enter the message text before saving it as a template.', isRTL ? 'بيانات ناقصة' : 'Missing Content');
      return;
    }
    const newTpl = { id: Math.random().toString(36).substr(2,9), name: templateDraftName, text: messageText };
    const newData = { templates: [...templates, newTpl], groups };
    await saveMessageData(newData);
    setTemplates(newData.templates);
    setTemplateDraftName('');
    setIsTemplatePromptOpen(false);
    toastSuccess(isRTL ? 'تم حفظ القالب بنجاح.' : 'Template saved successfully.', isRTL ? 'تم الحفظ' : 'Template Saved');
  };

  return (
    <motion.div key="crm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col p-4 lg:p-8 space-y-8 overflow-y-auto overflow-x-hidden lg:overflow-hidden min-h-0 h-full lg:h-[calc(100vh-8rem)] max-w-7xl mx-auto w-full pb-32 lg:pb-0 relative">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Users className="w-10 h-10 text-blue-500" />
            {t.nav.crm}
          </h2>
          <p className="text-sm md:text-xl text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-2xl leading-relaxed">
            {isRTL ? 'إدارة علاقات العملاء ومشتركي الشبكة' : 'Manage Customer Relationships and Subscribers'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors`} />
            <input
              type="text"
              placeholder={isRTL ? 'البحث عن عميل (الاسم، الرقم، الآي دي)...' : 'Search customer...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-80 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl ${isRTL ? 'pr-12 pl-6' : 'pl-12 pr-6'} py-4 text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:text-white transition-all shadow-sm`}
            />
          </div>
          <button onClick={() => {
            setSelectedBulk(new Set());
            setSelectedCustomer(null);
            setAdHocList([{name: '', phone: ''}]);
            setSelectedGroup('');
            setIsSmsModalOpen(true);
          }} className="p-3 lg:px-4 lg:py-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm">
            <Send className="w-5 h-5" />
            <span className="hidden lg:inline">{isRTL ? 'إرسال حر (Ad-Hoc)' : 'Direct Send'}</span>
          </button>
          <button onClick={() => setIsManagerModalOpen(true)} className="p-3 lg:px-4 lg:py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm">
            <MessageSquare className="w-5 h-5" />
            <span className="hidden lg:inline">{isRTL ? 'إدارة القوالب' : 'Manage Setup'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 relative">
        {/* Customer List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-[#18181B] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-[500px] lg:h-full shrink-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="text-slate-500 hover:text-blue-500 transition-colors">
                {selectedBulk.size === 0 ? (
                  <Square className="w-6 h-6" />
                ) : selectedBulk.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
                  <CheckSquare className="w-6 h-6 text-blue-500" />
                ) : (
                  <MinusSquare className="w-6 h-6 text-blue-500" />
                )}
              </button>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {isRTL ? 'عملاء الشبكة' : 'Customer Directory'}
              </h3>
            </div>
            <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold">{filteredCustomers.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <Activity className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center gap-4 text-slate-400 justify-center h-full">
                 <Users className="w-12 h-12 opacity-50" />
                 <p>{isRTL ? 'لم يتم العثور على عملاء' : 'No customers found'}</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelectedBulk = selectedBulk.has(customer.id);
                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                        setSelectedCustomer(customer);
                        // If they click the row while bulk selecting, don't clear bulk, just view details
                    }}
                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 border ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 shadow-sm'
                        : isSelectedBulk ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-transparent' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                    }`}
                  >
                    <div onClick={(e) => toggleBulkSelect(customer.id, e)} className="p-2 -m-2 opacity-70 hover:opacity-100 transition-opacity">
                       {isSelectedBulk ? <CheckSquare className="w-6 h-6 text-blue-500" /> : <Square className="w-6 h-6 text-slate-300 dark:text-slate-600 hover:text-blue-500" />}
                    </div>
                    
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xl font-black shrink-0 relative">
                      {(customer.name || '?').charAt(0)}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#18181B] ${customer.health === 'good' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">{customer.name}</h4>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">{customer.phone} • {customer.type}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Floating Bulk Action Bar */}
          <AnimatePresence>
             {selectedBulk.size > 0 && (
                 <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-4 left-4 right-4 bg-slate-900 dark:bg-indigo-950 p-4 rounded-2xl shadow-2xl flex items-center justify-between text-white border border-slate-700 dark:border-indigo-800">
                    <span className="font-bold shrink-0">{isRTL ? `محدد: ${selectedBulk.size}` : `${selectedBulk.size} selected`}</span>
                    <button onClick={openBulkModal} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2">
                         <MessageSquare className="w-5 h-5" />
                         {isRTL ? 'إرسال للمحددين' : 'Send to Selected'}
                    </button>
                 </motion.div>
             )}
          </AnimatePresence>
        </div>

        {/* Customer Details */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#18181B] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-sm overflow-hidden min-h-[600px] lg:min-h-0">
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 overflow-y-auto"
            >
              {/* Header Profile */}
              <div className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/30 dark:to-slate-900/30 relative overflow-hidden">
                <div className="flex items-center gap-6 lg:gap-8 relative z-10 flex-wrap lg:flex-nowrap">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-blue-500/20 shrink-0">
                    {(selectedCustomer.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{selectedCustomer.name}</h2>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedCustomer.health === 'good' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                      }`}>
                        {selectedCustomer.health === 'good' ? (isRTL ? 'مفعل' : 'Active') : (isRTL ? 'موقوف' : 'Inactive')}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-4 lg:gap-6 mt-4 text-base lg:text-lg text-slate-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-2 bg-white flex-1 min-w-[200px] dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"><Phone className="w-5 h-5 text-blue-500 shrink-0" /> <span className="truncate">{selectedCustomer.phone || '-'}</span></span>
                      <span className="flex items-center gap-2 bg-white flex-1 min-w-[200px] dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"><MapPin className="w-5 h-5 text-rose-500 shrink-0" /> <span className="truncate">{selectedCustomer.location}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 col-span-1 lg:col-span-2 shadow-sm">
                  <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex gap-2 items-center">
                    <Activity className="w-5 h-5 text-teal-500" />
                    {isRTL ? 'التفاعل والدعم المباشر' : 'Direct Engagement'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => { setSelectedBulk(new Set()); setIsSmsModalOpen(true); }}
                      className="p-5 flex flex-col gap-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all border border-blue-100/50 dark:border-blue-500/20 items-center justify-center"
                    >
                      <MessageSquare className="w-8 h-8" />
                      {isRTL ? 'رسالة فردية' : 'Send Message'}
                    </button>
                    <button 
                      onClick={() => setIsTicketModalOpen(true)}
                      className="p-5 flex flex-col gap-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all border border-amber-100/50 dark:border-amber-500/20 items-center justify-center"
                    >
                      <AlertCircle className="w-8 h-8" />
                      {isRTL ? 'إصدار تذكرة دعم' : 'Issue Ticket'}
                    </button>
                    <button 
                      onClick={() => setIsActivateModalOpen(true)}
                      className="p-5 flex flex-col gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100/50 dark:border-emerald-500/20 items-center justify-center font-black"
                    >
                      <Zap className="w-8 h-8" />
                      {isRTL ? 'تفعيل الاشتراك' : 'Activate Plan'}
                    </button>
                    <button 
                      onClick={async () => {
                        const routers = await fetchRoutersList();
                        setRoutersList(routers || []);
                        setSelectedDuration(null);
                        setIsExtendModalOpen(true);
                      }}
                      className="p-5 flex flex-col gap-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all border border-amber-100/50 dark:border-amber-500/20 items-center justify-center font-black shadow-lg shadow-amber-500/5"
                    >
                      <Calendar className="w-8 h-8" />
                      {isRTL ? 'تمديد مؤقت' : 'Temporary Extension'}
                    </button>
                    <button 
                      onClick={async () => {
                        if (!selectedCustomer) return;
                        setDisconnectCandidate(selectedCustomer);
                      }}
                      className="p-5 flex flex-col gap-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all border border-rose-100/50 dark:border-rose-500/20 items-center justify-center font-black"
                    >
                      <WifiOff className="w-8 h-8" />
                      {isRTL ? 'قطع الاتصال (Kick)' : 'Disconnect User'}
                    </button>
                    <button className="p-5 flex flex-col gap-3 justify-center items-center rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-lg hover:border-blue-500 transition-all border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 sm:col-span-2 md:col-span-3">
                      <Wifi className="w-8 h-8 text-indigo-500" />
                      {isRTL ? 'تحديث الباقة' : 'Change Plan'}
                    </button>
                  </div>
                </div>

                {/* Service Status */}
                <div className="col-span-1 lg:col-span-2 bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">
                    {isRTL ? 'البيانات الفنية والمالية' : 'Technical & Financial'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'سرعة الخط / الخطة' : 'Line Speed / Plan'}</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{selectedCustomer.plan}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'نوع الاشتراك' : 'Subscription Type'}</p>
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{selectedCustomer.subType || selectedCustomer['نوع الاشتراك'] || selectedCustomer.type}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedCustomer.expiry || selectedCustomer['تاريخ الانتهاء'] || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'وقت انتهاء التفعيل' : 'Activation Expiry Time'}</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedCustomer.expiry_time || selectedCustomer['وقت الانتهاء'] || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'الرصيد' : 'Balance'}</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{selectedCustomer.balance ?? '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{isRTL ? 'الديون' : 'Debt'}</p>
                      <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{selectedCustomer['عليه دين'] ?? '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Users className="w-20 h-20 opacity-20" />
              <p className="text-2xl font-bold opacity-50 text-center">
                {selectedBulk.size > 0 
                    ? (isRTL ? `وضع الإرسال الجماعي مفعل (${selectedBulk.size})` : `Bulk Mode Active (${selectedBulk.size})`)
                    : (isRTL ? 'حدد عميلاً لعرض التفاصيل' : 'Select a customer')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isSmsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSmsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl overflow-hidden glass-card border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                  <Send className="text-blue-500 w-6 h-6" />
                  {isRTL ? 'توجيه رسالة' : 'Send Message'}
                  {selectedBulk.size > 0 && (
                     <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black dark:bg-amber-500/20">{isRTL ? 'جماعي BULK' : 'BULK'}</span>
                  )}
                </h3>
                <button onClick={() => setIsSmsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700 shadow-sm"><X size={20}/></button>
              </div>
               <div className="p-8 space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">{isRTL ? 'الجهة المستقبلة' : 'To Recipients'}</label>
                  {selectedBulk.size === 0 && !selectedCustomer ? (
                     <div className="space-y-4">
                       <div className="bg-slate-50 dark:bg-[#18181B] rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                         <div className="flex items-center justify-between">
                           <label className="text-xs font-bold text-slate-500 uppercase">{isRTL ? 'إدخال أرقام مباشرة (Ad-Hoc)' : 'Direct Contacts (Ad-Hoc)'}</label>
                           <button onClick={() => setAdHocList([...adHocList, {name: '', phone: ''}])} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded-md transition-colors">
                             + {isRTL ? 'إضافة سطر' : 'Add Row'}
                           </button>
                         </div>
                         
                         {adHocList.map((item, index) => (
                           <div key={index} className="flex items-center gap-2">
                             <input 
                               type="text"
                               placeholder={isRTL ? 'الاسم (اختياري)' : 'Name'}
                               value={item.name || ''}
                               onChange={(e) => {
                                 const newList = [...adHocList];
                                 newList[index].name = e.target.value;
                                 setAdHocList(newList);
                                 setSelectedGroup('');
                               }}
                               className="w-1/4 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:border-teal-500 outline-none"
                             />
                             <input 
                               type="text"
                               placeholder={isRTL ? 'رقم الهاتف' : 'Phone'}
                               value={item.phone || ''}
                               onChange={(e) => {
                                 const newList = [...adHocList];
                                 newList[index].phone = e.target.value;
                                 setAdHocList(newList);
                                 setSelectedGroup('');
                               }}
                               className="w-1/3 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:border-teal-500 outline-none font-mono tracking-wider"
                             />
                             <input 
                               type="email"
                               placeholder={isRTL ? 'البريد' : 'Email'}
                               value={item.email || ''}
                               onChange={(e) => {
                                 const newList = [...adHocList];
                                 newList[index].email = e.target.value;
                                 setAdHocList(newList);
                                 setSelectedGroup('');
                               }}
                               className="flex-1 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:border-teal-500 outline-none font-mono"
                             />
                             {adHocList.length > 1 && (
                               <button onClick={() => setAdHocList(adHocList.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-lg">
                                 <X size={16} />
                               </button>
                             )}
                           </div>
                         ))}
                       </div>

                       {groups.length > 0 && (
                         <div className="flex gap-2 items-center">
                           <select 
                             value={selectedGroup}
                             onChange={e => {
                               setSelectedGroup(e.target.value);
                               setAdHocList([{name: '', phone: '', email: ''}]);
                             }}
                             className="flex-1 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 shadow-sm transition-all"
                           >
                             <option value="">{isRTL ? '-- أو اختر مجموعة مسجلة مسبقاً --' : '-- Or select an existing group --'}</option>
                             {groups.map(g => (
                               <option key={g.id} value={g.id}>{g.name} ({g.numbers.length})</option>
                             ))}
                           </select>
                         </div>
                       )}
                       
                       {adHocList.some(i => i.phone.trim() !== '' || i.email.trim() !== '') && (
                         <div className="flex justify-end">
                          <button onClick={() => setIsGroupPromptOpen(true)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-indigo-500 transition-colors">
                             + {isRTL ? 'حفظ الأرقام كمجموعة جديدة' : 'Save numbers as new Group'}
                           </button>
                         </div>
                       )}
                     </div>
                  ) : (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-500 font-mono font-bold">
                        {selectedBulk.size > 0 
                            ? (isRTL ? `[ إرسال جماعي لـ ${selectedBulk.size} مشترك محدد ]` : `[ Bulk Sending to ${selectedBulk.size} users ]`)
                            : ([selectedCustomer?.phone, selectedCustomer?.email].filter(Boolean).join(' - ') || (isRTL ? 'لا يوجد هاتف ولا بريد' : 'No contact info'))
                        }
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">{isRTL ? 'ممر الإرسال (البوابة)' : 'Message Gateway'}</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('whatsapp')) newT.delete('whatsapp'); else newT.add('whatsapp');
                        setMessageTypes(newT);
                    }} className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border-2 text-xs md:text-sm ${messageTypes.has('whatsapp') ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> WhatsApp
                    </button>
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('sms')) newT.delete('sms'); else newT.add('sms');
                        setMessageTypes(newT);
                    }} className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border-2 text-xs md:text-sm ${messageTypes.has('sms') ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <Smartphone className="w-4 h-4 md:w-5 md:h-5" /> SMS
                    </button>
                    <button onClick={() => {
                        const newT = new Set(messageTypes);
                        if(newT.has('email')) newT.delete('email'); else newT.add('email');
                        setMessageTypes(newT);
                    }} className={`p-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border-2 text-xs md:text-sm ${messageTypes.has('email') ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      <Mail className="w-4 h-4 md:w-5 md:h-5" /> Email
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col mb-4 gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider block">{isRTL ? 'محتوى الرسالة الذكية' : 'Smart Message Text'}</label>
                    </div>
                    {templates.length > 0 && (
                      <select 
                        value={selectedTemplate}
                        onChange={e => {
                          setSelectedTemplate(e.target.value);
                          const tpl = templates.find(t => t.id === e.target.value);
                          if(tpl) setMessageText(tpl.text);
                        }}
                        className="w-full bg-white dark:bg-[#09090B] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-teal-600 dark:text-teal-400 outline-none focus:border-teal-500 shadow-sm transition-all"
                      >
                         <option value="">{isRTL ? '-- استرداد من القوالب المحفوظة (اختياري) --' : '-- Load from saved templates (Optional) --'}</option>
                         {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                  <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium" placeholder={isRTL ? 'عزيزي المشترك، نود تذكيرك بأن اشتراك الإنترنت...' : 'Type message here...'}></textarea>
                  
                  <div className="flex justify-end mt-2">
                     <button onClick={() => setIsTemplatePromptOpen(true)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-teal-500 transition-colors">
                       + {isRTL ? 'حفظ كقالب جديد' : 'Save as new Template'}
                     </button>
                  </div>
                </div>
                <button onClick={handleSendMessage} disabled={isSending} className={`w-full py-4 rounded-xl font-bold flex flex-row items-center justify-center gap-3 text-white transition-all shadow-xl bg-slate-800 hover:bg-slate-900 shadow-slate-500/20 dark:bg-slate-700 hover:dark:bg-slate-600`}>
                  {isSending ? <Activity className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {isSending ? '...' : (isRTL ? `المصادقة وإطلاق ${messageTypes.size} قنوات` : `Dispatch to ${messageTypes.size} Channels`)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTicketModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl overflow-hidden glass-card border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-10 text-center">
                <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{isRTL ? 'تأسيس تذكرة إلكترونية' : 'Open Ticket'}</h3>
                <p className="text-slate-500">{isRTL ? 'ميزة التذاكر سيتم جدولتها ضمن مرحلة إدارة الأعطال التالية.' : 'Ticketing logic will be scheduled for next release phase.'}</p>
                <div className="mt-8">
                  <button onClick={() => setIsTicketModalOpen(false)} className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600">{isRTL ? 'فهمت، أغلق' : 'Got it'}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActivateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActivateModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Zap className="text-emerald-500 w-8 h-8" />
                  {isRTL ? 'تفعيل اشتراك المشترك' : 'Activate Subscriber'}
                </h3>
                <button onClick={() => setIsActivateModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">{isRTL ? 'المشترك المختصر' : 'Selected Subscriber'}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{selectedCustomer?.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{isRTL ? `الباقة الحالية: ${selectedCustomer?.plan}` : `Current Plan: ${selectedCustomer?.plan}`}</p>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'متى يبدأ الاشتراك؟' : 'Start Date Option'}</label>
                   <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setActivationOption('today')}
                        className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between font-bold ${activationOption === 'today' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                      >
                         <div className="flex items-center gap-3">
                            <Activity size={20} />
                            {isRTL ? 'من تاريخ اليوم' : 'From Today'}
                         </div>
                         {activationOption === 'today' && <CheckCircle2 size={20} />}
                      </button>
                      <button 
                        onClick={() => setActivationOption('first_of_month')}
                        className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between font-bold ${activationOption === 'first_of_month' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                      >
                         <div className="flex items-center gap-3">
                            <Calendar size={20} />
                            {isRTL ? 'من بداية الشهر الحالي' : 'From 1st of month'}
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
                  {isRTL ? 'تأكيد تفعيل الاشتراك الآن' : 'Confirm Activation Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isExtendModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsExtendModalOpen(false)} />
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
                    <p className="text-sm font-bold text-amber-600 dark:text-blue-400 mb-1">{isRTL ? 'تمديد للمشترك:' : 'Extending for:'}</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{selectedCustomer?.name}</p>
                    <p className="text-xs text-amber-600/70 mt-1">{isRTL ? 'ملاحظة: سيتم خصم هذه الساعات من الاشتراك القادم تلقائياً.' : 'Note: These hours will be deducted from next subscription.'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'تمديد بالساعات:' : 'Extend by Hours:'}</label>
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
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'تمديد بالأيام:' : 'Extend by Days:'}</label>
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
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'الماكرتيك المستهدف:' : 'Target MikroTik:'}</label>
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
                  disabled={!selectedDuration || isExtending}
                  className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isExtending ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={24} />}
                  {isRTL ? 'تأكيد تمديد الصلاحية الآن' : 'Confirm Extension Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isManagerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManagerModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl overflow-hidden glass-card border border-slate-200 dark:border-slate-800 text-left flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800 dark:text-white">
                  <MessageSquare className="text-indigo-500 w-6 h-6" />
                  {isRTL ? 'إدارة القوالب والمجموعات' : 'Manage Templates & Groups'}
                </h3>
                <button onClick={() => setIsManagerModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700 shadow-sm"><X size={20}/></button>
              </div>
              <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
                <button onClick={() => setManagerTab('templates')} className={`flex-1 p-4 font-bold transition-colors ${managerTab === 'templates' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                  {isRTL ? 'قوالب الرسائل' : 'Message Templates'}
                </button>
                <button onClick={() => setManagerTab('groups')} className={`flex-1 p-4 font-bold transition-colors ${managerTab === 'groups' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                  {isRTL ? 'مجموعات الأرقام' : 'Contact Groups'}
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30 dark:bg-[#18181B]/30">
                {managerTab === 'templates' && (
                  <div className="space-y-4">
                    <div className="flex justify-end mb-4">
                      <button onClick={() => {
                        const newTpl = { id: Math.random().toString(36).substr(2,9), name: isRTL ? 'قالب جديد' : 'New Template', text: '' };
                        setTemplates([newTpl, ...templates]);
                      }} className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all flex gap-2 items-center">
                        <Plus size={16} /> {isRTL ? 'إضافة قالب جديد' : 'Add New Template'}
                      </button>
                    </div>
                    {templates.length === 0 ? (
                      <p className="text-center text-slate-400 py-10">{isRTL ? 'لا يوجد قوالب محفوظة.' : 'No templates saved.'}</p>
                    ) : templates.map((tpl, idx) => (
                      <div key={tpl.id} className="bg-white dark:bg-[#09090B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative group">
                        <input 
                          type="text" 
                          value={tpl.name}
                          onChange={(e) => {
                            const nt = [...templates];
                            nt[idx].name = e.target.value;
                            setTemplates(nt);
                          }}
                          className="w-full font-bold text-lg bg-transparent border-b border-transparent focus:border-slate-200 dark:focus:border-slate-700 outline-none py-1"
                        />
                        <textarea 
                          value={tpl.text}
                          onChange={(e) => {
                            const nt = [...templates];
                            nt[idx].text = e.target.value;
                            setTemplates(nt);
                          }}
                          rows={3}
                          className="w-full bg-slate-50 dark:bg-[#18181B] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                        <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setTemplates(templates.filter(t => t.id !== tpl.id))} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {managerTab === 'groups' && (
                  <div className="space-y-4">
                    <div className="flex justify-end mb-4">
                       <button onClick={() => {
                         const newGrp = { id: Math.random().toString(36).substr(2,9), name: isRTL ? 'مجموعة جديدة' : 'New Group', numbers: [{name: '', phone: '', email: ''}] };
                         setGroups([newGrp, ...groups]);
                       }} className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all flex gap-2 items-center">
                         <Plus size={16} /> {isRTL ? 'إضافة مجموعة جديدة' : 'Add New Group'}
                       </button>
                    </div>
                    {groups.length === 0 ? (
                      <p className="text-center text-slate-400 py-10">{isRTL ? 'لا يوجد مجموعات محفوظة.' : 'No groups saved.'}</p>
                    ) : groups.map((grp, idx) => (
                      <div key={grp.id} className="bg-white dark:bg-[#09090B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative">
                        <div className="flex gap-4 pr-10 rtl:pl-10 rtl:pr-0">
                          <input 
                            type="text" 
                            value={grp.name}
                            onChange={(e) => {
                              const ng = [...groups];
                              ng[idx].name = e.target.value;
                              setGroups(ng);
                            }}
                            className="flex-1 font-bold text-lg bg-transparent border-b border-transparent focus:border-slate-200 dark:focus:border-slate-700 outline-none py-1"
                          />
                        </div>
                        <div className="space-y-2">
                           {grp.numbers.map((numItem: string | ContactEntry, nIdx: number) => {
                             const isObj = typeof numItem === 'object';
                             const name = isObj ? numItem.name : '';
                             const phone = isObj ? numItem.phone : numItem;
                             const email = isObj ? (numItem.email || '') : '';
                             return (
                               <div key={nIdx} className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={name}
                                    placeholder={isRTL ? 'الاسم' : 'Name'}
                                    onChange={(e) => {
                                      const ng = [...groups];
                                      if(typeof ng[idx].numbers[nIdx] === 'string') ng[idx].numbers[nIdx] = {name: '', phone: ng[idx].numbers[nIdx], email: ''};
                                      ng[idx].numbers[nIdx].name = e.target.value;
                                      setGroups(ng);
                                    }}
                                    className="w-1/4 bg-slate-50 dark:bg-[#18181B] rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 border border-transparent"
                                  />
                                  <input 
                                    type="text"
                                    value={phone}
                                    placeholder={isRTL ? 'الرقم' : 'Phone'}
                                    onChange={(e) => {
                                      const ng = [...groups];
                                      if(typeof ng[idx].numbers[nIdx] === 'string') ng[idx].numbers[nIdx] = {name: '', phone: ng[idx].numbers[nIdx], email: ''};
                                      ng[idx].numbers[nIdx].phone = e.target.value;
                                      setGroups(ng);
                                    }}
                                    className="w-1/3 bg-slate-50 dark:bg-[#18181B] rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 border border-transparent font-mono"
                                  />
                                  <input 
                                    type="email"
                                    value={email}
                                    placeholder={isRTL ? 'البريد' : 'Email'}
                                    onChange={(e) => {
                                      const ng = [...groups];
                                      if(typeof ng[idx].numbers[nIdx] === 'string') ng[idx].numbers[nIdx] = {name: '', phone: ng[idx].numbers[nIdx], email: ''};
                                      ng[idx].numbers[nIdx].email = e.target.value;
                                      setGroups(ng);
                                    }}
                                    className="flex-1 bg-slate-50 dark:bg-[#18181B] rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 border border-transparent font-mono"
                                  />
                                  <button onClick={() => {
                                      const ng = [...groups];
                                      ng[idx].numbers = ng[idx].numbers.filter((_, i:number) => i !== nIdx);
                                      setGroups(ng);
                                  }} className="text-slate-400 hover:text-rose-500 p-2"><X size={14} /></button>
                               </div>
                             );
                           })}
                           <button onClick={() => {
                              const ng = [...groups];
                              ng[idx].numbers.push({name: '', phone: ''});
                              setGroups(ng);
                           }} className="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-500/10 px-3 py-1.5 rounded-lg mt-2">+ {isRTL ? 'إضافة رقم' : 'Add Number'}</button>
                        </div>
                        <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
                          <button onClick={() => setGroups(groups.filter(g => g.id !== grp.id))} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] shrink-0">
                 <button onClick={async () => {
                   await saveMessageData({templates, groups});
                   setIsManagerModalOpen(false);
                   toastSuccess(isRTL ? 'تم حفظ التحديثات بنجاح.' : 'Changes saved successfully.', isRTL ? 'تم الحفظ' : 'Saved');
                 }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex justify-center gap-2">
                   {isRTL ? 'تأكيد وحفظ التعديلات' : 'Confirm & Save Changes'}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AppConfirmDialog
        open={Boolean(disconnectCandidate)}
        onClose={() => setDisconnectCandidate(null)}
        onConfirm={handleDisconnectCustomer}
        title={isRTL ? 'قطع اتصال المشترك' : 'Disconnect Subscriber'}
        description={isRTL ? `سيتم قطع اتصال ${disconnectCandidate?.name || ''} من الراوتر، وسيحتاج إلى إعادة الاتصال.` : `${disconnectCandidate?.name || ''} will be disconnected from the router and will need to reconnect.`}
        confirmLabel={isRTL ? 'تأكيد قطع الاتصال' : 'Confirm Disconnect'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        variant="warning"
        isRTL={isRTL}
      />

      <AppPromptDialog
        open={isGroupPromptOpen}
        onClose={() => { setIsGroupPromptOpen(false); setGroupDraftName(''); }}
        onConfirm={handleSaveAdHocGroup}
        title={isRTL ? 'حفظ مجموعة جديدة' : 'Save New Group'}
        description={isRTL ? 'أدخل اسمًا واضحًا لهذه المجموعة ليتم استخدامها لاحقًا في الإرسال الجماعي.' : 'Enter a clear name for this group so it can be reused in bulk messaging.'}
        label={isRTL ? 'اسم المجموعة' : 'Group Name'}
        value={groupDraftName}
        onChange={setGroupDraftName}
        placeholder={isRTL ? 'مثال: عملاء المنطقة الشمالية' : 'Example: Northern Region Customers'}
        confirmLabel={isRTL ? 'حفظ المجموعة' : 'Save Group'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        isRTL={isRTL}
      />

      <AppPromptDialog
        open={isTemplatePromptOpen}
        onClose={() => { setIsTemplatePromptOpen(false); setTemplateDraftName(''); }}
        onConfirm={handleSaveTemplatePrompt}
        title={isRTL ? 'حفظ قالب جديد' : 'Save New Template'}
        description={isRTL ? 'أدخل اسمًا للقالب ليسهل الرجوع إليه في الرسائل اللاحقة.' : 'Enter a template name so it can be reused later.'}
        label={isRTL ? 'اسم القالب' : 'Template Name'}
        value={templateDraftName}
        onChange={setTemplateDraftName}
        placeholder={isRTL ? 'مثال: تذكير تجديد الاشتراك' : 'Example: Renewal Reminder'}
        confirmLabel={isRTL ? 'حفظ القالب' : 'Save Template'}
        cancelLabel={isRTL ? 'إلغاء' : 'Cancel'}
        isRTL={isRTL}
      />
    </motion.div>
  );
}
