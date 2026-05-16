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

export function VehicleManager({ profile, onRefresh }: VehicleManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    plateNumber: '',
    color: '',
  });

  const handleAddVehicle = async () => {
    if (!profile || !newVehicle.make || !newVehicle.model || !newVehicle.plateNumber) {
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
      setNewVehicle({ make: '', model: '', year: '2024', plateNumber: '', color: '' });
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
          <h2 className="text-lg font-semibold text-gray-900">My Garage</h2>
          <p className="text-sm text-gray-500">Manage your saved vehicles for quick requests</p>
        </div>
        {!isAdding && (
          <Button 
            onClick={() => setIsAdding(true)}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 h-9"
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
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input 
                    placeholder="Toyota" 
                    value={newVehicle.make} 
                    onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input 
                    placeholder="Camry" 
                    value={newVehicle.model} 
                    onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input 
                    placeholder="2023" 
                    value={newVehicle.year} 
                    onChange={e => setNewVehicle({...newVehicle, year: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Plate Number</Label>
                  <Input 
                    placeholder="ABC-1234" 
                    value={newVehicle.plateNumber} 
                    onChange={e => setNewVehicle({...newVehicle, plateNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button size="sm" className="bg-blue-600 text-white" onClick={handleAddVehicle}>
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
            <p className="text-sm text-slate-500 font-medium">No vehicles in your garage yet.</p>
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
