import { ServiceType, ServiceTypeConfig } from '@/types';

export const SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    id: 'towing',
    name: 'Towing',
    icon: 'Truck',
    basePrice: 50,
    maxPrice: 150,
    description: 'Vehicle towing to nearest garage or location of your choice',
    isActive: true,
  },
  {
    id: 'jumpStart',
    name: 'Jump Start',
    icon: 'BatteryCharging',
    basePrice: 25,
    maxPrice: 50,
    description: 'Battery jump start service to get you back on the road',
    isActive: true,
  },
  {
    id: 'fuelDelivery',
    name: 'Fuel Delivery',
    icon: 'Fuel',
    basePrice: 20,
    maxPrice: 40,
    description: 'Emergency fuel delivery when you run out of gas',
    isActive: true,
  },
  {
    id: 'flatTire',
    name: 'Flat Tire',
    icon: 'Target',
    basePrice: 30,
    maxPrice: 60,
    description: 'Tire change or repair service at your location',
    isActive: true,
  },
  {
    id: 'lockout',
    name: 'Lockout',
    icon: 'Key',
    basePrice: 35,
    maxPrice: 70,
    description: 'Professional lockout assistance to get you back in your vehicle',
    isActive: true,
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'Wrench',
    basePrice: 20,
    maxPrice: 100,
    description: 'Other roadside assistance services not listed above',
    isActive: true,
  },
];

export const SERVICE_MAP: Record<ServiceType, ServiceTypeConfig> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.id, s])
) as Record<ServiceType, ServiceTypeConfig>;

export const REQUEST_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'arriving', label: 'Arriving' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const COMMISSION_RATE = 0.15; // 15% platform fee

export const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.006 }; // New York City
export const DEFAULT_MAP_ZOOM = 14;

export const ADMIN_EMAIL = 'admin@roadhelp.com';

export const PROVIDER_SERVICE_OPTIONS = [
  { value: 'towing', label: 'Towing' },
  { value: 'jumpStart', label: 'Jump Start' },
  { value: 'fuelDelivery', label: 'Fuel Delivery' },
  { value: 'flatTire', label: 'Flat Tire' },
  { value: 'lockout', label: 'Lockout' },
  { value: 'other', label: 'Other' },
];

// Sample testimonials data
export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Customer',
    rating: 5,
    text: 'RoadHelp saved me when I got a flat tire on the highway at midnight. The provider arrived in under 15 minutes!',
    avatar: '👩',
  },
  {
    id: 2,
    name: 'Marcus Thompson',
    role: 'Customer',
    rating: 5,
    text: 'Dead battery on the way to an important meeting. RoadHelp connected me with a provider in 3 minutes. Amazing service!',
    avatar: '👨',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    role: 'Customer',
    rating: 4,
    text: 'Ran out of gas 10 miles from the nearest station. Fuel was delivered within 20 minutes. Lifesaver!',
    avatar: '👩',
  },
];

export const STATS = [
  { label: 'Verified Providers', value: '500+' },
  { label: 'Rescues Completed', value: '10,000+' },
  { label: 'Average Rating', value: '4.8' },
  { label: 'Cities Covered', value: '50+' },
];
