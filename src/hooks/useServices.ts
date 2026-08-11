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
  const [services, setServices] = useState<ServiceTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (snapshot.empty) {
          seedOtherService();
          setServices([OTHER_SERVICE]);
        } else {
          const fetchedServices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceTypeConfig));
          setServices(normalizeServices(fetchedServices));
        }
        setIsLoading(false);
      },
      (err) => {
        clearTimeout(timeoutTimer);
        console.error('Services snapshot error:', err);
        setError(err?.message || 'Unable to load services. Check Firestore security rules.');
        setServices([OTHER_SERVICE]);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, []);


  const updateService = async (service: ServiceTypeConfig) => {
    try {
      await setDoc(doc(db, 'services', service.id), {
        ...service,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
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

  return { services, updateService, deleteService, isLoading, error };
}
