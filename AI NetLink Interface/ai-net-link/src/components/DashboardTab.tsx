import React from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, CheckCircle2, MessageSquare, Search, Database, Activity, 
  HardDrive, Settings, AlertCircle, TrendingUp, Users, Wallet, 
  ArrowUpRight, ArrowDownRight, Globe, Zap, ShieldCheck
} from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatNumber } from '../utils/format';
import { formatCurrency } from '../utils/currency';

interface DashboardTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const trafficData = [
  { time: '00:00', traffic: 4000 },
  { time: '04:00', traffic: 3000 },
  { time: '08:00', traffic: 2000 },
  { time: '12:00', traffic: 2780 },
  { time: '16:00', traffic: 1890 },
  { time: '20:00', traffic: 2390 },
  { time: '24:00', traffic: 3490 },
];

const financialData = [
  { month: 'Jan', revenue: 45000, expenses: 32000 },
  { month: 'Feb', revenue: 52000, expenses: 34000 },
  { month: 'Mar', revenue: 48000, expenses: 31000 },
  { month: 'Apr', revenue: 61000, expenses: 38000 },
  { month: 'May', revenue: 55000, expenses: 35000 },
  { month: 'Jun', revenue: 67000, expenses: 40000 },
];

export default function DashboardTab({ state, setState }: DashboardTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';

  const marketCap = state.investorSettings.sharePrice * state.investorSettings.totalShares;

  // Management Stats
  const subscriberCount = JSON.parse(localStorage.getItem('sas4_subscribers') || '[]').length || 4;
  const supplierCount = JSON.parse(localStorage.getItem('sas4_suppliers') || '[]').length || 3;
  const adminCount = JSON.parse(localStorage.getItem('sas4_admins') || '[]').length || 3;

  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-6 min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-2">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{t.nav.dashboard}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {state.currentUser?.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t.auth.loggedInAs} {state.currentUser?.name}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                {t.auth.withRole} {t.roles[state.role]}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Investor Summary Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors" />
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.marketCap}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(marketCap, state.currency, state.lang, 0)}</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                <ArrowUpRight size={14} />
                <span>+4.2%</span>
              </div>
            </div>
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t.dashboard.sharePrice}: {formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang)}</span>
            <span>{t.dashboard.dividendYield}: {state.investorSettings.dividendYield}%</span>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.revenue}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(67000, state.currency, state.lang, 0)}</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                <ArrowUpRight size={14} />
                <span>+12.5%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t.dashboard.profit}: {formatCurrency(27000, state.currency, state.lang, 0)}</span>
          </div>
        </div>

        {/* Management Stats Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.managementStats}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{subscriberCount + supplierCount + adminCount}</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                <Users size={14} />
                <span>{subscriberCount} {t.dashboard.totalSubscribers}</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t.dashboard.totalSuppliers}: {supplierCount}</span>
            <span>{t.dashboard.totalAdmins}: {adminCount}</span>
          </div>
        </div>

        {/* AI Status Card */}
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors" />
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.aiStatus}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">AI NetLink</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                <Zap size={14} />
                <span>{t.dashboard.ready}</span>
              </div>
            </div>
            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400">
              <Cpu size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Latency: 42ms</span>
          </div>
        </div>

        {/* Network Traffic Chart */}
        <div className="glass-card col-span-1 md:col-span-2 lg:col-span-2 p-6 h-80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              {t.dashboard.networkTraffic}
            </h3>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded uppercase tracking-wider">Live</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider">24H</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: state.theme === 'dark' ? '#0f172a' : '#ffffff', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Bar Chart */}
        <div className="glass-card col-span-1 md:col-span-2 lg:col-span-2 p-6 h-80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Database size={18} className="text-teal-500" />
              {t.dashboard.financialOverview}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wider">6 Months</span>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: state.theme === 'dark' ? '#0f172a' : '#ffffff', borderRadius: '12px', border: '1px solid #334155' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">{t.dashboard.quickActions}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'chat' }))} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-teal-500/30 transition-all group">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                <MessageSquare size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t.nav.chat}</span>
            </button>
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'search' }))} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-blue-500/30 transition-all group">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Search size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t.nav.search}</span>
            </button>
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'investors' }))} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-amber-500/30 transition-all group">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t.nav.investors}</span>
            </button>
            <button onClick={() => setState(prev => ({ ...prev, activeTab: 'settings' }))} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-slate-500/30 transition-all group">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
                <Settings size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t.nav.settings}</span>
            </button>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="glass-card col-span-1 md:col-span-3 lg:col-span-3 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Activity size={18} className="text-teal-500" />
              {t.dashboard.recentActivity}
            </h3>
            <button className="text-[10px] font-bold text-teal-500 hover:underline uppercase tracking-widest">{t.dashboard.viewDetails}</button>
          </div>
          <div className="space-y-3">
            {[
              { icon: AlertCircle, text: t.dashboard.activity1, time: '10 min ago', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { icon: CheckCircle2, text: t.dashboard.activity2, time: '1 hour ago', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { icon: ShieldCheck, text: t.dashboard.activity3, time: '3 hours ago', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: AlertCircle, text: t.dashboard.activity4, time: '1 day ago', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 group">
                <div className={`p-2.5 rounded-xl ${activity.bg} ${activity.color} group-hover:scale-110 transition-transform`}>
                  <activity.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{activity.text}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{activity.time}</p>
                </div>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
