import { Timestamp, FieldValue } from 'firebase/firestore';

export type UserRole = 'customer' | 'provider' | 'admin';

export type ServiceType =
  | 'towing'
  | 'jumpStart'
  | 'fuelDelivery'
  | 'flatTire'
  | 'lockout'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'bidding' // New status for when providers are applying
  | 'accepted'
  | 'arriving'
  | 'inProgress'
  | 'completed'
  | 'cancelled';

export interface RequestProposal {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  providerRating: number;
  providerVehicleNumber: string;
  providerLocation: { lat: number; lng: number };
  estimatedPrice: number; // Provider can set their price within admin range
  additionalFees: number; // NEW: Provider set additional fees
  estimatedTime: number; // in minutes
  distance: number; // in km
  createdAt: Timestamp | Date | FieldValue;
}

export interface Vehicle {
  id?: string;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  color: string;
}

export interface UserProfile {
  photoURL: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  countryCode?: string;
  role: UserRole;
  createdAt?: Timestamp | Date | FieldValue;
  profileImage?: string;
  // Customer-specific
  vehicles?: Vehicle[];
  // Provider-specific
  companyName?: string;
  serviceTypes?: ServiceType[];
  vehicleNumber?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  rating?: number;
  totalJobs?: number;
  totalEarnings?: number;
  location?: { lat: number; lng: number };
  // Analytics
  stats?: {
    applied: number;
    approved: number;
    rejected: number;
  };
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  isGuest?: boolean;
  guestSessionId?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerVehicleNumber?: string;
  providerRating?: number;
  serviceType: ServiceType;
  serviceName?: string;
  serviceIcon?: string;
  serviceBasePrice?: number;
  serviceMaxPrice?: number;
  description: string;
  vehicleInfo?: {
    make: string;
    model: string;
    color?: string;
    plateNumber: string;
  };
  customerLocation: GeoLocation;
  status: RequestStatus;
  estimatedPrice: number;
  additionalFees?: number; // NEW
  totalPrice?: number; // NEW: additionalFees + servicePrice
  adminCommission?: number; // Hidden from user
  providerEarnings?: number; // Hidden from user
  finalPrice?: number; // NEW: actual settled price
  platformFee?: number; // NEW: actual administrative fee
  isPaid: boolean;

  paymentMethod?: string;
  tipAmount?: number; // NEW
  payoutStatus?: 'pending' | 'scheduled' | 'paid'; // NEW
  payoutAt?: Timestamp | Date; // NEW
  rating?: number;
  review?: string;
  createdAt: Timestamp | Date | FieldValue;
  acceptedAt?: Timestamp | Date;
  arrivingAt?: Timestamp | Date; // NEW
  inProgressAt?: Timestamp | Date; // NEW
  completedAt?: Timestamp | Date;
  cancelledAt?: Timestamp | Date;
}

export interface AppSettings {
  payoutDelayDays: number;
  minCommissionPct: number;
  heroSlides: {
    id: string;
    image: string;
    title: string;
    order: number;
  }[];
  featuredReviews: {
    id: string;
    requestId: string;
    name: string;
    rating: number;
    text: string;
    date: string;
  }[];
  sosConfig?: {
    policeNumber: string;
    ambulanceNumber: string;
    helplineNumber: string;
  };
}

export interface TrackingData {
  providerLat: number;
  providerLng: number;
  heading?: number | null;
  speed?: number | null;
  eta?: string;
  lastUpdated: number;
}

export interface ServiceTypeConfig {
  id: ServiceType;
  name: string;
  icon: string;
  basePrice: number;
  maxPrice: number;
  description: string;
  isActive?: boolean;
}

export interface SignupDataCustomer {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'customer';
}

export interface SignupDataProvider {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  serviceTypes: ServiceType[];
  vehicleNumber: string;
  role: 'provider';
}

export type SignupData = SignupDataCustomer | SignupDataProvider;

export interface AuthFormData {
  email: string;
  password: string;
  role: UserRole;
}

export interface EarningsEntry {
  requestId: string;
  date: Date;
  customerName: string;
  serviceType: ServiceType;
  amount: number;
  commission: number;
  netEarnings: number;
}
