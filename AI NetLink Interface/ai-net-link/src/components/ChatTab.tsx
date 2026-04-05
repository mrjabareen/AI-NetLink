import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Cpu, Download, Trash2, Send, Copy, Edit2, Terminal, Paperclip, MoreVertical, PanelLeftClose, PanelLeft, Check, RotateCcw, Mic, FileText, Ticket, Wrench, Activity } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';

interface ChatTabProps {
  state: AppState;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  actionCard?: 'cpe' | 'remediation' | null;
}

export default function ChatTab({ state }: ChatTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: t.chat.welcomeMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = (text: string = message) => {
    if (!text.trim()) return;
    
    const newMessages: Message[] = [...messages, { 
      id: Date.now(), 
      sender: 'user' as const, 
      text: text,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }];
    setMessages(newMessages);
    setMessage('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      let aiResponseText = state.lang === 'en' ? "I'm analyzing your request. Please wait a moment while I gather the necessary telemetry data." : "أنا أقوم بتحليل طلبك. يرجى الانتظار لحظة بينما أقوم بجمع بيانات القياس عن بعد اللازمة.";
      let actionCard: 'cpe' | 'remediation' | null = null;

      const lowerText = text.toLowerCase();
      if (lowerText.includes('diagnose') || lowerText.includes('تشخيص')) {
        aiResponseText = state.lang === 'en' ? "Diagnostic complete for CPE-1234. I found a signal degradation on the fiber line." : "اكتمل التشخيص لـ CPE-1234. وجدت تدهوراً في الإشارة على خط الألياف.";
        actionCard = 'cpe';
      } else if (lowerText.includes('fix') || lowerText.includes('إصلاح')) {
        aiResponseText = state.lang === 'en' ? "I've generated an auto-remediation script to reroute traffic and bypass the failing node." : "لقد قمت بإنشاء برنامج نصي للإصلاح التلقائي لإعادة توجيه حركة المرور وتجاوز العقدة الفاشلة.";
        actionCard = 'remediation';
      }

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        sender: 'ai' as const, 
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        actionCard: actionCard
      }]);
    }, 1500);
  };

  const handleEditMessage = (id: number, text: string) => {
    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      setMessages(messages.slice(0, index));
      setMessage(text);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  return (
    <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 w-full min-h-0">
      
      {/* Chat Sidebar (History) - Redesigned for Console Look */}
      <AnimatePresence initial={false}>
        {isHistoryOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden md:flex flex-col bg-white dark:bg-[#09090B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-sm h-full shrink-0"
          >
            <div className="w-80 h-full flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/50">
          <button className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 cursor-pointer">
            <Plus size={20} strokeWidth={2.5} /> {t.chat.new}
          </button>
          <div className="mt-5 relative group">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} text-slate-400 group-focus-within:text-teal-500 transition-colors`} size={18} />
            <input type="text" placeholder={t.chat.search} className={`w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200/50 dark:border-slate-800 rounded-xl py-3 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400`} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            {state.lang === 'en' ? 'Recent Operations' : 'العمليات الأخيرة'}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181B] cursor-pointer transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50 group flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {state.lang === 'en' ? `Network Diagnostic ${i}` : `تشخيص الشبكة ${i}`}
                </p>
                <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"><Trash2 size={14} /></button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 font-mono">
                {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Main Chat Area - The "Operations Room" */}
      <div className="flex-1 bg-slate-50/50 dark:bg-[#09090B] border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col min-h-0 overflow-hidden shadow-sm relative">
        
        {/* Subtle Background Grid/Glow for the Operations Room feel */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-teal-500/5 dark:bg-teal-500/5 blur-[100px] pointer-events-none"></div>

        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 dark:bg-[#09090B]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="hidden md:flex p-2 -ml-2 text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-xl transition-colors cursor-pointer"
              title={state.lang === 'en' ? 'Toggle History' : 'إظهار/إخفاء السجل'}
            >
              {isHistoryOpen ? <PanelLeftClose size={20} className={isRTL ? 'rotate-180' : ''} /> : <PanelLeft size={20} className={isRTL ? 'rotate-180' : ''} />}
            </button>
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-[#18181B] border border-slate-700 dark:border-slate-800 flex items-center justify-center shadow-sm">
                <Terminal className="text-teal-400 w-5 h-5" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#09090B]"></span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {state.lang === 'en' ? 'Smart Operations Console' : 'غرفة العمليات الذكية'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 
                {state.lang === 'en' ? 'System Online & Ready' : 'النظام متصل وجاهز'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${['super_admin', 'admin', 'sas4_manager'].includes(state.role) ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
              {['super_admin', 'admin', 'sas4_manager'].includes(state.role) ? t.roles.sas4_manager : t.roles.user}
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            <button className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-xl transition-all cursor-pointer" title={state.lang === 'en' ? 'Shift Handoff Report' : 'تقرير تسليم المناوبة'}><FileText size={18} /></button>
            <button className="p-2 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-xl transition-all cursor-pointer" title={t.chat.export}><Download size={18} /></button>
            <button onClick={() => setMessages([{ id: 1, sender: 'ai', text: t.chat.welcomeMsg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }])} className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-xl transition-all cursor-pointer" title={t.chat.clear}><Trash2 size={18} /></button>
            <button className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18181B] rounded-xl transition-all cursor-pointer"><MoreVertical size={18} /></button>
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="px-6 py-3 bg-white/40 dark:bg-[#09090B]/40 border-b border-slate-200/50 dark:border-slate-800/50 flex gap-2 overflow-x-auto custom-scrollbar z-10">
          {t.chat.quickActions.map((action, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSend(action)} 
              className="whitespace-nowrap px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18181B] text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-teal-500/50 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all cursor-pointer shadow-sm"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 z-10 custom-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={msg.id} 
              className={`flex gap-3 md:gap-4 max-w-[85%] md:max-w-3xl group ${msg.sender === 'user' ? 'flex-row-reverse self-end ms-auto' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                msg.sender === 'ai' 
                  ? 'bg-slate-900 dark:bg-[#18181B] border border-slate-700 dark:border-slate-800' 
                  : 'bg-teal-500 dark:bg-teal-600 border border-teal-600 dark:border-teal-500'
              }`}>
                {msg.sender === 'ai' 
                  ? <span className="text-[10px] font-black text-teal-400 tracking-wider">AI</span> 
                  : <span className="text-[10px] font-bold text-white uppercase">{state.lang === 'en' ? 'You' : 'أنت'}</span>
                }
              </div>
              
              {/* Message Content */}
              <div className={`flex flex-col gap-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {msg.sender === 'ai' ? 'AI NetLink' : (state.lang === 'en' ? 'Operator' : 'المشغل')}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{msg.time}</span>
                </div>
                
                <div className={`p-4 md:p-5 shadow-sm ${
                  msg.sender === 'ai' 
                    ? 'bg-white dark:bg-[#18181B] border border-slate-100 dark:border-transparent rounded-2xl rounded-tl-sm text-slate-800 dark:text-slate-200' 
                    : 'bg-teal-500 dark:bg-teal-600 text-white rounded-2xl rounded-tr-sm shadow-teal-500/10'
                }`}>
                  <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </p>
                  
                  {/* Action Cards */}
                  {msg.actionCard === 'cpe' && (
                    <div className="mt-4 p-4 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
                        <Activity size={16} /> {state.lang === 'en' ? 'Signal Degradation Detected' : 'تم اكتشاف تدهور في الإشارة'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-[#09090B] p-2 rounded-lg border border-rose-100 dark:border-rose-500/10">
                          <span className="text-slate-500 block mb-1">Rx Power</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-28.4 dBm</span>
                        </div>
                        <div className="bg-white dark:bg-[#09090B] p-2 rounded-lg border border-rose-100 dark:border-rose-500/10">
                          <span className="text-slate-500 block mb-1">Distance</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">4.2 km</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.actionCard === 'remediation' && (
                    <div className="mt-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        <Wrench size={16} /> {state.lang === 'en' ? 'Auto-Remediation Ready' : 'الإصلاح التلقائي جاهز'}
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg overflow-x-auto">
                        <code className="text-emerald-400 text-xs font-mono whitespace-pre">
                          {`> interface GigabitEthernet0/1\n> shutdown\n> interface GigabitEthernet0/2\n> no shutdown\n> ip route 0.0.0.0 0.0.0.0 10.0.0.2`}
                        </code>
                      </div>
                      <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                        {state.lang === 'en' ? 'Execute Fix' : 'تنفيذ الإصلاح'}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Message Actions (Inline below bubble) */}
                <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.sender === 'user' ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                  {msg.sender === 'ai' && (
                    <>
                      <button 
                        onClick={() => handleCopy(msg.id, msg.text)} 
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} 
                        {copiedId === msg.id ? (state.lang === 'en' ? 'Copied' : 'تم النسخ') : (state.lang === 'en' ? 'Copy' : 'نسخ')}
                      </button>
                      <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#18181B] transition-colors cursor-pointer">
                        <Ticket size={12} /> {state.lang === 'en' ? 'Create Ticket' : 'إنشاء تذكرة'}
                      </button>
                    </>
                  )}
                  {msg.sender === 'user' && (
                    <button 
                      onClick={() => handleEditMessage(msg.id, msg.text)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} /> {state.lang === 'en' ? 'Edit & Resend' : 'تعديل وإعادة إرسال'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 md:gap-4 max-w-[85%] md:max-w-3xl`}>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 dark:bg-[#18181B] border border-slate-700 dark:border-slate-800 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <span className="text-[10px] font-black text-teal-400 tracking-wider">AI</span>
              </div>
              <div className="flex flex-col gap-1.5 items-start">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">AI NetLink</span>
                </div>
                <div className="p-4 md:p-5 shadow-sm bg-white dark:bg-[#18181B] border border-slate-100 dark:border-transparent rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[52px]">
                  <span className="w-2 h-2 rounded-full bg-teal-500/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-teal-500/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-teal-500/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Composer - Redesigned for Console */}
        <div className="p-4 md:p-6 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-10">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm focus-within:border-teal-500/50 focus-within:ring-1 focus-within:ring-teal-500/30 transition-all">
            <button className="p-3 text-slate-400 hover:text-teal-500 transition-colors shrink-0 cursor-pointer rounded-xl hover:bg-slate-50 dark:hover:bg-[#27272A]" title={state.lang === 'en' ? 'Attach File' : 'إرفاق ملف'}>
              <Paperclip size={20} />
            </button>
            <button className="p-3 text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer rounded-xl hover:bg-slate-50 dark:hover:bg-[#27272A]" title={state.lang === 'en' ? 'VoiceOps (Hold to speak)' : 'التحكم الصوتي (استمر بالضغط للتحدث)'}>
              <Mic size={20} />
            </button>
            <textarea 
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={state.lang === 'en' ? 'Enter command or message... (Press Enter to send)' : 'أدخل الأمر أو الرسالة... (اضغط Enter للإرسال)'}
              className="w-full bg-transparent border-none py-3 px-2 text-[15px] focus:outline-none resize-none max-h-32 min-h-[44px] text-slate-700 dark:text-slate-200 placeholder-slate-400 custom-scrollbar leading-relaxed"
              rows={1}
            />
            <button 
              onClick={() => handleSend()}
              disabled={!message.trim()}
              className={`p-3 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                message.trim() 
                  ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md shadow-teal-500/20' 
                  : 'bg-slate-100 dark:bg-[#27272A] text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={18} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
          <div className="text-center mt-3">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {state.lang === 'en' ? 'AI NetLink can make mistakes. Verify critical network configurations.' : 'قد يخطئ AI NetLink. تحقق من تكوينات الشبكة الحرجة.'}
            </p>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
