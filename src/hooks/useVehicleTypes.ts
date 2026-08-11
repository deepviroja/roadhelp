import { useEffect, useState } from 'react';
import { fetchVehicleTypes, saveVehicleType, deleteVehicleType } from '@/lib/vehicleTypeService';
import { VehicleTypeConfig } from '@/types';

export function useVehicleTypes() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTypes = async () => {
    setIsLoading(true);
    const data = await fetchVehicleTypes();
    setVehicleTypes(data);
    setIsLoading(false);
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
