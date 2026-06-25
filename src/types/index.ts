import { Timestamp, FieldValue } from 'firebase/firestore';

export type UserRole = 'customer' | 'provider' | 'admin';

export type ServiceType =
  | 'towing'
  | 'jumpStart'
  | 'fuelDelivery'
  | 'flatTire'
  | 'lockout'
  | 'engineIssue'
  | 'accidentHelp'
  | 'brakeIssue'
  | 'electricalIssue'
  | 'otherService'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'bidding'
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
  estimatedPrice: number;
  additionalFees: number;
  estimatedTime: number;
  distance: number;
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
  phoneDigits?: string;
  phoneE164?: string;
  countryCode?: string;
  role: UserRole;
  createdAt?: Timestamp | Date | FieldValue;
  profileImage?: string;
  vehicles?: Vehicle[];
  companyName?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  pin?: string;
  businessHours?: string;
  serviceRadiusKm?: number;
  serviceTypes?: ServiceType[];
  vehicleNumber?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  rating?: number;
  totalJobs?: number;
  totalEarnings?: number;
  location?: { lat: number; lng: number };
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
  customerEmail?: string;
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
  serviceLabel?: string;
  vehicleType?: string;
  description: string;
  notes?: string;
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp';
  isEmergency?: boolean;
  vehicleInfo?: {
    make: string;
    model: string;
    color?: string;
    plateNumber: string;
  };
  customerLocation: GeoLocation;
  status: RequestStatus;
  estimatedPrice: number;
  additionalFees?: number;
  totalPrice?: number;
  adminCommission?: number;
  providerEarnings?: number;
  finalPrice?: number;
  platformFee?: number;
  isPaid: boolean;
  paymentMethod?: string;
  tipAmount?: number;
  payoutStatus?: 'pending' | 'scheduled' | 'paid';
  payoutAt?: Timestamp | Date;
  rating?: number;
  review?: string;
  createdAt: Timestamp | Date | FieldValue;
  acceptedAt?: Timestamp | Date;
  arrivingAt?: Timestamp | Date;
  inProgressAt?: Timestamp | Date;
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
    teamContactNumber?: string;
    teamCount?: number;
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
  businessAddress?: string;
  city?: string;
  state?: string;
  pin?: string;
  businessHours?: string;
  serviceRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  serviceTypes: ServiceType[];
  vehicleNumber: string;
  role: 'provider';
}

export type SignupData = SignupDataCustomer | SignupDataProvider;

export interface AuthFormData {
  identifier: string;
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
