import { useState } from 'react';
import { Plus, Trash2, Car, Check } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/config/firebase';
import { Vehicle, UserProfile } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

import { useVehicleTypes } from '@/hooks/useVehicleTypes';

interface VehicleManagerProps {
  profile: UserProfile;
  onRefresh: () => Promise<void>;
}

type VehicleDraft = Partial<Vehicle>;
type VehicleErrors = Partial<Record<'make' | 'model' | 'plateNumber' | 'type', string>>;

const FALLBACK_VEHICLE_TYPES = [
  { value: 'Car', label: 'Car' },
  { value: 'SUV', label: 'SUV / MUV' },
  { value: 'Motorcycle', label: 'Motorcycle' },
  { value: 'Truck', label: 'Truck / HCV' },
  { value: 'Van', label: 'Van / Minivan' },
  { value: 'Other', label: 'Other' },
];

function validateVehicleDraft(draft: VehicleDraft): VehicleErrors {
  const errors: VehicleErrors = {};
  if (!draft.make?.trim()) errors.make = 'Vehicle brand is required';
  if (!draft.model?.trim()) errors.model = 'Vehicle model is required';
  if (!draft.plateNumber?.trim()) errors.plateNumber = 'Vehicle number is required';
  if (!draft.type?.trim()) errors.type = 'Vehicle type is required';
  return errors;
}

export function VehicleManager({ profile, onRefresh }: VehicleManagerProps) {
  const { activeVehicleTypes } = useVehicleTypes();
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleDraft>({
    make: '',
    model: '',
    plateNumber: '',
    type: '',
  });

  const vehicleTypeOptions = activeVehicleTypes.length > 0
    ? activeVehicleTypes.map((v) => ({ value: v.name, label: v.name }))
    : FALLBACK_VEHICLE_TYPES;
  const [errors, setErrors] = useState<VehicleErrors>({});

  const updateDraft = (next: VehicleDraft) => {
    setNewVehicle(next);
    setErrors(validateVehicleDraft(next));
  };

  const handleAddVehicle = async () => {
    const nextErrors = validateVehicleDraft(newVehicle);
    setErrors(nextErrors);

    if (!profile || Object.keys(nextErrors).length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const vehicle: Vehicle = {
        id: crypto.randomUUID(),
        make: newVehicle.make!,
        model: newVehicle.model!,
        plateNumber: newVehicle.plateNumber!,
        type: newVehicle.type || 'Car',
      };

      await updateDoc(doc(db, 'users', profile.uid), {
        vehicles: arrayUnion(vehicle),
      });

      await onRefresh();
      setIsAdding(false);
      setNewVehicle({ make: '', model: '', plateNumber: '', type: '' });
      setErrors({});
      toast.success('Vehicle added to your garage!');
    } catch {
      toast.error('Failed to add vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        vehicles: arrayRemove(vehicle),
      });
      await onRefresh();
      toast.success('Vehicle removed');
    } catch {
      toast.error('Failed to remove vehicle');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">My Garage</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage vehicles for quick request setup</p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 h-9 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 mb-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle Type */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Vehicle Type <span className="text-red-500">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {vehicleTypeOptions.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateDraft({ ...newVehicle, type: t.value })}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          newVehicle.type === t.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {errors.type && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.type}</p>}
                </div>

                {/* Brand */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Vehicle Brand <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. Toyota, Honda"
                    value={newVehicle.make || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, make: e.target.value })}
                    className={`h-11 rounded-xl font-bold ${errors.make ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                  />
                  {errors.make && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.make}</p>}
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Model <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. Camry, Civic"
                    value={newVehicle.model || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, model: e.target.value })}
                    className={`h-11 rounded-xl font-bold ${errors.model ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                  />
                  {errors.model && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.model}</p>}
                </div>

                {/* Plate */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Plate Number <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. GJ-01-AB-1234"
                    value={newVehicle.plateNumber || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, plateNumber: e.target.value })}
                    className={`h-11 rounded-xl font-bold ${errors.plateNumber ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                  />
                  {errors.plateNumber && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.plateNumber}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setErrors({}); }}>Cancel</Button>
                <Button size="sm" className="bg-blue-600 text-white rounded-xl" onClick={handleAddVehicle}>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save Vehicle
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(!profile.vehicles || profile.vehicles.length === 0) && !isAdding ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No saved vehicles yet.</p>
            <Button
              variant="link"
              className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1"
              onClick={() => setIsAdding(true)}
            >
              Add your first vehicle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.vehicles?.map((vehicle) => (
              <div key={vehicle.id} className="group relative bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Plate: {vehicle.plateNumber}</p>
                    {vehicle.type && (
                      <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                        {vehicle.type}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1 flex-shrink-0"
                    onClick={() => handleDeleteVehicle(vehicle)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
