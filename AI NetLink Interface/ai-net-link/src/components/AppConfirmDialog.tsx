import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import AppModal from './AppModal';

interface AppConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'danger' | 'warning' | 'success';
  busy?: boolean;
  isRTL?: boolean;
}

export default function AppConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'warning',
  busy = false,
  isRTL = true,
}: AppConfirmDialogProps) {
  const icon = variant === 'danger'
    ? <Trash2 size={22} />
    : variant === 'success'
      ? <CheckCircle2 size={22} />
      : <AlertTriangle size={22} />;

  const accentClass = variant === 'danger'
    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
    : variant === 'success'
      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      icon={icon}
      maxWidthClassName="max-w-md"
      isRTL={isRTL}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-60 ${accentClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
        {description}
      </div>
    </AppModal>
  );
}
