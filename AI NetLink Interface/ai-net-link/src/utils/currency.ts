import { Currency, Lang } from '../types';

const EXCHANGE_RATES = {
  ILS: 1,
  USD: 0.28, // 1 ILS = 0.28 USD (approx)
  JOD: 0.20, // 1 ILS = 0.20 JOD (approx)
};

const CURRENCY_SYMBOLS = {
  ILS: '₪',
  USD: '$',
  JOD: 'JD',
};

const CURRENCY_LABELS_AR = {
  ILS: 'شيكل',
  USD: 'دولار',
  JOD: 'دينار',
};

export function formatCurrency(amountInILS: number, currency: Currency, lang: Lang, decimalPlaces: number = 2): string {
  const rate = EXCHANGE_RATES[currency];
  const converted = amountInILS * rate;
  
  const symbol = CURRENCY_SYMBOLS[currency];
  const labelAr = CURRENCY_LABELS_AR[currency];
  
  const formattedValue = converted.toLocaleString('en-US', { 
    minimumFractionDigits: decimalPlaces, 
    maximumFractionDigits: decimalPlaces,
    useGrouping: true
  });

  if (lang === 'ar') {
    return `${formattedValue} ${labelAr}`;
  }
  
  return `${symbol}${formattedValue}`;
}
