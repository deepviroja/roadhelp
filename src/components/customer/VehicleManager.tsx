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

interface VehicleManagerProps {
  profile: UserProfile;
  onRefresh: () => Promise<void>;
}

type VehicleDraft = Partial<Vehicle>;
type VehicleErrors = Partial<Record<'make' | 'model' | 'year' | 'plateNumber' | 'color', string>>;

function validateVehicleDraft(draft: VehicleDraft): VehicleErrors {
  const errors: VehicleErrors = {};

  if (!draft.make?.trim()) errors.make = 'Vehicle brand is required';
  if (!draft.model?.trim()) errors.model = 'Vehicle model is required';
  if (!draft.year?.trim()) errors.year = 'Vehicle year is required';
  if (!draft.plateNumber?.trim()) errors.plateNumber = 'Vehicle number is required';
  if (!draft.color?.trim()) errors.color = 'Vehicle color is required';

  return errors;
}

export function VehicleManager({ profile, onRefresh }: VehicleManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState<VehicleDraft>({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    plateNumber: '',
    color: '',
  });
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
        year: newVehicle.year!,
        plateNumber: newVehicle.plateNumber!,
        color: newVehicle.color || '',
      };

      await updateDoc(doc(db, 'users', profile.uid), {
        vehicles: arrayUnion(vehicle),
      });

      await onRefresh();
      setIsAdding(false);
      setNewVehicle({ make: '', model: '', year: new Date().getFullYear().toString(), plateNumber: '', color: '' });
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Saved vehicles</h2>
          <p className="text-sm text-gray-500">Manage the vehicles you use most often</p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 h-9"
          >
            <Plus className="w-4 h-4" />
            Add vehicle
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
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vehicle brand</Label>
                  <Input
                    placeholder="Toyota"
                    value={newVehicle.make || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, make: e.target.value })}
                    className={errors.make ? 'border-red-500 bg-red-50' : ''}
                  />
                  {errors.make && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.make}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle model</Label>
                  <Input
                    placeholder="Camry"
                    value={newVehicle.model || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, model: e.target.value })}
                    className={errors.model ? 'border-red-500 bg-red-50' : ''}
                  />
                  {errors.model && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.model}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle year</Label>
                  <Input
                    placeholder="2023"
                    value={newVehicle.year || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, year: e.target.value })}
                    className={errors.year ? 'border-red-500 bg-red-50' : ''}
                  />
                  {errors.year && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.year}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle number</Label>
                  <Input
                    placeholder="ABC-1234"
                    value={newVehicle.plateNumber || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, plateNumber: e.target.value })}
                    className={errors.plateNumber ? 'border-red-500 bg-red-50' : ''}
                  />
                  {errors.plateNumber && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.plateNumber}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Vehicle color</Label>
                  <Input
                    placeholder="White"
                    value={newVehicle.color || ''}
                    onChange={(e) => updateDraft({ ...newVehicle, color: e.target.value })}
                    className={errors.color ? 'border-red-500 bg-red-50' : ''}
                  />
                  {errors.color && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.color}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" className="bg-blue-600 text-white" onClick={handleAddVehicle}>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save vehicle
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
              <div key={vehicle.id} className="group relative bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Plate: {vehicle.plateNumber}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1"
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
