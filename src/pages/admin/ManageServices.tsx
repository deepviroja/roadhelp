import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Edit2,
  Trash2,
  Settings,
  Sparkles,
  IndianRupee,
  TextQuote,
  Zap,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useServices } from "@/hooks/useServices";
import { ServiceTypeConfig } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/IconRenderer";

export default function ManageServices() {
  const { services, updateService, deleteService, isLoading } = useServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<Partial<ServiceTypeConfig> | null>(null);

  const handleOpenEdit = (req: ServiceTypeConfig | null) => {
    setEditingService(
      req || {
        name: "",
        icon: "Settings",
        description: "",
        basePrice: 50,
        maxPrice: 150,
        isActive: true,
      },
    );
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingService?.name) return toast.error("Name is required");
    const serviceToSave = { ...editingService };
    if (!serviceToSave.id && serviceToSave.name) {
      // @ts-expect-error - Dynamic ID generation
      serviceToSave.id = serviceToSave.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }
    const success = await updateService(serviceToSave as ServiceTypeConfig);
    if (success) {
      toast.success("Service inventory updated!");
      setIsModalOpen(false);
    } else {
      toast.error("Failed to save service modification");
    }
  };

  const toggleActive = async (service: ServiceTypeConfig) => {
    const updated = { ...service, isActive: !service.isActive };
    const success = await updateService(updated);
    if (success) {
      toast.success(`${service.name} status updated`);
    } else {
      toast.error("Failed to update service availability");
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Service Capabilities
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
              Configure Mission Parameters & Pricing
            </p>
          </div>
          <Button
            className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest gap-3 shadow-2xl shadow-blue-600/20 group transform active:scale-95 transition-all"
            onClick={() => handleOpenEdit(null)}
          >
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Provision New Ability
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">
              Syncing Intelligence Library...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {services.map((service, idx) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-white rounded-[2.5rem] border-2 p-10 transition-all group hover:shadow-2xl hover:shadow-blue-600/5 relative overflow-hidden ${
                    service.isActive
                      ? "border-slate-50 hover:border-blue-500/30"
                      : "border-slate-50 border-dashed opacity-50 grayscale"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-[4rem] group-hover:scale-125 transition-transform" />

                  <div className="flex items-start justify-between mb-10 relative z-10">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all transform group-hover:rotate-6 ${service.isActive ? "bg-blue-600 shadow-xl shadow-blue-600/20 text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      <IconRenderer name={service.icon} size={30} />
                    </div>
                    <Switch
                      checked={service.isActive ?? true}
                      onCheckedChange={() => toggleActive(service)}
                      className="data-[state=checked]:bg-green-500 scale-125"
                    />
                  </div>

                  <div className="space-y-2 mb-10 relative z-10">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none px-2 py-1 bg-blue-50 rounded-lg">
                        Operational
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none px-2 py-1 border rounded-lg">
                        {service.id}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-500 mb-10 leading-relaxed italic relative z-10 min-h-[44px]">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between mb-10 border-t border-slate-50 pt-8 relative z-10">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 leading-none">
                        Min Base
                      </p>
                      <p className="text-xl font-black text-slate-900 leading-none">
                        {formatCurrency(service.basePrice)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 leading-none">
                        Max Expected
                      </p>
                      <p className="text-xl font-black text-slate-900 leading-none">
                        {formatCurrency(service.maxPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 relative z-10">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-100 hover:bg-slate-900 hover:text-white transition-all gap-2"
                      onClick={() => handleOpenEdit(service)}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Configure
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-12 h-12 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      onClick={() => {
                        if (
                          window.confirm(
                            `PERMANENT DISRUPTION: Delete "${service.name}" component?`,
                          )
                        ) {
                          deleteService(service.id).then((success) => {
                            if (success)
                              toast.success("Cleared from inventory");
                            else toast.error("Shield failure: Cannot delete");
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-bl-[4rem]" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                Ability Configuration
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">
                Adjust mission parameters and financial weights
              </DialogDescription>
            </DialogHeader>
          </div>

          {editingService && (
            <div className="p-8 space-y-8 overflow-y-auto scrollbar-hide flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                    Ability Display Name
                  </Label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <Input
                      value={editingService.name || ""}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          name: e.target.value,
                        })
                      }
                      placeholder="Jump Start"
                      className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-black focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                    Lucide Identity Icon
                    <a 
                      href="https://lucide.dev/icons" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1 normal-case font-bold tracking-normal"
                    >
                      Browse Icons <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </Label>
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <Input
                      value={editingService.icon || ""}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          icon: e.target.value,
                        })
                      }
                      placeholder="Zap, Hammer, Fuel"
                      className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-black focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  Public Capability Brief
                </Label>
                <div className="relative">
                  <TextQuote className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                  <Input
                    value={editingService.description || ""}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        description: e.target.value,
                      })
                    }
                    placeholder="Rapid battery restoration within minutes..."
                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-bold focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-[2rem] border border-blue-50">
                <div className="space-y-2">
                  <Label className="ml-1 text-[9px] font-black uppercase text-blue-600 tracking-widest">
                    Minimum Base Unit (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-600" />
                    <Input
                      type="number"
                      value={editingService.basePrice === undefined ? '' : editingService.basePrice}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          // @ts-expect-error - allow empty string
                          basePrice: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="h-12 pl-10 rounded-xl bg-white border-transparent font-black shadow-inner"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 text-[9px] font-black uppercase text-blue-600 tracking-widest">
                    Ceiling Cap (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-600" />
                    <Input
                      type="number"
                      value={editingService.maxPrice === undefined ? '' : editingService.maxPrice}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          // @ts-expect-error - allow empty string
                          maxPrice: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="h-12 pl-10 rounded-xl bg-white border-transparent font-black shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <IndianRupee className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-black uppercase text-slate-700 tracking-widest">
                    Synchronized & Active
                  </span>
                </div>
                <Switch
                  checked={editingService.isActive ?? true}
                  onCheckedChange={(c) =>
                    setEditingService({ ...editingService, isActive: c })
                  }
                  className="data-[state=checked]:bg-green-500 scale-110"
                />
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2 mt-auto">
                <Button
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900"
                >
                  Terminate Sync
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20"
                >
                  Apply Modifications
                </Button>
              </div>
            </div>

          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
