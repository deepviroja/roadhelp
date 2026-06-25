import { ServiceType, ServiceTypeConfig } from '@/types';

export const SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    id: 'towing',
    name: 'Towing',
    icon: 'Truck',
    basePrice: 50,
    maxPrice: 150,
    description: 'Safe towing to a garage, home, or repair stop.',
    isActive: true,
  },
  {
    id: 'jumpStart',
    name: 'Jump Start',
    icon: 'BatteryCharging',
    basePrice: 25,
    maxPrice: 50,
    description: 'Battery boost help when your vehicle will not start.',
    isActive: true,
  },
  {
    id: 'fuelDelivery',
    name: 'Fuel Delivery',
    icon: 'Fuel',
    basePrice: 20,
    maxPrice: 40,
    description: 'Fuel brought straight to your location so you can keep moving.',
    isActive: true,
  },
  {
    id: 'flatTire',
    name: 'Tyre puncture',
    icon: 'CircleDot',
    basePrice: 30,
    maxPrice: 60,
    description: 'Tire change or roadside repair at your location.',
    isActive: true,
  },
  {
    id: 'lockout',
    name: 'Lockout',
    icon: 'Key',
    basePrice: 35,
    maxPrice: 70,
    description: 'Quick help when your keys are locked in the vehicle.',
    isActive: true,
  },
  {
    id: 'engineIssue',
    name: 'Engine Issue',
    icon: 'Wrench',
    basePrice: 45,
    maxPrice: 120,
    description: 'Roadside diagnostics and help for engine trouble.',
    isActive: true,
  },
  {
    id: 'accidentHelp',
    name: 'Accident Help',
    icon: 'CircleDot',
    basePrice: 60,
    maxPrice: 180,
    description: 'Fast roadside assistance after a minor accident or breakdown.',
    isActive: true,
  },
  {
    id: 'brakeIssue',
    name: 'Brake Issue',
    icon: 'Wrench',
    basePrice: 50,
    maxPrice: 130,
    description: 'Urgent roadside support for brake-related problems.',
    isActive: true,
  },
  {
    id: 'electricalIssue',
    name: 'Electrical Issue',
    icon: 'BatteryCharging',
    basePrice: 45,
    maxPrice: 110,
    description: 'Help for wiring, lights, and other electrical faults.',
    isActive: true,
  },
  {
    id: 'otherService',
    name: 'Other Service',
    icon: 'Wrench',
    basePrice: 20,
    maxPrice: 100,
    description: 'Share the issue and we will match the right help.',
    isActive: true,
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'Wrench',
    basePrice: 20,
    maxPrice: 100,
    description: 'Legacy alias for other service requests.',
    isActive: false,
  },
];

export const SERVICE_MAP: Record<ServiceType, ServiceTypeConfig> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.id, s])
) as Record<ServiceType, ServiceTypeConfig>;

export const REQUEST_STATUSES = [
  { value: 'pending', label: 'Waiting' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'arriving', label: 'On the way' },
  { value: 'inProgress', label: 'In progress' },
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
  { value: 'flatTire', label: 'Tyre puncture' },
  { value: 'lockout', label: 'Lockout' },
  { value: 'engineIssue', label: 'Engine Issue' },
  { value: 'accidentHelp', label: 'Accident Help' },
  { value: 'brakeIssue', label: 'Brake Issue' },
  { value: 'electricalIssue', label: 'Electrical Issue' },
  { value: 'otherService', label: 'Other Service' },
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Customer',
    rating: 5,
    text: 'RoadHelp made a stressful night much easier. A provider arrived quickly and kept me updated the whole time.',
    avatar: '👩',
  },
  {
    id: 2,
    name: 'Marcus Thompson',
    role: 'Customer',
    rating: 5,
    text: 'I was back on the road in minutes after a dead battery. Clear pricing and friendly service.',
    avatar: '👨',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    role: 'Customer',
    rating: 4,
    text: 'The fuel delivery was simple to book and the updates were easy to follow from start to finish.',
    avatar: '👩',
  },
];

export const STATS = [
  { label: 'Verified providers', value: '500+' },
  { label: 'Jobs completed', value: '10,000+' },
  { label: 'Average rating', value: '4.8' },
  { label: 'Cities covered', value: '50+' },
];


