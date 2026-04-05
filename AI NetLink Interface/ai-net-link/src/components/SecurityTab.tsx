import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Radar, CheckCircle2, AlertTriangle, ShieldCheck, ShieldX, Activity } from 'lucide-react';
import { AppState } from '../types';

interface SecurityTabProps {
  state: AppState;
}

export default function SecurityTab({ state }: SecurityTabProps) {
  const isRTL = state.lang === 'ar';

  const threats = [
    { id: 1, type: 'DDoS Attempt', source: '192.168.45.12', target: 'Core-R1-Riyadh', severity: 'high', time: '2 mins ago' },
    { id: 2, type: 'Unauthorized Access', source: 'Unknown IP', target: 'Auth-Server-A', severity: 'medium', time: '15 mins ago' },
    { id: 3, type: 'Port Scan', source: '10.0.0.55', target: 'Edge-DMM-01', severity: 'low', time: '1 hour ago' },
  ];

  const compliance = [
    { name: 'ISO 27001', status: 'passed', score: 98 },
    { name: 'PCI-DSS', status: 'passed', score: 100 },
    { name: 'GDPR Data Privacy', status: 'warning', score: 85 },
    { name: 'NIST Framework', status: 'failed', score: 60 },
  ];

  return (
    <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col w-full min-h-0">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          {state.lang === 'en' ? 'Security Radar' : 'رادار الأمان'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {state.lang === 'en' ? 'Real-time threat intelligence and automated compliance checking.' : 'استخبارات التهديدات في الوقت الفعلي والتحقق الآلي من الامتثال.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 lg:pb-0">
        
        {/* Threat Radar */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Radar size={20} className="text-rose-500" />
            {state.lang === 'en' ? 'Active Threats' : 'التهديدات النشطة'}
          </h3>
          
          {/* Radar Animation */}
          <div className="relative w-full aspect-square max-w-sm mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-rose-500/20" />
            <div className="absolute inset-4 rounded-full border border-rose-500/20" />
            <div className="absolute inset-12 rounded-full border border-rose-500/20" />
            <div className="absolute inset-20 rounded-full border border-rose-500/20" />
            
            {/* Scanning line */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-rose-500/40 to-transparent origin-bottom-right animate-[spin_4s_linear_infinite]" />
            </div>
            
            <Radar size={32} className="text-rose-500 relative z-10" />
            
            {/* Blips */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-amber-500 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          </div>

          <div className="space-y-3 flex-1">
            {threats.map(threat => (
              <div key={threat.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className={threat.severity === 'high' ? 'text-rose-500' : threat.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'} />
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{threat.type}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    {threat.source} → {threat.target}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{threat.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Checker */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-500" />
            {state.lang === 'en' ? 'Automated Compliance' : 'الامتثال الآلي'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">92%</span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
                {state.lang === 'en' ? 'Overall Score' : 'النتيجة الإجمالية'}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">24/7</span>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-500 uppercase tracking-wider">
                {state.lang === 'en' ? 'Continuous Audit' : 'تدقيق مستمر'}
              </span>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {compliance.map(item => (
              <div key={item.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#09090B]/50">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    {item.status === 'passed' ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
                     item.status === 'warning' ? <AlertTriangle size={16} className="text-amber-500" /> : 
                     <ShieldX size={16} className="text-rose-500" />}
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.name}</h4>
                  </div>
                  <span className={`text-xs font-bold ${item.status === 'passed' ? 'text-emerald-500' : item.status === 'warning' ? 'text-amber-500' : 'text-rose-500'}`}>
                    {item.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.status === 'passed' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} 
                    style={{ width: `${item.score}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Activity size={16} />
            {state.lang === 'en' ? 'Run Full Audit Scan' : 'تشغيل فحص تدقيق كامل'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
