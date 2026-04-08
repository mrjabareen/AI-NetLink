import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { normalizeDigits } from '../utils/format';

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  label?: string;
}

export default function DateInput({ value, onChange, className, label }: DateInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeDigits(e.target.value).replace(/[^\d-]/g, '').slice(0, 10);
    setLocalValue(val);
    // Simple validation for YYYY-MM-DD
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      onChange(val);
    }
  };

  return (
    <div className="relative group">
      <input
        type="text"
        value={localValue}
        onChange={handleTextChange}
        placeholder="YYYY-MM-DD"
        inputMode="numeric"
        lang="en"
        className={`${className} pr-10 font-mono`}
        dir="ltr"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Calendar size={18} />
      </span>
    </div>
  );
}
