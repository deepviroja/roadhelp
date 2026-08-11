import { ServiceType } from '@/types';

export const SERVICE_BACKGROUND_IMAGES: Record<string, string> = {
  towing: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1200&auto=format&fit=crop',
  flatTire: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?q=80&w=1200&auto=format&fit=crop',
  battery: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1200&auto=format&fit=crop',
  fuelDelivery: 'https://images.unsplash.com/photo-1527018601619-a508a2be00d6?q=80&w=1200&auto=format&fit=crop',
  lockout: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop',
  engineIssue: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1200&auto=format&fit=crop',
  accidentHelp: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop',
  otherService: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1200&auto=format&fit=crop',
};

export const DEFAULT_SERVICE_BG = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop';

export function getServiceBackgroundImage(serviceId?: string): string {
  if (!serviceId) return DEFAULT_SERVICE_BG;
  return SERVICE_BACKGROUND_IMAGES[serviceId] || DEFAULT_SERVICE_BG;
}
