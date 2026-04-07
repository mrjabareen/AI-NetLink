import React from 'react';
import { MessageSquareText } from 'lucide-react';
import AppModal from './AppModal';

interface AppPromptDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  type?: 'text' | 'email' | 'tel' | 'number';
  isRTL?: boolean;
}

export default function AppPromptDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  label,
  value,
  onChange,
  placeholder,
  confirmLabel,
  cancelLabel,
  busy = false,
  type = 'text',
  isRTL = true,
}: AppPromptDialogProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      icon={<MessageSquareText size={22} />}
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
            disabled={!value.trim() || busy}
            className="flex-1 rounded-2xl bg-teal-500 px-4 py-3 text-sm font-black text-white shadow-xl shadow-teal-500/20 transition-all hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </label>
        <input
          autoFocus
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
    </AppModal>
  );
}
