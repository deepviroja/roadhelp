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
    return `â‚¹${amount}`;
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

export function normalizeStatus(status: string): RequestStatus {
  const legacyMap: Record<string, RequestStatus> = {
    pending: 'submitted',
    bidding: 'offers_received',
    arriving: 'provider_en_route',
    inProgress: 'in_progress',
  };
  return (legacyMap[status] || status) as RequestStatus;
}

export function getStatusColor(rawStatus: RequestStatus): string {
  const status = normalizeStatus(rawStatus);
  const colors: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    searching_providers: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    offers_received: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    provider_selected: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    provider_en_route: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    provider_arrived: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    in_progress: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-600 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
    expired: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    pendingUserApproval: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  };

  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
}

export function getStatusLabel(rawStatus: RequestStatus): string {
  const status = normalizeStatus(rawStatus);
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Request Submitted',
    searching_providers: 'Searching Nearby Providers',
    offers_received: 'Offers Received',
    provider_selected: 'Provider Selected',
    accepted: 'Provider Assigned',
    provider_en_route: 'Provider En Route',
    provider_arrived: 'Provider Arrived',
    in_progress: 'Work In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Request Expired',
    pendingUserApproval: 'Pending Customer Approval',
  };

  return labels[status] || status;
}


export function getServiceLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    towing: 'Towing',
    jumpStart: 'Jump Start',
    fuelDelivery: 'Fuel Delivery',
    flatTire: 'Tyre puncture',
    lockout: 'Lockout',
    engineIssue: 'Engine Issue',
    accidentHelp: 'Accident Help',
    brakeIssue: 'Brake Issue',
    electricalIssue: 'Electrical Issue',
    otherService: 'Other Service',
    other: 'Other Service',
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

