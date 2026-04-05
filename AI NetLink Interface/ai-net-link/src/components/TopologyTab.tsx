import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Network, Server, Router, Activity, ShieldAlert, CheckCircle2, Map as MapIcon, Layers } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';

interface TopologyTabProps {
  state: AppState;
}

export default function TopologyTab({ state }: TopologyTabProps) {
  const isRTL = state.lang === 'ar';
  const [viewMode, setViewMode] = useState<'logical' | 'geo' | 'heatmap'>('logical');

  // Simulated nodes
  const nodes = [
    { id: 1, type: 'core', name: 'Core-R1-Riyadh', status: 'healthy', x: 50, y: 30 },
    { id: 2, type: 'core', name: 'Core-R2-Jeddah', status: 'healthy', x: 30, y: 50 },
    { id: 3, type: 'edge', name: 'Edge-DMM-01', status: 'warning', x: 70, y: 50 },
    { id: 4, type: 'server', name: 'DB-Cluster-01', status: 'healthy', x: 50, y: 70 },
    { id: 5, type: 'edge', name: 'Edge-TAB-02', status: 'critical', x: 20, y: 20 },
    { id: 6, type: 'server', name: 'Auth-Server-A', status: 'healthy', x: 80, y: 20 },
  ];

  // Simulated links
  const links = [
    { source: 1, target: 2 },
    { source: 1, target: 3 },
    { source: 1, target: 4 },
    { source: 2, target: 4 },
    { source: 2, target: 5 },
    { source: 3, target: 6 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/50';
      case 'warning': return 'text-amber-500 bg-amber-500/20 border-amber-500/50';
      case 'critical': return 'text-rose-500 bg-rose-500/20 border-rose-500/50';
      default: return 'text-slate-500 bg-slate-500/20 border-slate-500/50';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'core': return <Router size={24} />;
      case 'edge': return <Network size={24} />;
      case 'server': return <Server size={24} />;
      default: return <Activity size={24} />;
    }
  };

  return (
    <motion.div key="topology" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col min-h-0">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {state.lang === 'en' ? 'Network Topology' : 'طوبولوجيا الشبكة'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {state.lang === 'en' ? 'Interactive 3D visualization of network nodes and links.' : 'تصور تفاعلي ثلاثي الأبعاد لعقد الشبكة والروابط.'}
          </p>
        </div>
        <div className="flex flex-wrap bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setViewMode('logical')}
            className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'logical' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Layers size={16} />
            <span className="hidden sm:inline">{state.lang === 'en' ? 'Logical View' : 'العرض المنطقي'}</span>
          </button>
          <button 
            onClick={() => setViewMode('geo')}
            className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'geo' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <MapIcon size={16} />
            <span className="hidden sm:inline">{state.lang === 'en' ? 'Geo-Map' : 'الخريطة الجغرافية'}</span>
          </button>
          <button 
            onClick={() => setViewMode('heatmap')}
            className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'heatmap' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Activity size={16} />
            <span className="hidden sm:inline">{state.lang === 'en' ? 'Hotspot Heatmap' : 'خريطة حرارة Hotspot'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 glass-panel rounded-3xl overflow-hidden relative border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center bg-slate-50/30 dark:bg-[#09090B]/80">
        
        {/* Background Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(148, 163, 184, 0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Heatmap Layer (Visible only in heatmap mode) */}
        {viewMode === 'heatmap' && (
          <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-multiply dark:mix-blend-screen">
            <div className="absolute top-[20%] left-[30%] w-64 h-64 bg-rose-500 rounded-full blur-[80px]" />
            <div className="absolute top-[50%] left-[60%] w-96 h-96 bg-amber-500 rounded-full blur-[100px]" />
            <div className="absolute top-[70%] left-[20%] w-48 h-48 bg-emerald-500 rounded-full blur-[60px]" />
          </div>
        )}

        {/* SVG Links */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;
            
            return (
              <line 
                key={i}
                x1={`${sourceNode.x}%`} 
                y1={`${sourceNode.y}%`} 
                x2={`${targetNode.x}%`} 
                y2={`${targetNode.y}%`} 
                stroke="currentColor" 
                strokeWidth="2"
                className="text-slate-300 dark:text-slate-700"
                strokeDasharray="4 4"
              >
                <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
              </line>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <motion.div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 cursor-pointer group"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            whileHover={{ scale: 1.1 }}
          >
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center backdrop-blur-md shadow-lg transition-all ${getStatusColor(node.status)}`}>
              {getIcon(node.type)}
              
              {/* Pulse effect for warning/critical */}
              {node.status !== 'healthy' && (
                <span className="absolute inset-0 rounded-2xl animate-ping opacity-50 border-2 border-current" />
              )}
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{node.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{node.type}</p>
            </div>
          </motion.div>
        ))}

        {/* Legend */}
        <div className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} glass-card p-4 rounded-2xl flex flex-col gap-3`}>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{state.lang === 'en' ? 'Status Legend' : 'دليل الحالة'}</h4>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> {state.lang === 'en' ? 'Healthy' : 'سليم'}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> {state.lang === 'en' ? 'Warning' : 'تحذير'}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> {state.lang === 'en' ? 'Critical' : 'حرج'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
