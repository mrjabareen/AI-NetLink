import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, BarChart3, LineChart, Download, Share2, Plus, LayoutGrid, FileText, Settings2, Trash2 } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';

interface ReportsTabProps {
  state: AppState;
}

export default function ReportsTab({ state }: ReportsTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [widgets, setWidgets] = React.useState([
    { id: 'w1', type: 'bar', title: isRTL ? 'الإيرادات الشهرية' : 'Monthly Revenue', data: [40, 60, 45, 80, 55, 90, 75], color: 'indigo' },
    { id: 'w2', type: 'pie', title: isRTL ? 'توزيع الباقات' : 'Plan Distribution', color: 'blue' },
    { id: 'w3', type: 'line', title: isRTL ? 'نمو المشتركين' : 'Subscriber Growth', color: 'emerald' }
  ]);

  const availableWidgets = [
    { id: 'rev', title: isRTL ? 'تقرير الإيرادات' : 'Revenue Report', icon: BarChart3, color: 'indigo' },
    { id: 's4_rev', title: isRTL ? 'إيرادات S4' : 'S4 Revenue', icon: BarChart3, color: 'violet' },
    { id: 'sub', title: isRTL ? 'نمو المشتركين' : 'Subscriber Growth', icon: LineChart, color: 'blue' },
    { id: 'plan', title: isRTL ? 'توزيع الباقات' : 'Plan Distribution', icon: PieChart, color: 'rose' },
    { id: 'share_div', title: isRTL ? 'أرباح المساهمين' : 'Shareholder Dividends', icon: PieChart, color: 'amber' },
    { id: 'tick', title: isRTL ? 'ملخص التذاكر' : 'Ticket Summary', icon: FileText, color: 'emerald' },
    { id: 'inv', title: isRTL ? 'حالة المخزون' : 'Inventory Status', icon: LayoutGrid, color: 'amber' },
    { id: 'net', title: isRTL ? 'أداء الشبكة' : 'Network Performance', icon: Settings2, color: 'violet' }
  ];

  const addWidget = (w: any) => {
    const newW = {
      id: `w-${Math.random()}`,
      type: w.id === 'plan' ? 'pie' : w.id === 'sub' ? 'line' : 'bar',
      title: w.title,
      data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
      color: w.color
    };
    setWidgets([...widgets, newW]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  return (
    <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col space-y-6 overflow-hidden w-full min-h-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="text-indigo-500" />
            {t.nav.reports}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRTL ? 'منشئ التقارير المخصصة وتحليل البيانات المتقدم' : 'Advanced Custom Report Builder & Data Analysis'}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium">
            <Share2 className="w-4 h-4" />
            {isRTL ? 'مشاركة' : 'Share'}
          </button>
          <button className="flex-1 sm:flex-none justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Download className="w-4 h-4" />
            {isRTL ? 'تصدير PDF' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Sidebar Widgets */}
        <div className="w-full lg:w-72 flex flex-col glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {isRTL ? 'عناصر التقرير' : 'Report Widgets'}
            </h3>
            <Plus className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {availableWidgets.map((w) => (
              <button 
                key={w.id}
                onClick={() => addWidget(w)}
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex items-center gap-3 shadow-sm group text-left"
              >
                <div className={`p-2 rounded-lg bg-${w.color}-500/10 text-${w.color}-500 group-hover:scale-110 transition-transform`}>
                  <w.icon size={20} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">{w.title}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{isRTL ? 'انقر للإضافة' : 'Click to add'}</span>
                </div>
                <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col bg-slate-50/30 dark:bg-slate-900/30 min-h-[600px] lg:min-h-0">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-slate-700 dark:text-slate-300">{isRTL ? 'مساحة العمل' : 'Canvas Workspace'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                <Settings2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setWidgets([])}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1 rounded-lg hover:bg-rose-500/10 transition-all"
              >
                {isRTL ? 'مسح الكل' : 'Clear All'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {widgets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <LayoutGrid size={40} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-300">{isRTL ? 'مساحة العمل فارغة' : 'Canvas is Empty'}</p>
                  <p className="text-sm">{isRTL ? 'أضف عناصر من القائمة الجانبية لبدء بناء تقريرك' : 'Add widgets from the sidebar to start building your report'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AnimatePresence>
                  {widgets.map((w) => (
                    <motion.div 
                      key={w.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm h-72 flex flex-col relative group"
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg"><Settings2 className="w-4 h-4" /></button>
                        <button 
                          onClick={() => removeWidget(w.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-${w.color}-500`} />
                        {w.title}
                      </h4>
                      
                      <div className="flex-1 flex items-center justify-center">
                        {w.type === 'bar' && (
                          <div className="flex-1 flex items-end gap-2 h-full pt-4">
                            {w.data?.map((h: number, i: number) => (
                              <div key={i} className="flex-1 bg-indigo-500/10 rounded-t-lg relative group/bar">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  className={`absolute bottom-0 left-0 right-0 bg-${w.color}-500 rounded-t-lg transition-all duration-500`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {w.type === 'pie' && (
                          <div className="relative w-40 h-40">
                            <div className={`w-full h-full rounded-full border-[20px] border-${w.color}-500/20 border-t-${w.color}-500 border-r-indigo-500 animate-spin-slow`} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-slate-700 dark:text-slate-300">75%</span>
                            </div>
                          </div>
                        )}
                        {w.type === 'line' && (
                          <div className="w-full h-full relative">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <motion.path 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                d="M0,80 Q20,60 40,70 T80,40 T100,20" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                className={`text-${w.color}-500`} 
                              />
                              <path d="M0,100 L0,80 Q20,60 40,70 T80,40 T100,20 L100,100 Z" fill="currentColor" className={`text-${w.color}-500/10`} />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
