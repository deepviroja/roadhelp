import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ServiceTypeConfig } from '@/types';

const OTHER_SERVICE: ServiceTypeConfig = {
  id: 'otherService',
  name: 'Other Service',
  icon: 'Wrench',
  basePrice: 20,
  maxPrice: 100,
  description: 'Share the issue and we will match the right help.',
  isActive: true,
};

export function useServices() {
  const cacheKey = 'cached:services';
  
  const [services, setServices] = useState<ServiceTypeConfig[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [isLoading, setIsLoading] = useState(services.length > 0 ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const normalizeServices = (fetchedServices: ServiceTypeConfig[]) => {
    const withoutLegacyOther = fetchedServices.filter((service) => service.id !== 'other');
    const hasOtherService = withoutLegacyOther.some((service) => service.id === OTHER_SERVICE.id);
    return hasOtherService ? withoutLegacyOther : [...withoutLegacyOther, OTHER_SERVICE];
  };

  useEffect(() => {
    const servicesRef = collection(db, 'services');

    const seedOtherService = async () => {
      try {
        await setDoc(doc(db, 'services', OTHER_SERVICE.id), {
          ...OTHER_SERVICE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (seedError) {
        console.error('Failed to seed other service:', seedError);
      }
    };

    // Fallback timeout safeguard to ensure loading state unblocks within 2 seconds
    const timeoutTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const unsubscribe = onSnapshot(
      servicesRef,
      (snapshot) => {
        clearTimeout(timeoutTimer);
        setError(null);
        let finalServices: ServiceTypeConfig[] = [];
        if (snapshot.empty) {
          seedOtherService();
          finalServices = [OTHER_SERVICE];
        } else {
          const fetchedServices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceTypeConfig));
          finalServices = normalizeServices(fetchedServices);
        }
        setServices(finalServices);
        setIsLoading(false);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(finalServices));
        } catch (err) {
          console.error('Failed to write services cache:', err);
        }
      },
      (err) => {
        clearTimeout(timeoutTimer);
        console.error('Services snapshot error:', err);
        setError(err?.message || 'Unable to load services. Check Firestore security rules.');
        
        // Fallback to cache if present, otherwise fallback to other service
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setServices(JSON.parse(cached));
          } catch {
            setServices([OTHER_SERVICE]);
          }
        } else {
          setServices([OTHER_SERVICE]);
        }
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, [retryTrigger]);


  const updateService = async (service: ServiceTypeConfig) => {
    try {
      const sanitizedService = Object.fromEntries(
        Object.entries({
          ...service,
          updatedAt: new Date().toISOString(),
        }).map(([key, value]) => [key, value === undefined ? null : value])
      );

      await setDoc(doc(db, 'services', service.id), sanitizedService, { merge: true });
      return true;
    } catch (updateError) {
      console.error('Failed to update service:', updateError);
      return false;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      if (serviceId === OTHER_SERVICE.id) return false;
      await deleteDoc(doc(db, 'services', serviceId));
      return true;
    } catch (deleteError) {
      console.error('Failed to delete service:', deleteError);
      return false;
    }
  };

  const retry = () => setRetryTrigger(prev => prev + 1);

  return { services, updateService, deleteService, isLoading, error, retry };
}
