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
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/Modal";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSystemStore } from "@/stores/systemStore";
import { ServiceTypeConfig, ServiceType } from "@/types";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { useServices } from "@/hooks/useServices";
import { formatCurrency } from "@/lib/utils";
import { IconRenderer } from "@/components/shared/IconRenderer";
import { logAdminAction } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";

export default function ManageServices() {
  const { profile } = useAuth();
  const { services, updateService, deleteService, isLoading } = useServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceTypeConfig> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenEdit = (req: ServiceTypeConfig | null) => {
    setErrors({});
    setEditingService(
      req || {
        name: "",
        icon: "Wrench",
        description: "",
        basePrice: "" as any,
        maxPrice: "" as any,
        isActive: true,
      },
    );
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editingService?.name?.trim()) {
      newErrors.name = "Service name is required";
    }

    if (!editingService?.icon?.trim()) {
      newErrors.icon = "Icon name is required";
    }

    if (!editingService?.description?.trim()) {
      newErrors.description = "Description is required";
    }

    const basePrice = editingService?.basePrice;
    if (basePrice === undefined || basePrice === null || (basePrice as any) === "") {
      newErrors.basePrice = "Min price is required";
    } else if (isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      newErrors.basePrice = "Min price must be a positive number";
    }

    const maxPrice = editingService?.maxPrice;
    if (maxPrice === undefined || maxPrice === null || (maxPrice as any) === "") {
      newErrors.maxPrice = "Max price is required";
    } else if (isNaN(Number(maxPrice)) || Number(maxPrice) < 0) {
      newErrors.maxPrice = "Max price must be a positive number";
    } else if (
      basePrice !== undefined &&
      basePrice !== null &&
      (basePrice as any) !== "" &&
      Number(maxPrice) < Number(basePrice)
    ) {
      newErrors.maxPrice = "Max price cannot be less than min price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix validation errors before saving");
      return;
    }
    const serviceToSave = { ...editingService };
    if (!serviceToSave.id && serviceToSave.name) {
      // @ts-expect-error - allow dynamic service ID generation
      serviceToSave.id = serviceToSave.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }


    const success = await updateService(serviceToSave as ServiceTypeConfig);
    if (success) {
      await logAdminAction({
        adminEmail: profile?.email || "admin@roadhelp.com",
        action: editingService.id ? "UPDATE_SERVICE" : "CREATE_SERVICE",
        module: "Services",
        details: `Saved service: ${serviceToSave.name}`,
        targetId: serviceToSave.id,
      });
      toast.success("Service saved successfully!");
      setIsModalOpen(false);
    } else {
      toast.error("Failed to save service changes");
    }
  };

  const toggleActive = async (service: ServiceTypeConfig) => {
    const updated = { ...service, isActive: !service.isActive };
    const success = await updateService(updated);
    if (success) {
      await logAdminAction({
        adminEmail: profile?.email || "admin@roadhelp.com",
        action: "TOGGLE_SERVICE_STATUS",
        module: "Services",
        details: `Toggled ${service.name} to ${updated.isActive ? "Active" : "Inactive"}`,
      });
      toast.success(`${service.name} is now ${updated.isActive ? "Active" : "Inactive"}`);
    } else {
      toast.error("Failed to update service status");
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Services & Pricing Catalog</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              Configure roadside assistance services, custom Lucide icons, and pricing thresholds.
            </p>
          </div>
          <Button
            className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-blue-600/20"
            onClick={() => handleOpenEdit(null)}
          >
            <PlusCircle className="w-4 h-4" />
            Add New Service
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 animate-pulse">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="font-black text-xs uppercase tracking-widest text-slate-400">Loading services catalog...</span>
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
                  className={`bg-white rounded-[2.5rem] border-2 p-8 transition-all group hover:shadow-2xl hover:shadow-blue-600/5 relative overflow-hidden flex flex-col justify-between ${
                    service.isActive ? "border-slate-200/80 hover:border-blue-300" : "border-slate-200/50 border-dashed bg-slate-50/50 grayscale"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${service.isActive ? "bg-blue-600 shadow-xl shadow-blue-600/20 text-white" : "bg-slate-100 text-slate-400"}`}>
                        <IconRenderer name={service.icon} size={28} />
                      </div>
                      <Switch
                        checked={service.isActive ?? true}
                        onCheckedChange={() => toggleActive(service)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>

                    <div className="space-y-1.5 mb-4">
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight truncate">{service.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">
                          {service.id}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-2 min-h-[36px]">
                      {service.description || 'No description provided.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-6 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Min Price</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(service.basePrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-slate-400">Max Price</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(service.maxPrice)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider border-slate-200 hover:bg-slate-900 hover:text-white transition-all gap-2"
                        onClick={() => handleOpenEdit(service)}
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-11 h-11 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        onClick={() => {
                          if (window.confirm(`Delete service "${service.name}"?`)) {
                            deleteService(service.id).then(async (success) => {
                              if (success) {
                                await logAdminAction({
                                  adminEmail: profile?.email || "admin@roadhelp.com",
                                  action: "DELETE_SERVICE",
                                  module: "Services",
                                  details: `Deleted service: ${service.name}`,
                                  targetId: service.id,
                                });
                                toast.success("Service deleted");
                              } else {
                                toast.error("Failed to delete service");
                              }
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Global Reusable Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService?.id ? "Edit Service Category" : "Add New Service"}
        subtitle="Configure service name, Lucide icon symbol, descriptions, and price range."
        icon={<Settings className="w-6 h-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
              Save Service
            </Button>
          </>
        }
      >
        {editingService && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Name *</Label>
                <Input
                  value={editingService.name || ""}
                  onChange={(e) => {
                    setEditingService({ ...editingService, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="e.g. Towing / Jump Start"
                  className={`h-12 rounded-2xl bg-slate-50 font-semibold transition-colors ${
                    errors.name
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "border-slate-200 focus-visible:ring-blue-500"
                  }`}
                />
                {errors.name && (
                  <p className="text-[10px] font-bold text-rose-500 tracking-wide mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lucide Icon Name *</Label>
                  <a
                    href="https://lucide.dev/icons"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Lucide Library <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  value={editingService.icon || ""}
                  onChange={(e) => {
                    setEditingService({ ...editingService, icon: e.target.value });
                    if (errors.icon) setErrors((prev) => ({ ...prev, icon: "" }));
                  }}
                  placeholder="e.g. Truck, Wrench, BatteryCharging"
                  className={`h-12 rounded-2xl bg-slate-50 font-semibold transition-colors ${
                    errors.icon
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "border-slate-200 focus-visible:ring-blue-500"
                  }`}
                />
                {errors.icon && (
                  <p className="text-[10px] font-bold text-rose-500 tracking-wide mt-1">
                    {errors.icon}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Background Image (Optional)</Label>
              <ImageUpload
                currentImage={editingService.bgImage}
                onUploadComplete={(url) => setEditingService({ ...editingService, bgImage: url })}
                onRemove={() => setEditingService({ ...editingService, bgImage: undefined })}
                folder="services"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Description *</Label>
              <Textarea
                value={editingService.description || ""}
                onChange={(e) => {
                  setEditingService({ ...editingService, description: e.target.value });
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Brief explanation of service provided to customer..."
                className={`rounded-2xl bg-slate-50 font-semibold min-h-[90px] transition-colors ${
                  errors.description
                    ? "border-rose-500 focus-visible:ring-rose-500"
                    : "border-slate-200 focus-visible:ring-blue-500"
                }`}
              />
              {errors.description && (
                <p className="text-[10px] font-bold text-rose-500 tracking-wide mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Min Price (₹) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={editingService.basePrice === undefined || editingService.basePrice === null ? "" : editingService.basePrice}
                  onChange={(e) => {
                    setEditingService({
                      ...editingService,
                      // @ts-expect-error - allow empty string
                      basePrice: e.target.value === "" ? "" : Number(e.target.value),
                    });
                    if (errors.basePrice || errors.maxPrice) {
                      setErrors((prev) => ({ ...prev, basePrice: "", maxPrice: "" }));
                    }
                  }}
                  className={`h-11 rounded-xl bg-white font-bold transition-colors ${
                    errors.basePrice
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "border-slate-200 focus-visible:ring-blue-500"
                  }`}
                />
                {errors.basePrice && (
                  <p className="text-[10px] font-bold text-rose-500 tracking-wide mt-1">
                    {errors.basePrice}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Price (₹) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 150"
                  value={editingService.maxPrice === undefined || editingService.maxPrice === null ? "" : editingService.maxPrice}
                  onChange={(e) => {
                    setEditingService({
                      ...editingService,
                      // @ts-expect-error - allow empty string
                      maxPrice: e.target.value === "" ? "" : Number(e.target.value),
                    });
                    if (errors.maxPrice) {
                      setErrors((prev) => ({ ...prev, maxPrice: "" }));
                    }
                  }}
                  className={`h-11 rounded-xl bg-white font-bold transition-colors ${
                    errors.maxPrice
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "border-slate-200 focus-visible:ring-blue-500"
                  }`}
                />
                {errors.maxPrice && (
                  <p className="text-[10px] font-bold text-rose-500 tracking-wide mt-1">
                    {errors.maxPrice}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-900">Active Status</p>
                <p className="text-[10px] text-slate-500">Enable or disable service for customer booking</p>
              </div>
              <Switch
                checked={editingService.isActive ?? true}
                onCheckedChange={(c) => setEditingService({ ...editingService, isActive: c })}
              />
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
