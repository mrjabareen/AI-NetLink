/**
 * Formats a number to always use English (Western Arabic) numerals.
 */
export function formatNumber(value: number | string, options?: Intl.NumberFormatOptions): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('en-US', options);
}

/**
 * Formats a large number with abbreviations (K, M, B) in English numerals.
 */
export function formatCompactNumber(value: number): string {
  return formatNumber(value, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  });
}

/**
 * Normalizes Arabic/Persian digits to English (Western Arabic) digits.
 */
export function normalizeDigits(value: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  return value.replace(/[٠-٩]/g, (d) => {
    const idx = arabicDigits.indexOf(d);
    return idx !== -1 ? idx.toString() : d;
  }).replace(/[۰-۹]/g, (d) => {
    const idx = persianDigits.indexOf(d);
    return idx !== -1 ? idx.toString() : d;
  });
}

/**
 * Parses a numeric input string by normalizing digits and stripping non-numeric characters (except decimal point).
 */
export function parseNumericInput(value: string, isFloat: boolean = false): number {
  const normalized = normalizeDigits(value);
  // Strip everything except digits and optionally one decimal point
  const stripped = normalized.replace(isFloat ? /[^\d.]/g : /[^\d]/g, '');
  
  if (isFloat) {
    return parseFloat(stripped) || 0;
  }
  return parseInt(stripped, 10) || 0;
}

/**
 * Formats a date to always use English (Western Arabic) numerals.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
