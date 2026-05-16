import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ServiceType, RequestStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency?: string): string {
  // Read from system store if available, fallback to INR
  let activeCurrency = currency || 'INR';
  try {
    // Dynamic import to avoid circular deps - read from window if set
    const stored = (window as unknown as Record<string, unknown>).__systemCurrency as string;
    if (stored) activeCurrency = stored;
  } catch { /* ignore */ }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: activeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}


export function formatDate(date: Date | { toDate: () => Date } | unknown): string {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : (date as { toDate: () => Date }).toDate?.() || new Date(date as string);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getStatusColor(status: RequestStatus): string {
  const colors: Record<RequestStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    arriving: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    inProgress: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-600 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
    bidding: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  };

  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
}

export function getStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    arriving: 'Provider Arriving',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    bidding: 'Bidding in Progress',
  };

  return labels[status] || status;
}

export function getServiceLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    towing: 'Towing',
    jumpStart: 'Jump Start',
    fuelDelivery: 'Fuel Delivery',
    flatTire: 'Flat Tire',
    lockout: 'Lockout',
    other: 'Other',
  };
  return labels[type] || type;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
