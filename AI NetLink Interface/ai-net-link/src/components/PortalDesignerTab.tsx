import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LayoutTemplate, Smartphone, Monitor, Palette, Type, Image as ImageIcon, Save, Eye, RefreshCw } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';

interface PortalDesignerTabProps {
  state: AppState;
}

export default function PortalDesignerTab({ state }: PortalDesignerTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';

  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [welcomeText, setWelcomeText] = useState('Welcome to SAS NET Hotspot');
  const [buttonText, setButtonText] = useState('Connect to Internet');
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <motion.div key="portal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col space-y-6 overflow-hidden w-full min-h-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutTemplate className="text-rose-500" />
            {t.nav.portal}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRTL ? 'تصميم وتخصيص صفحة تسجيل الدخول لشبكة الهوت سبوت' : 'Design and customize the Hotspot login page'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'mobile' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'desktop' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
          <button className="flex-1 sm:flex-none justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            {isRTL ? 'معاينة' : 'Preview'}
          </button>
          <button className="flex-1 sm:flex-none justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-rose-500/20 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isRTL ? 'حفظ ونشر' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar pb-6 lg:pb-0">
        {/* Controls Sidebar */}
        <div className="w-full lg:w-80 flex flex-col glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {isRTL ? 'إعدادات التصميم' : 'Design Settings'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Branding */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> {isRTL ? 'العلامة التجارية' : 'Branding'}
              </h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'شعار الشركة' : 'Company Logo'}</label>
                <div className="border border-slate-300 dark:border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                  <span className="text-sm">{isRTL ? 'انقر لرفع صورة' : 'Click to upload image'}</span>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4" /> {isRTL ? 'الألوان' : 'Colors'}
              </h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'اللون الأساسي' : 'Primary Color'}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4" /> {isRTL ? 'النصوص' : 'Typography'}
              </h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'نص الترحيب' : 'Welcome Text'}</label>
                <input
                  type="text"
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'نص الزر' : 'Button Text'}</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 relative min-h-[600px] lg:min-h-0">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span className="text-xs font-medium uppercase tracking-wider">{isRTL ? 'معاينة حية' : 'Live Preview'}</span>
          </div>

          {/* Device Mockup */}
          <motion.div
            layout
            className={`bg-white dark:bg-slate-900 shadow-2xl overflow-hidden relative ${
              viewMode === 'mobile'
                ? 'w-[320px] h-[600px] rounded-[2.5rem] border-[8px] border-slate-800 dark:border-slate-950'
                : 'w-full max-w-[800px] h-[500px] rounded-2xl border border-slate-200 dark:border-slate-800 mx-4'
            }`}
          >
            {/* Mobile Notch */}
            {viewMode === 'mobile' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 dark:bg-slate-950 rounded-b-2xl z-20"></div>
            )}

            {/* Portal Content */}
            <div className="absolute inset-0 flex flex-col">
              {/* Header Image/Color */}
              <div className="h-1/3 relative" style={{ backgroundColor: primaryColor }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent"></div>
              </div>

              {/* Form Area */}
              <div className="flex-1 px-6 py-8 flex flex-col items-center text-center relative z-10 -mt-12">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700">
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>SAS</span>
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{welcomeText}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Please enter your voucher code or login credentials to access the internet.
                </p>

                <div className="w-full space-y-4">
                  <input
                    type="text"
                    placeholder="Username / Voucher"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 dark:text-white"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                  <input
                    type="password"
                    placeholder="Password (Optional)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 dark:text-white"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                  <button
                    className="w-full py-3 rounded-xl text-white font-semibold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                  >
                    {buttonText}
                  </button>
                </div>

                <div className="mt-auto pt-8 text-xs text-slate-400">
                  Powered by SAS NET
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
