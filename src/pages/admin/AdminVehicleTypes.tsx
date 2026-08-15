import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Car, Shield, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/Modal';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { VehicleTypeConfig } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLogger';

const VEHICLE_ICONS = ['Car', 'Truck', 'Bike', 'Bus', 'Wrench', 'Shield'];

export default function AdminVehicleTypes() {
  const { profile } = useAuth();
  const { vehicleTypes, saveVehicleType, deleteVehicleType, isLoading } = useVehicleTypes();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<Partial<VehicleTypeConfig> | null>(null);

  const handleOpenNew = () => {
    setEditingType({
      id: `vt_${Date.now()}`,
      name: '',
      icon: 'Car',
      description: '',
      isActive: true,
      sortOrder: vehicleTypes.length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (vt: VehicleTypeConfig) => {
    setEditingType({ ...vt });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingType?.name?.trim()) {
      toast.error('Vehicle name is required');
      return;
    }

    try {
      await saveVehicleType(editingType as VehicleTypeConfig);
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        adminName: profile?.fullName || 'Super Admin',
        action: editingType.id ? 'UPDATE_VEHICLE_TYPE' : 'CREATE_VEHICLE_TYPE',
        module: 'Vehicle Types',
        details: `Saved vehicle type: ${editingType.name}`,
        targetId: editingType.id,
      });
      toast.success('Vehicle type saved successfully!');
      setIsDialogOpen(false);
      setEditingType(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save vehicle type');
    }
  };

  const handleToggleStatus = async (vt: VehicleTypeConfig) => {
    const updated = { ...vt, isActive: !vt.isActive };
    await saveVehicleType(updated);
    await logAdminAction({
      adminEmail: profile?.email || 'admin@roadhelp.com',
      action: 'TOGGLE_VEHICLE_STATUS',
      module: 'Vehicle Types',
      details: `Toggled ${vt.name} to ${updated.isActive ? 'Active' : 'Inactive'}`,
    });
    toast.success(`${vt.name} is now ${updated.isActive ? 'Active' : 'Inactive'}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteVehicleType(id);
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'DELETE_VEHICLE_TYPE',
        module: 'Vehicle Types',
        details: `Deleted vehicle type: ${name}`,
        targetId: id,
      });
      toast.success('Vehicle type deleted');
    } catch {
      toast.error('Failed to delete vehicle type');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <Car className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Vehicle Types</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Configure vehicle categories available to customers during roadside assistance requests.
            </p>
          </div>

          <Button onClick={handleOpenNew} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle Type
          </Button>
        </div>

        {/* Modal Editor */}
        <Modal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={editingType?.id ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
          subtitle="Configure vehicle category name, icon symbol, and active status."
          icon={<Car className="w-6 h-6" />}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
                Save Vehicle Type
              </Button>
            </>
          }
        >
          {editingType && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Name *</Label>
                <Input value={editingType.name || ''} onChange={(e) => setEditingType({ ...editingType, name: e.target.value })} placeholder="e.g. Hatchback / SUV / Commercial Van" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
                <Textarea value={editingType.description || ''} onChange={(e) => setEditingType({ ...editingType, description: e.target.value })} placeholder="Brief description of vehicle size or type..." className="rounded-2xl bg-slate-50 border-slate-200 font-semibold min-h-[80px]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Icon Symbol</Label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_ICONS.map((iconName) => (
                    <button key={iconName} type="button" onClick={() => setEditingType({ ...editingType, icon: iconName })} className={`px-3 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 ${editingType.icon === iconName ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                      <IconRenderer name={iconName} size={16} />
                      {iconName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-900">Active Status</p>
                  <p className="text-[10px] text-slate-500">Enable or disable this vehicle type for customers</p>
                </div>
                <Switch checked={editingType.isActive ? true : false} onCheckedChange={(checked) => setEditingType({ ...editingType, isActive: checked })} />
              </div>
            </div>
          )}
        </Modal>

        {/* Vehicle Types List */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Configured Vehicle Categories</h3>
            <span className="text-xs font-bold text-slate-500">{vehicleTypes.length} Total</span>
          </div>

          <div className="divide-y divide-slate-100">
            {vehicleTypes.map((vt) => (
              <div key={vt.id} className="p-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${vt.isActive !== false ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <IconRenderer name={vt.icon || 'Car'} size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-black text-slate-900">{vt.name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${vt.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {vt.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {vt.description && <p className="text-xs text-slate-500 mt-0.5">{vt.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(vt)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-slate-600">
                    {vt.isActive !== false ? <XCircle className="w-4 h-4 mr-1 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />}
                    {vt.isActive !== false ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(vt)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-blue-600">
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(vt.id, vt.name)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

