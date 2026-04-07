import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
  isRTL?: boolean;
}

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidthClassName = 'max-w-xl',
  isRTL = true,
}: AppModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            className={`relative w-full ${maxWidthClassName} overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-[#09090B]/95`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-violet-500/10 pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3 min-w-0">
                {icon ? (
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-500">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={isRTL ? 'إغلاق' : 'Close'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 custom-scrollbar">{children}</div>

            {footer ? (
              <div className="border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
