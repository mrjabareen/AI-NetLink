import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Wallet, ShoppingCart, History, Info, ArrowLeft, Edit } from 'lucide-react';
import { AppState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/currency';
import { formatNumber, normalizeDigits, parseNumericInput, formatDate } from '../utils/format';
import NumericInput from './NumericInput';
import { dict } from '../dict';
import { toastError, toastSuccess } from '../utils/notify';

interface InvestorsTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const stockData = [
  { date: '2026-03-20', price: 12.5 },
  { date: '2026-03-21', price: 12.8 },
  { date: '2026-03-22', price: 13.2 },
  { date: '2026-03-23', price: 13.1 },
  { date: '2026-03-24', price: 13.5 },
  { date: '2026-03-25', price: 14.2 },
  { date: '2026-03-21', price: 14.8 },
  { date: '2026-03-27', price: 15.1 },
];

const investorList = [
  { 
    id: '1', 
    name: 'Ahmed Al-Rashed', 
    shares: 25000, 
    dividends: 12500, 
    status: 'active',
    investment: 350000,
    joinDate: '2025-01-15',
    email: 'ahmed.r@example.com',
    transactions: [
      { id: 'tx-1-1', date: '2026-03-25', type: 'buy', shares: 5000, price: 14.20, amount: 71000, status: 'completed' },
      { id: 'tx-1-2', date: '2026-02-10', type: 'dividend', amount: 5000, status: 'completed' },
    ]
  },
  { 
    id: '2', 
    name: 'Sarah International Group', 
    shares: 150000, 
    dividends: 75000, 
    status: 'active',
    investment: 2100000,
    joinDate: '2024-11-20',
    email: 'contact@sarah-intl.com',
    transactions: [
      { id: 'tx-2-1', date: '2026-03-10', type: 'buy', shares: 50000, price: 13.50, amount: 675000, status: 'completed' },
    ]
  },
  { 
    id: '3', 
    name: 'Khalid Investment Fund', 
    shares: 85000, 
    dividends: 42500, 
    status: 'active',
    investment: 1100000,
    joinDate: '2025-03-05',
    email: 'info@khalid-fund.sa',
    transactions: []
  },
  { 
    id: '4', 
    name: 'Nora Al-Saud', 
    shares: 12000, 
    dividends: 6000, 
    status: 'active',
    investment: 160000,
    joinDate: '2025-06-12',
    email: 'nora.s@example.com',
    transactions: []
  },
];

export default function InvestorsTab({ state, setState }: InvestorsTabProps) {
  const isRTL = state.lang === 'ar';
  const t = dict[state.lang];
  const isShareholder = state.role === 'shareholder';
  const isAdmin = ['super_admin', 'admin', 'sas4_manager'].includes(state.role);
  
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'trading' | 'dividends' | 'shareholders' | 'transactions' | 'reports'>('overview');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedShareholderId, setSelectedShareholderId] = useState<string | null>(null);
  const [isDistributing, setIsDistributing] = useState(false);
  const [dividendAmount, setDividendAmount] = useState<number>(0);

  const investorList = state.shareholders;
  const selectedShareholder = investorList.find(s => s.id === selectedShareholderId);

  // Data for the logged-in shareholder
  const myShareholderRecord = investorList.find(s => s.id === state.currentUser?.shareholderId) || investorList[0];
  
  const myData = {
    shares: myShareholderRecord.shares,
    investment: myShareholderRecord.investment,
    dividends: myShareholderRecord.dividends,
    avgPrice: myShareholderRecord.investment / (myShareholderRecord.shares || 1),
    currentValue: myShareholderRecord.shares * state.investorSettings.sharePrice,
    profitLoss: (myShareholderRecord.shares * state.investorSettings.sharePrice) - myShareholderRecord.investment,
    transactions: myShareholderRecord.transactions
  };

  const handleTrade = () => {
    if (quantity <= 0) return;
    
    const price = tradeType === 'buy' ? state.investorSettings.buyPrice : state.investorSettings.sellPrice;
    const amount = quantity * price;
    
    if (tradeType === 'sell' && quantity > myShareholderRecord.shares) {
      toastError(isRTL ? 'رصيد الأسهم غير كافٍ لإتمام عملية البيع.' : 'Insufficient shares to complete the sale.', isRTL ? 'رصيد غير كافٍ' : 'Insufficient Shares');
      return;
    }

    const newTransaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: tradeType,
      shares: quantity,
      price: price,
      amount: amount,
      status: 'completed' as const
    };

    setState(prev => ({
      ...prev,
      shareholders: prev.shareholders.map(s => {
        if (s.id === myShareholderRecord.id) {
          return {
            ...s,
            shares: tradeType === 'buy' ? s.shares + quantity : s.shares - quantity,
            investment: tradeType === 'buy' ? s.investment + amount : s.investment - amount,
            transactions: [newTransaction, ...s.transactions]
          };
        }
        return s;
      })
    }));

    setQuantity(0);
    toastSuccess(isRTL ? 'تمت العملية بنجاح.' : 'Transaction completed successfully.', isRTL ? 'تمت العملية' : 'Transaction Completed');
  };

  const handleDistributeDividends = () => {
    if (dividendAmount <= 0) return;

    const totalShares = investorList.reduce((acc, s) => acc + s.shares, 0);
    const perShare = dividendAmount / totalShares;

    setState(prev => ({
      ...prev,
      shareholders: prev.shareholders.map(s => {
        const amount = s.shares * perShare;
        return {
          ...s,
          dividends: s.dividends + amount,
          transactions: [{
            id: `div-${Date.now()}-${s.id}`,
            date: new Date().toISOString().split('T')[0],
            type: 'dividend',
            amount: amount,
            status: 'completed' as const
          }, ...s.transactions]
        };
      }),
      investorSettings: {
        ...prev.investorSettings,
        lastDividendDate: new Date().toISOString().split('T')[0]
      }
    }));

    setIsDistributing(false);
    setDividendAmount(0);
    toastSuccess(isRTL ? 'تم توزيع الأرباح بنجاح.' : 'Dividends distributed successfully.', isRTL ? 'تم التوزيع' : 'Distribution Completed');
  };

  return (
    <motion.div 
      key="investors" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex-1 flex flex-col min-h-0 space-y-6"
    >
      <header className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="text-emerald-500" size={28} />
            {isShareholder ? t.investor.dashboard : t.management.tabs.shareholders}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm max-w-2xl leading-relaxed">
            {isShareholder ? t.investor.accountInfo : t.management.subtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t.investor.myStocks} (NLK)</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang, state.numberSettings.decimalPlaces)} <span className="text-xs text-emerald-500">+2.4%</span></span>
            </div>
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
        </div>
      </header>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl self-start">
        <button 
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'overview' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          {t.investor.dashboard}
        </button>
        {isShareholder && (
          <>
            <button 
              onClick={() => setActiveSubTab('transactions')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'transactions' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.investor.transactions}
            </button>
            <button 
              onClick={() => setActiveSubTab('reports')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'reports' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.investor.profitLoss}
            </button>
          </>
        )}
        {!isShareholder && (
          <>
            <button 
              onClick={() => setActiveSubTab('shareholders')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'shareholders' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.management.tabs.shareholders}
            </button>
            <button 
              onClick={() => setActiveSubTab('trading')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'trading' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t.investor.availableShares}
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveSubTab('dividends')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'dividends' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          {t.investor.dividends}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-6">
        {activeSubTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {isShareholder ? (
                <>
                  <div className="glass-card p-5 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.investor.myStocks}</span>
                      <PieChart size={18} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(myData.shares)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">{(myData.shares / state.investorSettings.totalShares * 100).toFixed(4)}% {isRTL ? 'من الشركة' : 'of company'}</div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.investor.totalValue}</span>
                      <Wallet size={18} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(myData.currentValue, state.currency, state.lang, 0)}</div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> {formatCurrency(myData.profitLoss, state.currency, state.lang, 0)} {isRTL ? 'ربح' : 'Profit'}
                    </div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.investor.dividends}</span>
                      <DollarSign size={18} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(myData.dividends, state.currency, state.lang, 0)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">{isRTL ? 'إجمالي الأرباح المستلمة' : 'Total dividends received'}</div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-violet-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.investor.performance}</span>
                      <BarChart3 size={18} className="text-violet-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">+{(myData.profitLoss / myData.investment * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1">{isRTL ? 'العائد على الاستثمار' : 'Return on Investment'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.marketCap}</span>
                      <BarChart3 size={18} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(state.investorSettings.sharePrice * state.investorSettings.totalShares, state.currency, state.lang, 0)}</div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> +5.2% {isRTL ? 'هذا العام' : 'Yearly'}
                    </div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.investor.availableShares}</span>
                      <PieChart size={18} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{state.investorSettings.totalShares.toLocaleString('en-US')}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">100% {isRTL ? 'مملوكة' : 'Issued'}</div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.dashboard.sharePrice}</span>
                      <DollarSign size={18} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(state.investorSettings.sharePrice, state.currency, state.lang, state.numberSettings.decimalPlaces)}</div>
                    <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                      <ArrowUpRight size={12} /> +0.12 {isRTL ? 'منذ الربع الأخير' : 'vs Q2'}
                    </div>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-l-violet-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.management.tabs.shareholders}</span>
                      <Users size={18} className="text-violet-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(428)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">{isRTL ? 'مساهمون مسجلون' : 'Registered Shareholders'}</div>
                  </div>
                </>
              )}
            </div>

            {/* Chart & List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card p-6 lg:col-span-2 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.investor.performance}</h3>
                  <div className="flex gap-2">
                    {['1W', '1M', '3M', '1Y'].map(p => (
                      <button key={p} className={`px-2 py-1 rounded text-[10px] font-bold ${p === '1M' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stockData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 flex flex-col">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{isShareholder ? t.investor.transactions : t.investor.dashboard}</h3>
                <div className="space-y-4 flex-1">
                  {(isShareholder ? myData.transactions : investorList).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {isShareholder ? (item.type === 'buy' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <DollarSign size={14} className="text-blue-500" />) : item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{isShareholder ? (item.type === 'buy' ? t.investor.myStocks : t.investor.dividends) : item.name}</p>
                          <p className="text-[10px] text-slate-500">{isShareholder ? formatDate(item.date) : `${item.shares.toLocaleString()} ${isRTL ? 'سهم' : 'shares'}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${isShareholder ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-500'}`}>
                          {isShareholder ? formatCurrency(item.amount, state.currency, state.lang, 0) : formatCurrency(item.dividends, state.currency, state.lang, 0)}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{isShareholder ? item.status : t.investor.dividends}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {!isShareholder && (
                  <button 
                    onClick={() => setActiveSubTab('shareholders')}
                    className="mt-4 w-full py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                  >
                    {isRTL ? 'عرض الكل' : 'View All'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {activeSubTab === 'transactions' && isShareholder && (
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.investor.transactions}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'الأسهم' : 'Shares'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'السعر' : 'Price'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">{tx.shares ? formatNumber(tx.shares) : '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">{tx.price ? formatCurrency(tx.price, state.currency, state.lang, 2) : '-'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(tx.amount, state.currency, state.lang, 0)}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'reports' && isShareholder && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">{t.investor.profitLoss}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(myData.investment, state.currency, state.lang, 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{isRTL ? 'القيمة الحالية' : 'Current Market Value'}</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(myData.currentValue, state.currency, state.lang, 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{isRTL ? 'صافي الربح/الخسارة' : 'Net Profit/Loss'}</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-500">{formatCurrency(myData.profitLoss, state.currency, state.lang, 0)}</span>
                    <p className="text-[10px] text-emerald-600 font-bold">+{(myData.profitLoss / myData.investment * 100).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">{t.investor.dividends}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{isRTL ? 'الأرباح المستلمة (2026)' : 'Dividends Received (2026)'}</span>
                  <span className="text-lg font-bold text-blue-500">{formatCurrency(myData.dividends, state.currency, state.lang, 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{isRTL ? 'الأرباح المتوقعة (الربع القادم)' : 'Projected Dividends (Next Q)'}</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(myData.shares * 0.5, state.currency, state.lang, 0)}</span>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isRTL 
                      ? 'تعتمد توزيعات الأرباح على أداء الشركة المالي وقرارات مجلس الإدارة. يتم دفع الأرباح عادةً في منتصف كل ربع سنة.' 
                      : 'Dividend distributions depend on company financial performance and board decisions. Payouts are typically made mid-quarter.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'trading' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                <ShoppingCart size={20} className="text-emerald-500" />
                {t.settings.investors.executeTrade}
              </h3>
              
              <div className="space-y-6">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button 
                    onClick={() => setTradeType('buy')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tradeType === 'buy' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}
                  >
                    {t.settings.investors.buy}
                  </button>
                  <button 
                    onClick={() => setTradeType('sell')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tradeType === 'sell' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
                  >
                    {t.settings.investors.sell}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.settings.investors.quantity}</label>
                    <NumericInput 
                      value={quantity}
                      onChange={(val) => setQuantity(val)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" 
                      placeholder="0" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.settings.investors.orderType}</label>
                    <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option>{t.settings.investors.marketPrice}</option>
                      <option>{t.settings.investors.limitOrder}</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t.settings.investors.estPrice}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {formatCurrency(tradeType === 'buy' ? state.investorSettings.buyPrice : state.investorSettings.sellPrice, state.currency, state.lang, state.numberSettings.decimalPlaces)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{t.settings.investors.fees}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(0, state.currency, state.lang, state.numberSettings.decimalPlaces)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-100">{t.settings.investors.total}</span>
                    <span className={`font-bold ${tradeType === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(quantity * (tradeType === 'buy' ? state.investorSettings.buyPrice : state.investorSettings.sellPrice), state.currency, state.lang, state.numberSettings.decimalPlaces)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleTrade}
                  className={`w-full py-4 text-white rounded-xl font-bold shadow-lg transition-all ${tradeType === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}
                >
                  {tradeType === 'buy' ? t.settings.investors.confirmBuy : t.settings.investors.confirmSell}
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                <History size={20} className="text-blue-500" />
                {t.settings.investors.history}
              </h3>
              <div className="space-y-4">
                {myShareholderRecord.transactions.filter(tx => tx.type !== 'dividend').slice(0, 5).map((trade, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {trade.type === 'buy' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{trade.type === 'buy' ? t.settings.investors.buy : t.settings.investors.sell} NLK</p>
                        <p className="text-[10px] text-slate-500">{formatDate(trade.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatNumber(trade.shares || 0)} {isRTL ? 'سهم' : 'shares'}</p>
                      <p className="text-[10px] text-slate-500">@ {formatCurrency(trade.price || 0, state.currency, state.lang, state.numberSettings.decimalPlaces)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'shareholders' && (
          <div className="space-y-6">
            {!selectedShareholderId ? (
              <>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setActiveSubTab('overview')}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <ArrowUpRight className="rotate-[-135deg]" size={16} />
                    {t.settings.investors.back}
                  </button>
                  {isAdmin && (
                    <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                      <Users size={14} /> {t.settings.investors.addShareholder}
                    </button>
                  )}
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.settings.investors.listTitle}</h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {investorList.length} {isRTL ? 'مساهمين' : 'Shareholders'}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.shareholder}</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.sharesOwned}</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.ownership}</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.dividends}</th>
                          <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.status}</th>
                          {isAdmin && (
                            <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center">{t.settings.investors.actions}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {investorList.map((investor) => (
                          <tr key={investor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer" onClick={() => setSelectedShareholderId(investor.id)}>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                  {investor.name.charAt(0)}
                                </div>
                                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{investor.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-base text-slate-600 dark:text-slate-400 font-mono">
                              {formatNumber(investor.shares)}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${(investor.shares / state.investorSettings.totalShares) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-slate-500">
                                  {((investor.shares / state.investorSettings.totalShares) * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-lg font-bold text-emerald-500">
                              {formatCurrency(investor.dividends, state.currency, state.lang, 0)}
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase rounded-lg">
                                {isRTL ? 'نشط' : 'Active'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-5 text-center">
                                <button className="p-2.5 text-slate-400 hover:text-blue-500 transition-colors">
                                  <Info size={20} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedShareholderId(null)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    {t.settings.investors.back}
                  </button>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
                      <Edit size={14} /> {t.settings.investors.editData}
                    </button>
                    <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
                      <ArrowDownRight size={14} /> {t.settings.investors.reduceShares}
                    </button>
                    <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors">
                      <ArrowUpRight size={14} /> {t.settings.investors.addShares}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-300">
                          {selectedShareholder.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedShareholder.name}</h3>
                          <p className="text-sm text-slate-500">{selectedShareholder.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t.investor.myStocks}</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(selectedShareholder.shares)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t.investor.totalValue}</p>
                          <p className="text-lg font-bold text-emerald-500">{formatCurrency(selectedShareholder.shares * state.investorSettings.sharePrice, state.currency, state.lang, 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t.investor.dividends}</p>
                          <p className="text-lg font-bold text-blue-500">{formatCurrency(selectedShareholder.dividends, state.currency, state.lang, 0)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{isRTL ? 'تاريخ الانضمام' : 'Join Date'}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(selectedShareholder.joinDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card overflow-hidden">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{t.investor.transactions}</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.date}</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.type}</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.amount}</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{t.settings.investors.total}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedShareholder.transactions && selectedShareholder.transactions.length > 0 ? selectedShareholder.transactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : tx.type === 'sell' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {tx.type === 'buy' ? t.settings.investors.buy : tx.type === 'sell' ? t.settings.investors.sell : t.investor.dividends}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">{tx.shares ? formatNumber(tx.shares) : '-'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(tx.amount, state.currency, state.lang, 0)}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm italic">
                                  {isRTL ? 'لا توجد معاملات مسجلة' : 'No transactions recorded'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.investor.profitLoss}</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">{isRTL ? 'إجمالي الاستثمار' : 'Total Investment'}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(selectedShareholder.investment, state.currency, state.lang, 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">{isRTL ? 'صافي الربح' : 'Net Profit'}</span>
                          <span className="text-sm font-bold text-emerald-500">+{formatCurrency((selectedShareholder.shares * state.investorSettings.sharePrice) - selectedShareholder.investment, state.currency, state.lang, 0)}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{isRTL ? 'نسبة العائد' : 'ROI %'}</span>
                            <span className="text-lg font-black text-emerald-500">
                              +{(((selectedShareholder.shares * state.investorSettings.sharePrice) - selectedShareholder.investment) / selectedShareholder.investment * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-6">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{isRTL ? 'ملاحظات إدارية' : 'Admin Notes'}</h3>
                      <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        placeholder={isRTL ? 'أضف ملاحظات حول هذا المساهم...' : 'Add notes about this shareholder...'}
                      />
                      <button className="mt-2 w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        {isRTL ? 'حفظ الملاحظة' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'dividends' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 border-l-4 border-l-blue-500">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.investor.dividends}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(myData.dividends, state.currency, state.lang, 0)}</div>
                <p className="text-[10px] text-slate-500 mt-1">{isRTL ? 'إجمالي الأرباح المستلمة' : 'Total dividends received'}</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'آخر توزيع' : 'Last Distribution'}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatDate(state.investorSettings.lastDividendDate)}</div>
                <p className="text-[10px] text-slate-500 mt-1">{isRTL ? 'تاريخ آخر دفعة' : 'Date of last payout'}</p>
              </div>
              <div className="glass-card p-6 border-l-4 border-l-amber-500">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRTL ? 'عائد التوزيعات' : 'Dividend Yield'}</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{state.investorSettings.dividendYield}%</div>
                <p className="text-[10px] text-slate-500 mt-1">{isRTL ? 'سنوي متوقع' : 'Annual projected'}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="glass-card p-6 bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.investor.dividends}</h3>
                    <p className="text-xs text-slate-500 mt-1">{isRTL ? 'توزيع الأرباح على جميع المساهمين بناءً على عدد الأسهم' : 'Distribute profits to all shareholders based on share count'}</p>
                  </div>
                  <button 
                    onClick={() => setIsDistributing(true)}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                  >
                    {isRTL ? 'بدء توزيع الأرباح' : 'Start Dividend Distribution'}
                  </button>
                </div>
              </div>
            )}

            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">{isRTL ? 'سجل توزيع الأرباح' : 'Dividend History'}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'التاريخ' : 'Date'}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'لكل سهم' : 'Per Share'}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">{isRTL ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { date: '2026-01-15', total: 500000, perShare: 0.05, status: 'completed' },
                      { date: '2025-10-15', total: 450000, perShare: 0.045, status: 'completed' },
                      { date: '2025-07-15', total: 400000, perShare: 0.04, status: 'completed' },
                    ].map((div, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(div.date)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(div.total, state.currency, state.lang, 0)}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">{formatCurrency(div.perShare, state.currency, state.lang, 3)}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">{div.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Dividend Distribution Modal */}
      {isDistributing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{isRTL ? 'توزيع أرباح جديدة' : 'New Dividend Distribution'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{isRTL ? 'إجمالي المبلغ المراد توزيعه' : 'Total Amount to Distribute'}</label>
                <NumericInput 
                  value={dividendAmount}
                  onChange={setDividendAmount}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{isRTL ? 'إجمالي الأسهم' : 'Total Shares'}</span>
                  <span className="font-bold">{formatNumber(investorList.reduce((acc, s) => acc + s.shares, 0))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">{isRTL ? 'المبلغ لكل سهم' : 'Amount Per Share'}</span>
                  <span className="font-bold text-emerald-500">
                    {formatCurrency(dividendAmount / (investorList.reduce((acc, s) => acc + s.shares, 0) || 1), state.currency, state.lang, 4)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => setIsDistributing(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleDistributeDividends}
                className="flex-1 py-3 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                {isRTL ? 'تأكيد التوزيع' : 'Confirm Distribution'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
