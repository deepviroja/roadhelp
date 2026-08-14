import { useEffect, useState } from 'react';
import { fetchVehicleTypes, saveVehicleType, deleteVehicleType } from '@/lib/vehicleTypeService';
import { VehicleTypeConfig } from '@/types';

export function useVehicleTypes() {
  const cacheKey = 'cached:vehicleTypes';
  
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeConfig[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [isLoading, setIsLoading] = useState(vehicleTypes.length > 0 ? false : true);

  const loadTypes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVehicleTypes();
      setVehicleTypes(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to fetch vehicle types:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  return {
    vehicleTypes,
    activeVehicleTypes: vehicleTypes.filter((v) => v.isActive ?? true),
    isLoading,
    refresh: loadTypes,
    saveVehicleType: async (type: VehicleTypeConfig) => {
      await saveVehicleType(type);
      await loadTypes();
    },
    deleteVehicleType: async (id: string) => {
      await deleteVehicleType(id);
      await loadTypes();
    },
  };
}
