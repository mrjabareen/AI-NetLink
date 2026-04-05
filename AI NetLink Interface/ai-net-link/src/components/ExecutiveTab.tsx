import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, TrendingUp, Users, Server, DollarSign, Send, Mic, Paperclip, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe, Edit2, RotateCcw, Copy, RefreshCw, Check, X, Database } from 'lucide-react';
import { AppState } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';

interface ExecutiveTabProps {
  state: AppState;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  actionCard?: 'financial' | 'subscribers' | 'infrastructure' | null;
  isEdited?: boolean;
}

export default function ExecutiveTab({ state }: ExecutiveTabProps) {
  const isRTL = state.lang === 'ar';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      sender: 'ai', 
      text: state.lang === 'en' 
        ? "Welcome, CEO. I am your Executive AI Assistant. I have full access to NetLink's comprehensive database, including B.O.I and Hotspot subscriber metrics, financial data, and infrastructure status. How can I assist you with strategic decisions today?" 
        : "مرحباً بك أيها المدير التنفيذي. أنا مساعدك الذكي. لدي وصول كامل إلى قاعدة بيانات نت لينك الشاملة، بما في ذلك مقاييس مشتركي B.O.I و Hotspot، البيانات المالية، وحالة البنية التحتية. كيف يمكنني مساعدتك في اتخاذ القرارات الاستراتيجية اليوم؟", 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (text: string = message) => {
    if (!text.trim()) return;
    
    const newMessages: Message[] = [...messages, { 
      id: Date.now(), 
      sender: 'user', 
      text: text,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }];
    setMessages(newMessages);
    setMessage('');
    setIsTyping(true);

    generateAIResponse(text, newMessages);
  };

  const generateAIResponse = (userText: string, currentMessages: Message[]) => {
    setTimeout(() => {
      setIsTyping(false);
      
      let aiResponseText = state.lang === 'en' ? "Analyzing enterprise data across all departments..." : "جاري تحليل بيانات المؤسسة عبر جميع الأقسام...";
      let actionCard: 'financial' | 'subscribers' | 'infrastructure' | null = null;

      const lowerText = userText.toLowerCase();
      if (lowerText.includes('subscriber') || lowerText.includes('مشترك') || lowerText.includes('hotspot') || lowerText.includes('b.o.i')) {
        aiResponseText = state.lang === 'en' 
          ? "Here is the current breakdown of our subscriber base across B.O.I and Hotspot services. We've seen a 12% growth in Hotspot users this quarter." 
          : "إليك التفصيل الحالي لقاعدة مشتركينا عبر خدمات B.O.I و Hotspot. لقد شهدنا نمواً بنسبة 12% في مستخدمي Hotspot هذا الربع.";
        actionCard = 'subscribers';
      } else if (lowerText.includes('revenue') || lowerText.includes('financial') || lowerText.includes('مالي') || lowerText.includes('أرباح') || lowerText.includes('دخل')) {
        aiResponseText = state.lang === 'en' 
          ? "Financial overview generated. Q3 revenue is tracking 5% above target, primarily driven by enterprise B.O.I upgrades." 
          : "تم إنشاء النظرة العامة المالية. إيرادات الربع الثالث تتجاوز الهدف بنسبة 5%، مدفوعة بشكل أساسي بترقيات B.O.I للشركات.";
        actionCard = 'financial';
      } else if (lowerText.includes('server') || lowerText.includes('infrastructure') || lowerText.includes('سيرفر') || lowerText.includes('بنية')) {
        aiResponseText = state.lang === 'en' 
          ? "Infrastructure status report ready. All core servers are operational, but Edge-DMM-01 is nearing capacity limits." 
          : "تقرير حالة البنية التحتية جاهز. جميع الخوادم الأساسية تعمل، لكن Edge-DMM-01 يقترب من حدود السعة.";
        actionCard = 'infrastructure';
      } else {
        aiResponseText = state.lang === 'en'
          ? "I've queried the NetLink enterprise database. Based on current trends, I recommend reviewing our Q4 infrastructure expansion budget to accommodate the growing Hotspot user base."
          : "لقد استعلمت من قاعدة بيانات مؤسسة نت لينك. بناءً على الاتجاهات الحالية، أوصي بمراجعة ميزانية توسيع البنية التحتية للربع الرابع لاستيعاب قاعدة مستخدمي Hotspot المتنامية.";
      }

      setMessages([...currentMessages, { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        actionCard: actionCard
      }]);
    }, 1500);
  };

  // --- Message Actions ---

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const handleEditSave = (id: number) => {
    if (!editText.trim()) return;
    
    // Update the message
    const updatedMessages = messages.map(m => 
      m.id === id ? { ...m, text: editText, isEdited: true } : m
    );
    
    // If it's a user message, we might want to regenerate the AI response
    // For this UI, we'll just update the text and remove subsequent AI messages to simulate a "re-ask"
    const msgIndex = updatedMessages.findIndex(m => m.id === id);
    const slicedMessages = updatedMessages.slice(0, msgIndex + 1);
    
    setMessages(slicedMessages);
    setEditingId(null);
    setIsTyping(true);
    
    // Trigger new AI response based on edited text
    generateAIResponse(editText, slicedMessages);
  };

  const handleUndo = (id: number) => {
    // Find the message and remove it and everything after it
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex !== -1) {
      setMessages(messages.slice(0, msgIndex));
    }
  };

  const handleRegenerate = (id: number) => {
    // Find the AI message, remove it, and regenerate based on the previous user message
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex > 0 && messages[msgIndex - 1].sender === 'user') {
      const userText = messages[msgIndex - 1].text;
      const slicedMessages = messages.slice(0, msgIndex);
      setMessages(slicedMessages);
      setIsTyping(true);
      generateAIResponse(userText, slicedMessages);
    }
  };

  const quickPrompts = state.lang === 'en' 
    ? ['Show subscriber growth (B.O.I vs Hotspot)', 'Financial summary Q3', 'Infrastructure health report', 'Predict next month churn rate']
    : ['عرض نمو المشتركين (B.O.I مقابل Hotspot)', 'الملخص المالي للربع الثالث', 'تقرير صحة البنية التحتية', 'توقع معدل الإلغاء للشهر القادم'];

  return (
    <motion.div key="executive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-4 md:mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="text-amber-500" size={28} />
            {state.lang === 'en' ? 'Executive AI Assistant' : 'المساعد التنفيذي للذكاء الاصطناعي'}
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
            {state.lang === 'en' ? 'Strategic insights and enterprise-wide data analysis.' : 'رؤى استراتيجية وتحليل بيانات على مستوى المؤسسة.'}
          </p>
        </div>
        
        {/* Proxmox / DB Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg self-start md:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Database size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">
            {state.lang === 'en' ? 'PROXMOX DB SYNCED' : 'متصل بقاعدة بروكس موكس'}
          </span>
        </div>
      </header>

      <div className="flex-1 bg-slate-50/50 dark:bg-[#09090B] border border-slate-200/50 dark:border-slate-800/50 rounded-2xl md:rounded-3xl flex flex-col overflow-hidden shadow-sm relative">
        
        {/* Executive Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-amber-500/5 blur-[100px] pointer-events-none"></div>

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
                      {msg.sender === 'ai' ? 'NetLink Executive AI' : (state.lang === 'en' ? 'CEO' : 'المدير التنفيذي')}
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
                    {editingId === msg.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea 
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-slate-900/50 dark:bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-1">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors flex items-center gap-1">
                            <X size={14} /> {state.lang === 'en' ? 'Cancel' : 'إلغاء'}
                          </button>
                          <button onClick={() => handleEditSave(msg.id)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1">
                            <Check size={14} /> {state.lang === 'en' ? 'Save & Resend' : 'حفظ وإعادة إرسال'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium break-words">
                          {msg.text}
                        </p>
                        
                        {/* Action Cards based on context */}
                        {msg.actionCard === 'subscribers' && (
                          <div className="mt-4 md:mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="p-3 md:p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">B.O.I Subscribers</span>
                                <Users size={16} className="text-blue-500" />
                              </div>
                              <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(124500)}</div>
                              <div className="flex items-center gap-1 text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                                <ArrowUpRight size={14} /> +2.4% this month
                              </div>
                            </div>
                            <div className="p-3 md:p-4 rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] md:text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Hotspot Users</span>
                                <Globe size={16} className="text-violet-500" />
                              </div>
                              <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(89200)}</div>
                              <div className="flex items-center gap-1 text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                                <ArrowUpRight size={14} /> +12.1% this month
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.actionCard === 'financial' && (
                          <div className="mt-4 md:mt-5 p-4 md:p-5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold mb-3 md:mb-4 text-sm md:text-base">
                              <DollarSign size={18} /> {state.lang === 'en' ? 'Q3 Financial Overview' : 'النظرة المالية للربع الثالث'}
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-6">
                              <div>
                                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 block mb-1">Total Revenue</span>
                                <span className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(4200000, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                                <div className="flex items-center gap-1 text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  <ArrowUpRight size={12} /> +5% vs Target
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 block mb-1">Operating Costs</span>
                                <span className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(1800000, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                                <div className="flex items-center gap-1 text-[10px] md:text-xs text-rose-600 dark:text-rose-400 mt-1">
                                  <ArrowUpRight size={12} /> +2% vs Target
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.actionCard === 'infrastructure' && (
                          <div className="mt-4 md:mt-5 space-y-2 md:space-y-3">
                            <div className="p-2.5 md:p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                              <div className="flex items-center gap-2 md:gap-3">
                                <Server size={16} className="text-emerald-500" />
                                <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200">Core Servers (Riyadh/Jeddah)</span>
                              </div>
                              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] md:text-xs font-bold rounded-md">Operational</span>
                            </div>
                            <div className="p-2.5 md:p-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 flex justify-between items-center">
                              <div className="flex items-center gap-2 md:gap-3">
                                <Server size={16} className="text-amber-500" />
                                <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200">Edge-DMM-01</span>
                              </div>
                              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] md:text-xs font-bold rounded-md">88% Load</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Message Action Menu (Hover) */}
                    {editingId !== msg.id && (
                      <div className={`absolute -bottom-3 md:-bottom-4 ${msg.sender === 'user' ? 'left-4' : 'right-4'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-slate-700 rounded-lg shadow-md p-1 z-10`}>
                        <button 
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                          title={state.lang === 'en' ? 'Copy' : 'نسخ'}
                        >
                          {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        
                        {msg.sender === 'user' && (
                          <>
                            <button 
                              onClick={() => handleEditStart(msg)}
                              className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                              title={state.lang === 'en' ? 'Edit' : 'تعديل'}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleUndo(msg.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors"
                              title={state.lang === 'en' ? 'Undo / Delete' : 'تراجع / حذف'}
                            >
                              <RotateCcw size={14} />
                            </button>
                          </>
                        )}

                        {msg.sender === 'ai' && (
                          <button 
                            onClick={() => handleRegenerate(msg.id)}
                            className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors"
                            title={state.lang === 'en' ? 'Regenerate' : 'إعادة التوليد'}
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </div>
                    )}
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
                  <span className="text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400">NetLink Executive AI</span>
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
