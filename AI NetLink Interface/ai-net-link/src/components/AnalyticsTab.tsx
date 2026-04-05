import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Download, FileText, TrendingUp, Users, Server } from 'lucide-react';
import { AppState } from '../types';
import { formatNumber } from '../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsTabProps {
  state: AppState;
}

export default function AnalyticsTab({ state }: AnalyticsTabProps) {
  const isRTL = state.lang === 'ar';

  const trafficData = [
    { time: '00:00', traffic: 4000, capacity: 2400 },
    { time: '04:00', traffic: 3000, capacity: 1398 },
    { time: '08:00', traffic: 2000, capacity: 9800 },
    { time: '12:00', traffic: 2780, capacity: 3908 },
    { time: '16:00', traffic: 1890, capacity: 4800 },
    { time: '20:00', traffic: 2390, capacity: 3800 },
    { time: '24:00', traffic: 3490, capacity: 4300 },
  ];

  const slaData = [
    { name: 'Core Network', uptime: 99.999 },
    { name: 'Edge Nodes', uptime: 99.95 },
    { name: 'Database', uptime: 99.99 },
    { name: 'API Gateway', uptime: 99.9 },
  ];

  return (
    <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {state.lang === 'en' ? 'Analytics & SLA' : 'التحليلات والتقارير'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {state.lang === 'en' ? 'Custom dashboards and automated Service Level Agreement reports.' : 'لوحات قياس مخصصة وتقارير اتفاقية مستوى الخدمة الآلية.'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20">
          <Download size={18} />
          {state.lang === 'en' ? 'Export SLA Report' : 'تصدير تقرير SLA'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-12 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{state.lang === 'en' ? 'Total Traffic (24h)' : 'إجمالي حركة المرور (24س)'}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatNumber(1.2)} PB</h4>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Server size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{state.lang === 'en' ? 'Global Uptime' : 'وقت التشغيل العالمي'}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatNumber(99.99)}%</h4>
            </div>
          </div>
          <div className="glass-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{state.lang === 'en' ? 'Active Sessions' : 'الجلسات النشطة'}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatNumber(45231)}</h4>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="glass-card p-6 lg:col-span-2 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-500" />
              {state.lang === 'en' ? 'Network Traffic Analysis' : 'تحليل حركة مرور الشبكة'}
            </h3>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={state.theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="time" stroke={state.theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={state.theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: state.theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: state.theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '0.75rem' }}
                    itemStyle={{ color: state.theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA Report */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <FileText size={20} className="text-violet-500" />
              {state.lang === 'en' ? 'SLA Compliance' : 'امتثال SLA'}
            </h3>
            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={state.theme === 'dark' ? '#1e293b' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" domain={[99, 100]} stroke={state.theme === 'dark' ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke={state.theme === 'dark' ? '#cbd5e1' : '#475569'} fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: state.theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                    contentStyle={{ backgroundColor: state.theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: state.theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '0.75rem' }}
                  />
                  <Bar dataKey="uptime" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
