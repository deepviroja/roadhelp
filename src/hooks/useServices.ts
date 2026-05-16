import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ServiceTypeConfig } from '@/types';
import { SERVICE_TYPES } from '@/lib/constants';

export function useServices() {
  const [services, setServices] = useState<ServiceTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const servicesRef = collection(db, 'services');
    
    const seedServices = async () => {
      try {
        const promises = SERVICE_TYPES.map(service => 
          setDoc(doc(db, 'services', service.id), {
            ...service,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        );
        await Promise.all(promises);
      } catch (error) {
        console.error('Failed to seed services:', error);
      }
    };

    const unsubscribe = onSnapshot(
      servicesRef,
      (snapshot) => {
        setError(null);
        if (snapshot.empty) {
          // Seed the database if empty (will fail safely if rules disallow writes)
          seedServices();
          setServices([]);
        } else {
          const fetchedServices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceTypeConfig));
          setServices(fetchedServices);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Services snapshot error:', err);
        setError(err?.message || 'Unable to load services. Check Firestore security rules.');
        setServices([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateService = async (service: ServiceTypeConfig) => {
    try {
      await setDoc(doc(db, 'services', service.id), {
        ...service,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Failed to update service:', error);
      return false;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'services', serviceId));
      return true;
    } catch (error) {
      console.error('Failed to delete service:', error);
      return false;
    }
  };

  return { services, updateService, deleteService, isLoading, error };
}
