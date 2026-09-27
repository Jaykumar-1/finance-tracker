import { SUPPORTED_CURRENCIES } from './constants';

export const formatMoney = (amount: number, currencyCode: string = 'INR'): string => {
  const num = Number(amount || 0);
  const found = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];

  try {
    return new Intl.NumberFormat(found.locale, {
      style: 'currency',
      currency: found.code,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(num);
  } catch {
    return `${found.symbol}${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

export const getCurrencySymbol = (currencyCode: string = 'INR'): string => {
  const found = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return found ? found.symbol : '₹';
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const toIsoDate = (dateInput: Date | string | number): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getMonthKey = (dateString: string): string => {
  return String(dateString).slice(0, 7);
};

export const formatMonthYear = (dateOrMonthKey: Date | string, locale: string = 'en-IN'): string => {
  let d: Date;
  if (typeof dateOrMonthKey === 'string' && dateOrMonthKey.length === 7) {
    const [year, month] = dateOrMonthKey.split('-').map(Number);
    d = new Date(year, month - 1, 1);
  } else {
    d = new Date(dateOrMonthKey);
  }
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};
