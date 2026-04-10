import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Users, Settings2, Plus, ArrowRight, ShieldCheck, TrendingUp, PieChart, Landmark, Percent, Save, RefreshCw } from 'lucide-react';
import { AppState, FinancialTransaction, TeamMember } from '../types';
import { dict } from '../dict';
import { formatCurrency } from '../utils/currency';
import { formatNumber } from '../utils/format';
import { toastError, toastSuccess } from '../utils/notify';
import AppModal from './AppModal';
import { topUpManager, updateManager } from '../api';

interface FinancialDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function FinancialDashboard({ state, setState }: FinancialDashboardProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<TeamMember | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transactions' | 'commissions'>('overview');
  const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});
  const [savingCommissionIds, setSavingCommissionIds] = useState<Record<string, boolean>>({});

  const agents = state.teamMembers
    .filter(m => m.role === 'admin' || m.role === 'sas4_manager')
    .map(agent => ({ ...agent, balance: Number(agent.balance || 0), commissionRate: Number(agent.commissionRate || 0) }));
  const totalAgentBalances = agents.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

  useEffect(() => {
    setCommissionDrafts(prev => {
      const next = { ...prev };
      agents.forEach(agent => {
        if (next[agent.id] === undefined) {
          next[agent.id] = String(Number(agent.commissionRate || 0));
        }
      });
      return next;
    });
  }, [agents]);

  const handleTopUp = async () => {
    if (!selectedAgent || !topUpAmount) {
      toastError(isRTL ? 'يرجى اختيار الوكيل وإدخال مبلغ صحيح.' : 'Select an agent and enter a valid amount.', isRTL ? 'بيانات ناقصة' : 'Missing Data');
      return;
    }
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0 || amount > state.centralBalance) {
      toastError(isRTL ? 'المبلغ غير صالح أو يتجاوز الرصيد المركزي.' : 'The amount is invalid or exceeds the central balance.', isRTL ? 'فشل الشحن' : 'Top Up Failed');
      return;
    }

    try {
      await topUpManager(String(selectedAgent.id), amount);

      const newTransaction: FinancialTransaction = {
        id: `TX-${Date.now()}`,
        date: new Date().toLocaleString('en-US'),
        type: 'topup_agent',
        amount: amount,
        fromId: state.currentUser?.id || 'admin',
        fromName: state.currentUser?.name || 'Super Admin',
        toId: selectedAgent.id,
        toName: selectedAgent.name,
        status: 'completed',
      };

      setState(prev => ({
        ...prev,
        centralBalance: prev.centralBalance - amount,
        financialTransactions: [newTransaction, ...prev.financialTransactions],
        teamMembers: prev.teamMembers.map(m => 
          m.id === selectedAgent.id ? { ...m, balance: Number(m.balance || 0) + amount } : m
        )
      }));

      setIsTopUpModalOpen(false);
      setSelectedAgent(null);
      setTopUpAmount('');
      toastSuccess(
        isRTL ? `تم شحن ${selectedAgent.name} بمبلغ ${formatCurrency(amount, state.currency, state.lang)}.` : `${selectedAgent.name} was topped up with ${formatCurrency(amount, state.currency, state.lang)}.`,
        isRTL ? 'تمت العملية بنجاح' : 'Top Up Completed'
      );
    } catch (error) {
      console.error(error);
      toastError(
        isRTL ? 'فشل شحن الوكيل من المصدر المالي الحقيقي.' : 'Failed to top up the agent using the real financial source.',
        isRTL ? 'فشل الشحن' : 'Top Up Failed'
      );
    }
  };

  const handleSaveCommission = async (agent: TeamMember) => {
    const draftValue = commissionDrafts[agent.id] ?? String(Number(agent.commissionRate || 0));
    const nextRate = Math.min(100, Math.max(0, parseFloat(draftValue) || 0));

    try {
      setSavingCommissionIds(prev => ({ ...prev, [agent.id]: true }));
      await updateManager(String(agent.id), {
        ...agent,
        commissionRate: nextRate,
        'نسبة العمولة': nextRate,
      });

      setState(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.map(member => (
          member.id === agent.id ? { ...member, commissionRate: nextRate } : member
        ))
      }));

      setCommissionDrafts(prev => ({ ...prev, [agent.id]: String(nextRate) }));
      toastSuccess(
        isRTL ? `تم حفظ عمولة ${agent.name} بنجاح.` : `${agent.name} commission saved successfully.`,
        isRTL ? 'تم الحفظ' : 'Saved'
      );
    } catch (error) {
      console.error(error);
      toastError(
        isRTL ? 'فشل حفظ نسبة العمولة.' : 'Failed to save commission rate.',
        isRTL ? 'فشل الحفظ' : 'Save Failed'
      );
    } finally {
      setSavingCommissionIds(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#09090B]/50 p-4 md:p-8"
    >
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Landmark className="text-teal-500" size={32} />
            {t.financial.title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
            {t.financial.subtitle}
          </p>
        </div>

        <div className="flex bg-white dark:bg-[#18181B] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {(['overview', 'transactions', 'commissions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeSubTab === tab 
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'overview' ? (isRTL ? 'نظرة عامة' : 'Overview') : 
               tab === 'transactions' ? t.financial.transactions : t.financial.commissions}
            </button>
          ))}
        </div>
      </header>

      {/* Summary Cards */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div whileHover={{ y: -5 }} className="glass-card p-6 bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-500/20 rounded-2xl text-teal-500">
                <Wallet size={24} />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                <ShieldCheck size={12} /> SECURE
              </span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{t.financial.masterBalance}</h3>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(state.centralBalance, state.currency, state.lang)}
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500">
                <PieChart size={24} />
              </div>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{t.financial.totalLiquidity}</h3>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(state.centralBalance + totalAgentBalances, state.currency, state.lang)}
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-500">
                <Users size={24} />
              </div>
              <button 
                onClick={() => {
                  setSelectedAgent(agents[0]);
                  setIsTopUpModalOpen(true);
                }}
                className="p-2 bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
              >
                <Plus size={20} />
              </button>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{t.financial.agentBalances}</h3>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalAgentBalances, state.currency, state.lang)}
            </p>
          </motion.div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeSubTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
            {/* Recent Transactions Mini-Table */}
            <div className="glass-card flex flex-col p-0 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <History size={20} className="text-teal-500" />
                  {t.financial.transactions}
                </h3>
                <button onClick={() => setActiveSubTab('transactions')} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
                  {isRTL ? 'عرض الكل' : 'View All'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#111114] z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-3">{t.financial.type}</th>
                      <th className="px-6 py-3">{t.financial.to}</th>
                      <th className="px-6 py-3 text-right">{t.financial.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.financialTransactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              tx.type === 'topup_agent' ? 'bg-blue-500/10 text-blue-500' :
                              tx.type === 'topup_sub' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {tx.type === 'topup_agent' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.financial.types[tx.type]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">{tx.toName}</td>
                        <td className={`px-6 py-4 text-sm font-black text-right ${tx.type === 'withdraw' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatCurrency(tx.amount, state.currency, state.lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Agents Panel */}
            <div className="glass-card p-6 flex flex-col">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Users size={20} className="text-purple-500" />
                {isRTL ? 'إدارة الوكلاء والموزعين' : 'Manage Agents & Distributors'}
              </h3>
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {agents.map(agent => (
                  <div key={agent.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#09090B] flex items-center justify-between group hover:border-teal-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{agent.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase">{agent.role}</span>
                          <span className="text-[10px] text-teal-600 font-black">{agent.commissionRate}% {t.financial.commissionRate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(agent.balance, state.currency, state.lang)}</p>
                      <button 
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsTopUpModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-teal-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto"
                      >
                        {t.financial.topUp} <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeSubTab === 'transactions' && (
          <div className="glass-card flex-1 flex flex-col overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <History size={20} className="text-teal-500" />
                  {t.financial.transactions}
                </h3>
              </div>
              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table dir={isRTL ? 'rtl' : 'ltr'} className={`w-full border-collapse min-w-[800px] ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#111114] z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4">{t.financial.date}</th>
                      <th className="px-6 py-4">{t.financial.type}</th>
                      <th className="px-6 py-4">{t.financial.from}</th>
                      <th className="px-6 py-4">{t.financial.to}</th>
                      <th className="px-6 py-4 text-right">{t.financial.amount}</th>
                      <th className="px-6 py-4 text-center">{t.financial.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.financialTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                            tx.type === 'topup_agent' ? 'bg-blue-500/10 text-blue-500' :
                            tx.type === 'topup_sub' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {t.financial.types[tx.type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{tx.fromName}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{tx.toName}</td>
                        <td className={`px-6 py-4 text-sm font-black text-right ${tx.type === 'withdraw' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatCurrency(tx.amount, state.currency, state.lang)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-emerald-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={12} /> {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeSubTab === 'commissions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Percent size={24} className="text-rose-500" />
                {isRTL ? 'إعدادات عمولات الوكلاء' : 'Agent Commission Rates'}
              </h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                {isRTL ? 'حدد نسبة الربح التي يحصل عليها الوكيل عند كل عملية شحن للمشتركين. سيتم تطبيق هذه النسبة تلقائياً عند تنفيذ عمليات البيع.' : 'Define the profit margin each agent receives for every subscriber charge. Rates are applied automatically during sales.'}
              </p>
              <div className="space-y-6">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                        <Users size={18} />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" lang="en" 
                        value={commissionDrafts[agent.id] ?? String(Number(agent.commissionRate || 0))}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommissionDrafts(prev => ({ ...prev, [agent.id]: val }));
                        }}
                        className="w-20 px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-slate-800 rounded-xl text-center font-black text-teal-500 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <span className="font-black text-slate-400">%</span>
                      <button
                        onClick={() => void handleSaveCommission(agent)}
                        disabled={Boolean(savingCommissionIds[agent.id])}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-3 py-2 text-xs font-black text-white transition-all hover:bg-teal-600 disabled:opacity-50"
                      >
                        {savingCommissionIds[agent.id] ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {isRTL ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 bg-gradient-to-br from-teal-500/5 to-transparent flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-500 mb-6">
                <TrendingUp size={40} />
              </div>
              <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-4">{isRTL ? 'آلية حساب الأرباح' : 'Profit Calculation Logic'}</h4>
              <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-4 max-w-xs">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p>{isRTL ? 'يخصم من محفظة الوكيل سعر التكلفة (سعر الباقة ناقض النسبة).' : 'Agent wallet is charged cost price (package price minus rate).'}</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p>{isRTL ? 'يتم تسجيل الربح الصافي في محفظة الربح التراكمي للوكيل.' : 'Net profit is recorded in the agent\'s cumulative profit wallet.'}</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p>{isRTL ? 'يمكن للمدير العام سحب الأرباح أو تحويلها لأرصدة شحن.' : 'Super Admin can withdraw profits or convert them to recharge balances.'}</p>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <AppModal
        open={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        title={t.financial.topUp}
        subtitle={isRTL ? 'شحن رصيد الوكيل من الرصيد المركزي بشكل مباشر وآمن.' : 'Top up an agent from the central balance securely.'}
        icon={<Wallet size={24} />}
        maxWidthClassName="max-w-md"
        isRTL={isRTL}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setIsTopUpModalOpen(false)} className="flex-1 rounded-2xl bg-slate-200 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              {t.management.cancel}
            </button>
            <button
              onClick={handleTopUp}
              className="flex-1 rounded-2xl bg-teal-500 py-3 text-sm font-black text-white shadow-xl shadow-teal-500/20 transition-all hover:bg-teal-600 disabled:opacity-50"
              disabled={!selectedAgent || !topUpAmount}
            >
              {isRTL ? 'تأكيد الشحن' : 'Confirm Top Up'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? 'الوكيل المستهدف' : 'Target Agent'}</label>
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => setSelectedAgent(agents.find(a => a.id === e.target.value) || null)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-teal-500 dark:border-slate-800 dark:bg-[#18181B] dark:text-slate-200"
            >
              <option value="">{isRTL ? '-- اختر الوكيل --' : '-- Select Agent --'}</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, state.currency, state.lang)})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{t.financial.amount}</label>
            <div className="relative">
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black text-slate-900 outline-none transition-all focus:ring-2 focus:ring-teal-500 dark:border-slate-800 dark:bg-[#18181B] dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">{state.currency}</span>
            </div>
            <p className="mt-2 text-center text-[10px] italic text-slate-500">
              {isRTL ? `المتاح في الخزنة: ${formatCurrency(state.centralBalance, state.currency, state.lang)}` : `Available in Pool: ${formatCurrency(state.centralBalance, state.currency, state.lang)}`}
            </p>
          </div>
        </div>
      </AppModal>
    </motion.div>
  );
}
