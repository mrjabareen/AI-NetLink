import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, FileText, User, TrendingUp, Truck, ShieldCheck, ExternalLink, Database } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import { getSmartMatchScore, smartMatch } from '../utils/search';

interface SearchTabProps {
  state: AppState;
}

type Category = 'all' | 'subscribers' | 'investors' | 'suppliers' | 'team';

interface SearchResult {
  id: string;
  name: string;
  type: Category;
  status: string;
  details: string;
  icon: any;
}

export default function SearchTab({ state }: SearchTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  // Mock Database
  const database: SearchResult[] = useMemo(() => [
    { id: 'sub-1', name: 'Yousef Al-Masri', type: 'subscribers', status: isRTL ? 'نشط' : 'Active', details: 'Plan: Premium Fiber (100Mbps)', icon: User },
    { id: 'sub-2', name: 'Mona Hassan', type: 'subscribers', status: isRTL ? 'متأخر' : 'Overdue', details: 'Plan: Basic Home (30Mbps)', icon: User },
    { id: 'sub-3', name: 'Laila Hassan', type: 'subscribers', status: isRTL ? 'نشط' : 'Active', details: 'Plan: Ultra Fiber (100Mbps)', icon: User },
    { id: 'inv-1', name: 'Investment Group Alpha', type: 'investors', status: isRTL ? 'مساهم رئيسي' : 'Major Shareholder', details: 'Ownership: 15.4%', icon: TrendingUp },
    { id: 'inv-2', name: 'Omar Jabarin', type: 'investors', status: isRTL ? 'نشط' : 'Active', details: 'Ownership: 2.1%', icon: TrendingUp },
    { id: 'inv-3', name: 'Ahmed Al-Rashed', type: 'investors', status: isRTL ? 'نشط' : 'Active', details: 'Ownership: 0.5%', icon: TrendingUp },
    { id: 'sup-1', name: 'Cisco Systems', type: 'suppliers', status: isRTL ? 'شريك معتمد' : 'Certified Partner', details: 'Equipment: Core Routers', icon: Truck },
    { id: 'sup-2', name: 'Nokia Networks', type: 'suppliers', status: isRTL ? 'نشط' : 'Active', details: 'Equipment: OLT/ONT Nodes', icon: Truck },
    { id: 'sup-3', name: 'Ubiquiti Networks', type: 'suppliers', status: isRTL ? 'نشط' : 'Active', details: 'Equipment: Wireless Gear', icon: Truck },
    { id: 'team-1', name: 'Ahmed Al-Farsi', type: 'team', status: isRTL ? 'مدير عام' : 'CEO', details: 'Role: System Administrator', icon: ShieldCheck },
    { id: 'team-2', name: 'Sarah Connor', type: 'team', status: isRTL ? 'مدير NOC' : 'NOC Manager', details: 'Role: Network Operations', icon: ShieldCheck },
    { id: 'team-3', name: 'Khalid Abdullah', type: 'team', status: isRTL ? 'مشرف دعم' : 'Support Supervisor', details: 'Role: Customer Support', icon: ShieldCheck },
  ], [isRTL]);

  const filteredResults = useMemo(() => {
    return database
      .map(item => {
        const score = Math.max(
          getSmartMatchScore(query, item.name),
          getSmartMatchScore(query, item.details)
        );
        return { item, score };
      })
      .filter(({ item, score }) => {
        const matchesQuery = !query || score > 0;
        const matchesCategory = activeCategory === 'all' || item.type === activeCategory;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .map(({ item }) => item);
  }, [query, activeCategory, database]);

  const knowledgeResults = [
    t.search.result1,
    t.search.result2,
    t.search.result3
  ];

  return (
    <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-8 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-2">
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 shadow-lg shadow-teal-500/10">
          <Search size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t.search.globalSearch}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t.search.placeholder}</p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-6' : 'left-6'} text-slate-400 w-6 h-6`} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          className={`w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl py-5 ${isRTL ? 'pr-16 pl-32' : 'pl-16 pr-32'} text-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 shadow-xl transition-all text-slate-800 dark:text-slate-100`}
        />
        <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex gap-2`}>
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {isRTL ? 'مسح' : 'Clear'}
            </button>
          )}
          <button className="px-6 py-2.5 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20">
            {t.search.searchBtn}
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-2">
        {(['all', 'subscribers', 'investors', 'suppliers', 'team'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeCategory === cat 
                ? 'bg-teal-500 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-teal-500/50'
            }`}
          >
            {t.search.categories[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Database Results Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Database size={18} className="text-teal-500" />
              {t.search.results}
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredResults.length} {isRTL ? 'سجلات' : 'Records'}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/30">
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.name}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.type}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.status}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{t.search.table.details}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center">{t.search.table.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredResults.length > 0 ? filteredResults.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-teal-500/10 group-hover:text-teal-500 transition-colors">
                          <item.icon size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md">
                        {t.search.categories[item.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${item.status === 'Active' || item.status === 'نشط' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {item.details}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 text-slate-400 hover:text-teal-500 transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                      {t.search.noResults}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Knowledge Base Section (Only show if query matches or no query) */}
        {(!query || knowledgeResults.some(r => smartMatch(query, r.title))) && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">{isRTL ? 'قاعدة المعرفة والتقارير' : 'Knowledge Base & Reports'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeResults.filter(r => !query || smartMatch(query, r.title)).map((result, i) => (
                <div key={i} className="glass-card p-6 flex gap-4 hover:border-teal-500/30 cursor-pointer group transition-all hover:shadow-lg hover:shadow-teal-500/5">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl h-fit text-slate-500 dark:text-slate-400 group-hover:text-teal-500 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{result.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{result.desc}</p>
                    <div className="flex gap-2 mt-4">
                      {result.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-500 dark:text-slate-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
