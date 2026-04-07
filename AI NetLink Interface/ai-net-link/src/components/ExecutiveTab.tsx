import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Send, Mic, Paperclip, Copy, RefreshCw, Check, Database, FileText, Bot, AlertTriangle, Layers, Download, History, Trash2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { AppState } from '../types';
import { executiveChat } from '../api';

interface ExecutiveTabProps {
  state: AppState;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  sources?: { path: string; snippet: string; score?: number }[];
  stats?: { subscribers: number; managers: number; suppliers: number; investors: number; iptv: number } | null;
  isError?: boolean;
}

const EXECUTIVE_CHAT_STORAGE_KEY = 'sas4_executive_chat_history_v1';
const EXECUTIVE_BRIEF_MODE_KEY = 'sas4_executive_brief_mode';

const createWelcomeMessage = (lang: 'ar' | 'en'): Message => ({
  id: 1,
  sender: 'ai',
  text: lang === 'en'
    ? 'Welcome. I am your executive assistant. I can search internal data, inspect files, and use the web when you explicitly ask for it.'
    : 'مرحباً. أنا مساعدك التنفيذي. أستطيع البحث في البيانات الداخلية وفحص الملفات واستخدام الإنترنت عندما تطلب ذلك صراحة.',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

const sanitizeLoadedMessages = (items: any[]): Message[] => {
  return (Array.isArray(items) ? items : [])
    .map((item, index): Message => ({
      id: Number(item?.id || Date.now() + index),
      sender: item?.sender === 'user' ? 'user' : 'ai',
      text: String(item?.text || ''),
      time: String(item?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      sources: Array.isArray(item?.sources) ? item.sources : [],
      stats: null,
      isError: Boolean(item?.isError),
    }))
    .filter((item) => item.text.trim().length > 0);
};

const normalizePrompt = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanPrompt = (value: string) =>
  String(value || '')
    .replace(/^[\s\-*•.،]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

const isGreetingPrompt = (value: string) => /^(مرحبا|مرحباً|اهلا|أهلا|السلام عليكم|هلا|hi|hello|hey)$/i.test(normalizePrompt(cleanPrompt(value)));
const isIdentityPrompt = (value: string) => /^(من انت|من أنت|مين انت|مين أنت|عرفني بنفسك|who are you|what are you)$/i.test(normalizePrompt(cleanPrompt(value)));
const isBriefnessPrompt = (value: string) => /(اختصر|مختصر|لا تطل|قصير|قصيرة|brief|short|concise)/i.test(normalizePrompt(cleanPrompt(value)));
const isInsultPrompt = (value: string) => /(غبي|غباء|stupid|idiot)/i.test(normalizePrompt(cleanPrompt(value)));

const sanitizeAssistantReply = (value: string) => {
  let text = String(value || '').trim();
  text = text.replace(/\n?\s*المصادر\s*:[\s\S]*$/i, '').trim();
  text = text.replace(/\n?\s*sources\s*:[\s\S]*$/i, '').trim();
  text = text.replace(/\n?\s*أسماء الملفات المفيدة[^\n]*:[\s\S]*$/i, '').trim();
  text = text.replace(/\n?\s*الوثائق المفيدة[^\n]*:[\s\S]*$/i, '').trim();
  text = text.replace(/لدينا إحصاءات سريعة[\s\S]*?(?=\n|$)/i, '').trim();
  text = text.replace(/quick stats[\s\S]*?(?=\n|$)/i, '').trim();
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

export default function ExecutiveTab({ state }: ExecutiveTabProps) {
  const isRTL = state.lang === 'ar';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage(state.lang)]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [conversationCopied, setConversationCopied] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const [preferBriefReplies, setPreferBriefReplies] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EXECUTIVE_BRIEF_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    try {
      localStorage.setItem(EXECUTIVE_CHAT_STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        messages,
      }));
    } catch (error) {
      console.error('Failed to save executive chat history', error);
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(EXECUTIVE_BRIEF_MODE_KEY, preferBriefReplies ? 'true' : 'false');
  }, [preferBriefReplies]);

  const handleSend = (text: string = message) => {
    if (!text.trim()) return;
    const effectiveText = cleanPrompt(text);
    
    const newMessages: Message[] = [...messages, { 
      id: Date.now(), 
      sender: 'user', 
      text: effectiveText,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }];
    setMessages(newMessages);
    setMessage('');

    if (isGreetingPrompt(effectiveText)) {
      setMessages([
        ...newMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: state.lang === 'en'
            ? 'Hello, I am ready. Ask me for a specific task.'
            : 'مرحباً، أنا جاهز. اطلب مني مهمة محددة.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          stats: null,
        },
      ]);
      return;
    }

    if (isIdentityPrompt(effectiveText)) {
      setMessages([
        ...newMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: state.lang === 'en'
            ? 'I am your executive AI assistant. I can search internal data, inspect files, and help with tasks you request.'
            : 'أنا مساعدك التنفيذي الذكي. أستطيع البحث في البيانات الداخلية وفحص الملفات والويب ومساعدتك في المهام التي تطلبها.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          stats: null,
        },
      ]);
      return;
    }

    if (isBriefnessPrompt(effectiveText)) {
      setPreferBriefReplies(true);
      setMessages([
        ...newMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: state.lang === 'en'
            ? 'Understood. I will keep my replies short.'
            : 'تم. سأجعل ردودي قصيرة.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          stats: null,
        },
      ]);
      return;
    }

    if (isInsultPrompt(effectiveText)) {
      setMessages([
        ...newMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: state.lang === 'en'
            ? 'Understood. Tell me exactly what result you want, and I will answer more directly.'
            : 'فهمت. قل لي بالضبط ما النتيجة التي تريدها وسأجيب بشكل مباشر أكثر.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          stats: null,
        },
      ]);
      return;
    }

    setIsTyping(true);
    void generateAiResponse(effectiveText, newMessages);
  };

  const generateAiResponse = async (userText: string, currentMessages: Message[]) => {
    try {
      const history = currentMessages.map((item) => ({
        role: item.sender === 'ai' ? 'assistant' : 'user',
        content: item.text,
      }));

      const result = await executiveChat({
        message: userText,
        messages: history,
        aiSettings: state.aiSettings,
        language: state.lang,
      });

      const cleanedReply = sanitizeAssistantReply(result.reply || '');
      const shouldHideSources = preferBriefReplies || isBriefnessPrompt(userText) || isIdentityPrompt(userText) || isGreetingPrompt(userText);

      setMessages([
        ...currentMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: cleanedReply || (state.lang === 'en' ? 'No response returned.' : 'لم يصل رد من المحرك.'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: shouldHideSources ? [] : (result.sources || []),
          stats: result.stats || null,
        },
      ]);
    } catch (error: any) {
      setMessages([
        ...currentMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: error?.message || (state.lang === 'en' ? 'Executive AI request failed.' : 'فشل طلب المساعد التنفيذي.'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Message Actions ---

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildConversationText = () => {
    return messages.map((msg) => {
      const speaker = msg.sender === 'ai'
        ? (state.lang === 'en' ? 'Executive AI' : 'المساعد التنفيذي')
        : (state.lang === 'en' ? 'You' : 'أنت');

      const sourceBlock = msg.sources && msg.sources.length > 0
        ? `\n${state.lang === 'en' ? 'Sources' : 'المصادر'}:\n${msg.sources.map((source) => `- ${source.path}`).join('\n')}`
        : '';

      return `[${msg.time}] ${speaker}\n${msg.text}${sourceBlock}`;
    }).join('\n\n--------------------\n\n');
  };

  const handleCopyConversation = async () => {
    await navigator.clipboard.writeText(buildConversationText());
    setConversationCopied(true);
    window.setTimeout(() => setConversationCopied(false), 2000);
  };

  const handleExportConversation = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      lang: state.lang,
      messages,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `executive-chat-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreConversation = () => {
    try {
      const saved = localStorage.getItem(EXECUTIVE_CHAT_STORAGE_KEY);
      if (!saved) {
        alert(state.lang === 'en' ? 'No saved conversation was found.' : 'لم يتم العثور على محادثة محفوظة.');
        return;
      }

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed?.messages) || parsed.messages.length === 0) {
        alert(state.lang === 'en' ? 'Saved conversation is empty.' : 'المحادثة المحفوظة فارغة.');
        return;
      }

      setMessages(sanitizeLoadedMessages(parsed.messages));
    } catch (error) {
      alert(state.lang === 'en' ? 'Failed to restore the saved conversation.' : 'فشلت استعادة المحادثة المحفوظة.');
    }
  };

  const handleClearConversation = () => {
    const confirmed = window.confirm(
      state.lang === 'en'
        ? 'Do you want to clear the current conversation?'
        : 'هل تريد مسح المحادثة الحالية؟'
    );

    if (!confirmed) return;

    const welcome = createWelcomeMessage(state.lang);
    setMessages([welcome]);
    localStorage.setItem(EXECUTIVE_CHAT_STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      messages: [welcome],
    }));
  };

  const handleImportConversation = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.messages) || parsed.messages.length === 0) {
        throw new Error('Invalid conversation file.');
      }

      const sanitizedMessages = sanitizeLoadedMessages(parsed.messages);
      setMessages(sanitizedMessages);
      localStorage.setItem(EXECUTIVE_CHAT_STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        messages: sanitizedMessages,
      }));
    } catch {
      alert(state.lang === 'en' ? 'Failed to import the conversation file.' : 'فشل استيراد ملف المحادثة.');
    } finally {
      event.target.value = '';
    }
  };

  const handleUndo = (id: number) => {
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex !== -1) {
      setMessages(messages.slice(0, msgIndex));
    }
  };

  const handleRegenerate = (id: number) => {
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex > 0 && messages[msgIndex - 1].sender === 'user') {
      const userText = messages[msgIndex - 1].text;
      const slicedMessages = messages.slice(0, msgIndex);
      setMessages(slicedMessages);
      setIsTyping(true);
      void generateAiResponse(userText, slicedMessages);
    }
  };

  const toggleSources = (id: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const quickPrompts = state.lang === 'en' 
    ? ['Show subscriber and supplier summary', 'Find LiteBeam programming guide', 'Summarize available internet packages', 'Show important investor data']
    : ['اعرض ملخص المشتركين والموردين', 'ابحث عن دليل برمجة LiteBeam', 'لخص الباقات المتاحة', 'اعرض أهم بيانات المستثمرين'];

  return (
    <motion.div key="executive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-4 md:mb-6 shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="text-amber-500" size={28} />
            {state.lang === 'en' ? 'Executive AI Assistant' : 'المساعد التنفيذي للذكاء الاصطناعي'}
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {state.lang === 'en' ? 'Real AI answers powered by internal database and knowledge files.' : 'إجابات حقيقية مدعومة بقاعدة البيانات والملفات المعرفية الداخلية.'}
          </p>
        </div>
        
        <div className="self-start md:self-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Database size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">
              {state.lang === 'en' ? 'INTERNAL DATA CONNECTED' : 'متصل بالبيانات الداخلية'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-slate-50/50 dark:bg-[#09090B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl md:rounded-3xl flex flex-col overflow-hidden shadow-sm relative">
        
        {/* Executive Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-amber-500/5 blur-[100px] pointer-events-none"></div>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportConversation}
          className="hidden"
        />

        <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-[#09090B]/80 backdrop-blur-md z-10">
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111111]/70 p-3 md:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {state.lang === 'en' ? 'Conversation Tools' : 'أدوات المحادثة'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {state.lang === 'en' ? 'Manage copying, exporting, restoring, importing, and clearing the current chat.' : 'إدارة نسخ المحادثة وتصديرها واستعادتها واستيرادها ومسحها.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyConversation}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18181B] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  {conversationCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {state.lang === 'en' ? 'Copy' : 'نسخ'}
                </button>
                <button
                  onClick={handleExportConversation}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18181B] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  <Download size={14} />
                  {state.lang === 'en' ? 'Export' : 'تصدير'}
                </button>
                <button
                  onClick={handleRestoreConversation}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18181B] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  <History size={14} />
                  {state.lang === 'en' ? 'Restore' : 'استعادة'}
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18181B] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  <Upload size={14} />
                  {state.lang === 'en' ? 'Import' : 'استيراد'}
                </button>
                <button
                  onClick={handleClearConversation}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/20 text-xs font-bold text-rose-700 dark:text-rose-300 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
                >
                  <Trash2 size={14} />
                  {state.lang === 'en' ? 'Clear' : 'مسح'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-[#09090B]/80 backdrop-blur-md z-10 flex gap-2 overflow-x-auto custom-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSend(prompt)} 
              className="whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-amber-200/50 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-all cursor-pointer shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-6 md:space-y-8 z-10 custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                key={msg.id} 
                className={`flex gap-2 md:gap-4 max-w-[95%] md:max-w-3xl group ${msg.sender === 'user' ? 'flex-row-reverse self-end ms-auto' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                  msg.sender === 'ai' 
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 dark:border-amber-700' 
                    : 'bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-slate-600'
                }`}>
                  {msg.sender === 'ai' 
                    ? <Briefcase size={18} className="text-white" />
                    : <span className="text-[10px] md:text-xs font-bold text-white uppercase">CEO</span>
                  }
                </div>
                
                {/* Message Content */}
                <div className={`flex flex-col gap-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'} w-full min-w-0`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {msg.sender === 'ai' ? 'SAS NET Executive AI' : (state.lang === 'en' ? 'CEO' : 'المدير التنفيذي')}
                    </span>
                    <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-mono">{msg.time}</span>
                    {msg.isEdited && <span className="text-[9px] text-slate-400 italic">({state.lang === 'en' ? 'edited' : 'معدل'})</span>}
                  </div>
                  
                  <div className={`relative p-4 md:p-5 shadow-sm w-full ${
                    msg.sender === 'ai' 
                      ? 'bg-white dark:bg-[#18181B] border border-slate-100 dark:border-slate-800/50 rounded-2xl rounded-tl-sm text-slate-800 dark:text-slate-200' 
                      : 'bg-slate-800 dark:bg-slate-700 text-white rounded-2xl rounded-tr-sm'
                  }`}>
                    
                    {/* Inline Edit Mode */}
                    <>
                      <p className={`text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium break-words ${msg.isError ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {msg.text}
                      </p>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                          >
                            <Layers size={14} />
                            {state.lang === 'en' ? 'Show Sources' : 'إظهار المصادر'}
                            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px]">
                              {msg.sources.length}
                            </span>
                            {expandedSources[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {expandedSources[msg.id] && (
                            <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                <Layers size={16} />
                                {state.lang === 'en' ? 'Internal Sources' : 'المصادر الداخلية'}
                              </div>
                              <div className="space-y-3">
                                {msg.sources.slice(0, 4).map((source, idx) => (
                                  <div key={`${source.path}-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111111] p-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 break-all">
                                      <FileText size={13} />
                                      {source.path}
                                    </div>
                                    <p className="mt-2 text-xs md:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                                      {source.snippet}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>

                    {/* Message Action Menu (Hover) */}
                    <div className={`absolute -bottom-3 md:-bottom-4 ${msg.sender === 'user' ? 'left-4' : 'right-4'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-slate-700 rounded-lg shadow-md p-1 z-10`}>
                      <button 
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                        title={state.lang === 'en' ? 'Copy' : 'نسخ'}
                      >
                        {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      
                      {msg.sender === 'user' && (
                        <button 
                          onClick={() => handleUndo(msg.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors"
                          title={state.lang === 'en' ? 'Undo / Delete' : 'تراجع / حذف'}
                        >
                          <AlertTriangle size={14} />
                        </button>
                      )}

                      {msg.sender === 'ai' && !msg.isError && (
                        <button 
                          onClick={() => handleRegenerate(msg.id)}
                          className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                          title={state.lang === 'en' ? 'Regenerate' : 'إعادة التوليد'}
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 md:gap-4 max-w-[95%] md:max-w-3xl`}>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 dark:border-amber-700 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <Briefcase size={18} className="text-white" />
              </div>
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400">SAS NET Executive AI</span>
                </div>
                <div className="p-3 md:p-5 shadow-sm bg-white dark:bg-[#18181B] border border-slate-100 dark:border-slate-800/50 rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[44px] md:h-[52px]">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Composer */}
        <div className="p-3 md:p-6 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-10">
          <div className="max-w-4xl mx-auto relative flex items-end gap-1 md:gap-2 bg-white dark:bg-[#18181B] border border-amber-200 dark:border-amber-900/50 rounded-xl md:rounded-2xl p-1 md:p-1.5 shadow-sm focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all">
            <button className="p-2 md:p-3 text-slate-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer rounded-lg md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#27272A]">
              <Paperclip size={18} />
            </button>
            <button className="p-2 md:p-3 text-slate-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer rounded-lg md:rounded-xl hover:bg-slate-50 dark:hover:bg-[#27272A]">
              <Mic size={18} />
            </button>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={state.lang === 'en' ? 'Ask about revenue, subscribers, or infrastructure...' : 'اسأل عن الإيرادات، المشتركين، أو البنية التحتية...'}
              className="w-full bg-transparent border-none py-2.5 md:py-3 px-1 md:px-2 text-sm md:text-[15px] focus:outline-none resize-none max-h-32 min-h-[40px] md:min-h-[44px] text-slate-700 dark:text-slate-200 placeholder-slate-400 custom-scrollbar leading-relaxed"
              rows={1}
            />
            <button 
              onClick={() => handleSend()}
              disabled={!message.trim()}
              className={`p-2.5 md:p-3 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                message.trim() 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20' 
                  : 'bg-slate-100 dark:bg-[#27272A] text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={16} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
