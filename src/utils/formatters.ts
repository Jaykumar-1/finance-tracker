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

<<<<<<< HEAD
/**
 * Normalize a transaction/calendar date to a local-calendar YYYY-MM-DD key.
 * Date-only ISO values are calendar dates, not UTC instants; passing them to
 * new Date() makes them the previous day in timezones west of UTC.
 * For ISO datetime values, preserve the date portion recorded by the source
 * rather than shifting the transaction to another day due to its UTC offset.
 */
export const toIsoDate = (dateInput: Date | string | number): string => {
  if (typeof dateInput === 'string') {
    const value = dateInput.trim();
    const isoDateMatch = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:$|T|\\s)/);
    if (isoDateMatch) {
      const year = Number(isoDateMatch[1]);
      const month = Number(isoDateMatch[2]);
      const day = Number(isoDateMatch[3]);
      const check = new Date(year, month - 1, day);
      if (check.getFullYear() === year && check.getMonth() === month - 1 && check.getDate() === day) {
        return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
      }
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
=======
export const toIsoDate = (dateInput: Date | string | number): string => {
  const d = new Date(dateInput);
>>>>>>> ef174d7 (Update finance tracker)
  if (isNaN(d.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

<<<<<<< HEAD
/** Normalize legacy/imported transaction dates before indexing, filtering or syncing. */
export const normalizeTransactionDate = <T extends { date: string }>(tx: T): T => ({
  ...tx,
  date: toIsoDate(tx.date)
});

=======
>>>>>>> ef174d7 (Update finance tracker)
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

/** Build ordered category name list, preferring explicit order when present. */
export function orderedCategoryNames(
  structure: Record<string, string[]>,
  order?: string[]
): string[] {
  const keys = Object.keys(structure || {});
  if (!order || order.length === 0) return keys;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of order) {
    if (Object.prototype.hasOwnProperty.call(structure, name) && !seen.has(name)) {
      result.push(name);
      seen.add(name);
    }
  }
  for (const name of keys) {
    if (!seen.has(name)) result.push(name);
  }
  return result;
}

export function classificationKey(category: string, subcategory?: string): string {
  const cat = (category || '').trim();
  const sub = (subcategory || '').trim();
  return sub ? `${cat}||${sub}` : cat;
}
