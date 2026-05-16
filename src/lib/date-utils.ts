import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export function ensureDate(date: unknown): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (date && typeof date === 'object' && 'toDate' in date && typeof (date as any).toDate === 'function') {
    return (date as any).toDate();
  }
  if (typeof date === 'string' || typeof date === 'number') return new Date(date);
  return new Date();
}

export function formatSafe(date: unknown, formatStr: string = 'PP'): string {
  try {
    const d = ensureDate(date);
    return format(d, formatStr);
  } catch {
    return 'N/A';
  }
}
