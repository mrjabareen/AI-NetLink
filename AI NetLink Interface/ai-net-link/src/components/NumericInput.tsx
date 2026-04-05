import React, { useState, useEffect } from 'react';
import { formatNumber, normalizeDigits, parseNumericInput } from '../utils/format';

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  isFloat?: boolean;
  formatOptions?: Intl.NumberFormatOptions;
  className?: string;
  placeholder?: string;
}

export default function NumericInput({ 
  value, 
  onChange, 
  isFloat = false, 
  formatOptions,
  className,
  placeholder
}: NumericInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  // Sync local value when not focused or when value changes externally
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatNumber(value, formatOptions));
    }
  }, [value, isFocused, formatOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow typing freely, just normalize digits (Arabic -> English)
    const normalized = normalizeDigits(val);
    setLocalValue(normalized);
    
    // Parse and notify parent
    const parsed = parseNumericInput(normalized, isFloat);
    onChange(parsed);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // When focused, show the raw number for "complete freedom" of editing
    // We use toString() to avoid commas while typing
    setLocalValue(value === 0 ? '' : value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Re-format with commas on blur
    setLocalValue(formatNumber(value, formatOptions));
  };

  return (
    <input
      type="text"
      inputMode={isFloat ? "decimal" : "numeric"}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
}
