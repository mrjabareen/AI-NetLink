import React, { useState, useEffect, useRef } from 'react';
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = normalizeDigits(e.target.value);
    setLocalValue(val);
    // Simple validation for YYYY-MM-DD
    if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      onChange(val);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onChange(val);
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  return (
    <div className="relative group">
      <input
        type="text"
        value={localValue}
        onChange={handleTextChange}
        placeholder="YYYY-MM-DD"
        className={`${className} pr-10`}
        dir="ltr" // Force left-to-right for English numerals
      />
      <button 
        type="button"
        onClick={openDatePicker}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
      >
        <Calendar size={18} />
      </button>
      {/* Hidden native date picker */}
      <input
        type="date"
        ref={dateInputRef}
        value={value}
        onChange={handleDateChange}
        className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
        lang="en"
      />
    </div>
  );
}
