import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['customer', 'provider', 'admin']),
});

export const customerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    countryCode: z.string().min(1, 'Country code is required'),
    phone: z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long'),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.literal('customer'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const providerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    countryCode: z.string().min(1, 'Country code is required'),
    phone: z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    serviceTypes: z.array(z.string()).min(1, 'Please select at least one service type'),
    vehicleNumber: z.string().min(2, 'Vehicle number is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.literal('provider'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const serviceRequestSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  description: z.string().min(5, 'Please provide at least 5 characters describing the issue'),
  vehicleMake: z.string().min(1, 'Vehicle make is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleColor: z.string().optional().or(z.literal('')),
  vehiclePlate: z.string().min(1, 'License plate is required'),
  locationDetails: z.string().optional(),
});

export const guestHelpSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long'),
  countryCode: z.string().min(1, 'Country code is required'),
  vehicleMake: z.string().min(2, 'Vehicle make is required'),
  vehicleModel: z.string().min(2, 'Vehicle model is required'),
  vehicleColor: z.string().optional().or(z.literal('')),
  vehiclePlate: z.string().min(2, 'License plate is required'),
  description: z.string().min(5, 'Please describe the problem'),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  countryCode: z.string().optional(),
  phone: z.string().min(7, 'Phone number is too short').max(15, 'Phone number is too long'),
});

export const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().regex(/^\d{4}$/, 'Please enter a valid year'),
  plateNumber: z.string().min(1, 'Plate number is required'),
  color: z.string().min(1, 'Color is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CustomerSignupFormData = z.infer<typeof customerSignupSchema>;
export type ProviderSignupFormData = z.infer<typeof providerSignupSchema>;
export type ServiceRequestFormData = z.infer<typeof serviceRequestSchema>;
export type GuestHelpFormData = z.infer<typeof guestHelpSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type VehicleFormData = z.infer<typeof vehicleSchema>;
