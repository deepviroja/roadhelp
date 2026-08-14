import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { dbLite as db } from '@/config/firebase-lite';
import { VehicleTypeConfig } from '@/types';

const DEFAULT_VEHICLE_TYPES: VehicleTypeConfig[] = [
  { id: 'car', name: 'Car / Sedan', sortOrder: 1, isActive: true, icon: 'Car' },
  { id: 'suv', name: 'SUV / Crossover', sortOrder: 2, isActive: true, icon: 'Car' },
  { id: 'hatchback', name: 'Hatchback', sortOrder: 3, isActive: true, icon: 'Car' },
  { id: 'bike', name: 'Motorcycle / Scooter', sortOrder: 4, isActive: true, icon: 'Bike' },
  { id: 'van', name: 'Van / Minivan', sortOrder: 5, isActive: true, icon: 'Truck' },
  { id: 'truck', name: 'Commercial Truck', sortOrder: 6, isActive: true, icon: 'Truck' },
  { id: 'ev', name: 'Electric Vehicle (EV)', sortOrder: 7, isActive: true, icon: 'Zap' },
];

export async function fetchVehicleTypes(): Promise<VehicleTypeConfig[]> {
  try {
    const q = query(collection(db, 'vehicleTypes'), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_VEHICLE_TYPES;
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VehicleTypeConfig);
  } catch {
    return DEFAULT_VEHICLE_TYPES;
  }
}

export async function saveVehicleType(type: VehicleTypeConfig): Promise<void> {
  const docId = type.id || type.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await setDoc(doc(db, 'vehicleTypes', docId), { ...type, id: docId }, { merge: true });
}

export async function deleteVehicleType(id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicleTypes', id));
}
