import React from 'react';
import { motion } from 'motion/react';
import { Map as MapIcon, Navigation, Wrench, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';

interface FieldServiceTabProps {
  state: AppState;
}

const mockTechs = [
  { id: 'T-01', name: 'Khalid A.', status: 'en-route', location: 'Tabuk Node A', eta: '15 mins', task: 'Fiber Splicing' },
  { id: 'T-02', name: 'Fahad M.', status: 'working', location: 'Jeddah Corniche', eta: '-', task: 'Hotspot AP Replacement' },
  { id: 'T-03', name: 'Omar S.', status: 'available', location: 'Riyadh HQ', eta: '-', task: 'Standby' },
];

const mockTickets = [
  { id: 'INC-9921', title: 'Sector Down - Al Olaya', priority: 'high', time: '2 hrs ago', status: 'assigned' },
  { id: 'INC-9922', title: 'Customer B.O.I Install', priority: 'medium', time: '4 hrs ago', status: 'pending' },
  { id: 'INC-9923', title: 'Routine Maintenance', priority: 'low', time: '1 day ago', status: 'completed' },
];

export default function FieldServiceTab({ state }: FieldServiceTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';

  return (
    <motion.div key="field" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapIcon className="text-emerald-500" />
            {t.nav.field}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRTL ? 'تتبع الفنيين وإدارة تذاكر الصيانة الميدانية' : 'Track technicians and manage field maintenance tickets'}
          </p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          {isRTL ? 'إرسال فني' : 'Dispatch Tech'}
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Map Area (Mocked) */}
        <div className="flex-1 glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
          {/* Grid background to simulate map */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          {/* Mock Map Markers */}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/3 left-1/4 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full animate-ping absolute"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg relative z-10 border-2 border-white dark:border-slate-800">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="mt-2 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              Khalid A.
            </div>
          </motion.div>

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="absolute top-1/2 right-1/3 flex flex-col items-center">
            <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg relative z-10 border-2 border-white dark:border-slate-800">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="mt-2 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              Fahad M.
            </div>
          </motion.div>

          <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{isRTL ? 'في الطريق' : 'En Route'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{isRTL ? 'يعمل' : 'Working'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{isRTL ? 'متاح' : 'Available'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Data */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto">
          {/* Active Techs */}
          <div className="glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              {isRTL ? 'الفنيون النشطون' : 'Active Technicians'}
            </h3>
            <div className="space-y-3">
              {mockTechs.map(tech => (
                <div key={tech.id} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">{tech.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                      tech.status === 'en-route' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                      tech.status === 'working' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}>
                      {tech.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1"><MapIcon className="w-3 h-3" /> {tech.location}</p>
                    {tech.eta !== '-' && <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {tech.eta}</p>}
                    <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{tech.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Tickets */}
          <div className="glass-panel rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              {isRTL ? 'تذاكر مفتوحة' : 'Open Tickets'}
            </h3>
            <div className="space-y-3">
              {mockTickets.map(ticket => (
                <div key={ticket.id} className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm text-slate-900 dark:text-white leading-tight">{ticket.title}</span>
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      ticket.priority === 'high' ? 'bg-rose-500' :
                      ticket.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{ticket.id}</span>
                    <span>{ticket.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
