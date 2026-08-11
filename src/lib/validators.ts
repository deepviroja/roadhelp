import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Z]/, 'Add one uppercase letter')
  .regex(/[0-9]/, 'Add one number');

const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\d{7,15}$/, 'Enter a valid 7 to 15 digit phone number');

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['customer', 'provider', 'admin']),
});

export const customerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Please enter your full name'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    countryCode: z.string().min(1, 'Select a country code'),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    role: z.literal('customer'),
  })
  .catchall(z.any())
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const providerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Please enter the owner name'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    countryCode: z.string().min(1, 'Select a country code'),
    phone: phoneSchema,
    companyName: z.string().min(2, 'Shop name is required'),
    licenseNumber: z.string().optional(),
    businessAddress: z.string().min(5, 'Business address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pin: z.string().min(4, 'Enter a valid PIN code'),
    businessHours: z.string().min(2, 'Add your business hours'),
    serviceRadiusKm: z.preprocess(
      (val) => (val === '' || val === undefined || val === null || isNaN(Number(val)) ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Add a service radius', required_error: 'Add a service radius' })
        .min(1, 'Add a service radius')
        .max(500, 'Radius is too large')
    ),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    serviceTypes: z.array(z.string()).min(1, 'Choose at least one service'),
    vehicleNumber: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    role: z.literal('provider'),
  })
  .catchall(z.any())
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });


export const serviceRequestSchema = z.object({
  serviceType: z.string().min(1, 'Select a service'),
  description: z.string().min(5, 'Please tell us a little more about the issue'),
  vehicleMake: z.string().min(1, 'Vehicle brand is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleColor: z.string().optional().or(z.literal('')),
  vehiclePlate: z.string().min(1, 'Vehicle number is required'),
  locationDetails: z.string().optional(),
});

export const guestHelpSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number').max(15, 'Phone number is too long'),
  countryCode: z.string().min(1, 'Select a country code'),
  vehicleType: z.string().min(2, 'Vehicle type is required'),
  vehicleBrand: z.string().min(2, 'Vehicle brand is required'),
  vehicleModel: z.string().min(2, 'Vehicle model is required'),
  vehicleNumber: z.string().optional().or(z.literal('')),
  serviceType: z.string().min(1, 'Select a service'),
  description: z.string().min(5, 'Please describe what is happening'),
  notes: z.string().optional(),
  preferredContactMethod: z.enum(['phone', 'email', 'whatsapp']),
  isEmergency: z.boolean(),
}).catchall(z.any());

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  countryCode: z.string().optional(),
  phone: z.string().min(7, 'Enter a valid phone number').max(15, 'Phone number is too long'),
  serviceRadiusKm: z.union([z.number(), z.string()]).optional(),
});

export const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().regex(/^\d{4}$/, 'Enter a valid year'),
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
