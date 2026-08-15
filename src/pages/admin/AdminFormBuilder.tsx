import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, FormInput, ArrowUp, ArrowDown, Check, Shield } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/config/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { logAdminAction } from '@/lib/auditLogger';


interface FormFieldConfig {

  id: string;
  formId: string; // 'getHelp' | 'providerSignup' | 'customerSignup'
  label: string;
  nameKey: string;
  fieldType: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'dropdown' | 'checkbox' | 'file' | 'location';
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isVisible: boolean;
  isSystemRequired?: boolean;
  sortOrder: number;
  options?: string[];
}

const FORM_TYPES = [
  { id: 'getHelp', name: 'Get Help Form' },
  { id: 'providerSignup', name: 'Provider Signup Form' },
  { id: 'customerSignup', name: 'Customer Signup Form' },
];

export default function AdminFormBuilder() {
  const { profile } = useAuth();
  const [selectedForm, setSelectedForm] = useState('getHelp');
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Partial<FormFieldConfig> | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'formBuilderFields'), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FormFieldConfig));
      setFields(docs);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const currentFormFields = fields
    .filter((f) => f.formId === selectedForm)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const seedDefaultFields = async () => {
    setIsLoading(true);
    const defaultFields: Record<string, Omit<FormFieldConfig, 'id'>[]> = {
      customerSignup: [
        { formId: 'customerSignup', label: 'Full Name', nameKey: 'fullName', fieldType: 'text', placeholder: 'John Doe', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 1 },
        { formId: 'customerSignup', label: 'Email Address', nameKey: 'email', fieldType: 'email', placeholder: 'you@example.com', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 2 },
        { formId: 'customerSignup', label: 'Mobile Number', nameKey: 'phone', fieldType: 'phone', placeholder: 'Enter mobile number', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 3 },
        { formId: 'customerSignup', label: 'Password', nameKey: 'password', fieldType: 'text', placeholder: '••••••••', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 4 },
        { formId: 'customerSignup', label: 'Confirm Password', nameKey: 'confirmPassword', fieldType: 'text', placeholder: '••••••••', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 5 },
      ],
      providerSignup: [
        { formId: 'providerSignup', label: 'Owner Name', nameKey: 'fullName', fieldType: 'text', placeholder: 'John Doe', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 1 },
        { formId: 'providerSignup', label: 'Email Address', nameKey: 'email', fieldType: 'email', placeholder: 'you@company.com', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 2 },
        { formId: 'providerSignup', label: 'Shop Name', nameKey: 'companyName', fieldType: 'text', placeholder: 'QuickTow Services', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 3 },
        { formId: 'providerSignup', label: 'Business Address', nameKey: 'businessAddress', fieldType: 'text', placeholder: '123 Main Street', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 4 },
        { formId: 'providerSignup', label: 'City', nameKey: 'city', fieldType: 'text', placeholder: 'Mumbai', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 5 },
        { formId: 'providerSignup', label: 'State', nameKey: 'state', fieldType: 'text', placeholder: 'Maharashtra', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 6 },
        { formId: 'providerSignup', label: 'PIN Code', nameKey: 'pin', fieldType: 'text', placeholder: '400001', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 7 },
        { formId: 'providerSignup', label: 'Business Hours', nameKey: 'businessHours', fieldType: 'text', placeholder: 'Mon - Sat, 9:00 AM - 8:00 PM', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 8 },
        { formId: 'providerSignup', label: 'Service Radius (km)', nameKey: 'serviceRadiusKm', fieldType: 'number', placeholder: '25', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 9 },
        { formId: 'providerSignup', label: 'Shop License Number', nameKey: 'licenseNumber', fieldType: 'text', placeholder: 'SHOP-LIC-2026', isRequired: false, isVisible: true, isSystemRequired: true, sortOrder: 10 },
        { formId: 'providerSignup', label: 'Contact Number', nameKey: 'phone', fieldType: 'phone', placeholder: 'Enter contact number', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 11 },
        { formId: 'providerSignup', label: 'Password', nameKey: 'password', fieldType: 'text', placeholder: '••••••••', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 12 },
        { formId: 'providerSignup', label: 'Confirm Password', nameKey: 'confirmPassword', fieldType: 'text', placeholder: '••••••••', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 13 },
      ],
      getHelp: [
        { formId: 'getHelp', label: 'Full Name', nameKey: 'fullName', fieldType: 'text', placeholder: 'Alex Johnson', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 1 },
        { formId: 'getHelp', label: 'Email Address', nameKey: 'email', fieldType: 'email', placeholder: 'you@example.com', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 2 },
        { formId: 'getHelp', label: 'Mobile Phone Number', nameKey: 'phone', fieldType: 'phone', placeholder: 'Enter mobile number', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 3 },
        { formId: 'getHelp', label: 'Vehicle Make / Model', nameKey: 'vehicleBrand', fieldType: 'text', placeholder: 'e.g. Toyota Corolla', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 4 },
        { formId: 'getHelp', label: 'Problem Description', nameKey: 'description', fieldType: 'textarea', placeholder: 'Describe what happened...', isRequired: true, isVisible: true, isSystemRequired: true, sortOrder: 5 },
      ]
    };

    const fieldsToSeed = defaultFields[selectedForm] || [];
    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      fieldsToSeed.forEach((f) => {
        const id = `${selectedForm}_${f.nameKey}`;
        batch.set(doc(db, 'formBuilderFields', id), {
          id,
          ...f,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      toast.success('Default fields seeded successfully!');
    } catch (err: any) {
      toast.error('Failed to seed default fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveField = async (field: FormFieldConfig, direction: 'up' | 'down') => {
    const idx = currentFormFields.findIndex((f) => f.id === field.id);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentFormFields.length) return;

    const targetField = currentFormFields[targetIdx];

    // Swap sortOrders
    const tempOrder = field.sortOrder;
    field.sortOrder = targetField.sortOrder;
    targetField.sortOrder = tempOrder;

    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      batch.set(doc(db, 'formBuilderFields', field.id), { sortOrder: field.sortOrder }, { merge: true });
      batch.set(doc(db, 'formBuilderFields', targetField.id), { sortOrder: targetField.sortOrder }, { merge: true });
      await batch.commit();
      toast.success('Field order updated');
    } catch (err: any) {
      toast.error('Failed to update field order');
    }
  };

  const handleOpenNew = () => {
    setEditingField({
      id: `field_${Date.now()}`,
      formId: selectedForm,
      label: '',
      nameKey: '',
      fieldType: 'text',
      placeholder: '',
      helpText: '',
      isRequired: false,
      isVisible: true,
      sortOrder: currentFormFields.length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!editingField?.label?.trim() || !editingField?.nameKey?.trim()) {
      toast.error('Label and Name key are required');
      return;
    }

    try {
      await setDoc(doc(db, 'formBuilderFields', editingField.id!), {
        ...editingField,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'SAVE_FORM_FIELD',
        module: 'Form Builder',
        details: `Saved field ${editingField.label} for ${selectedForm}`,
        targetId: editingField.id,
      });

      toast.success('Form field saved!');
      setIsDialogOpen(false);
      setEditingField(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save form field');
    }
  };

  const handleDeleteField = async (field: FormFieldConfig) => {
    if (field.isSystemRequired) {
      toast.error('System-required fields cannot be deleted.');
      return;
    }

    if (!confirm(`Delete field "${field.label}"?`)) return;

    try {
      await deleteDoc(doc(db, 'formBuilderFields', field.id));
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'DELETE_FORM_FIELD',
        module: 'Form Builder',
        details: `Deleted field ${field.label}`,
        targetId: field.id,
      });
      toast.success('Form field deleted');
    } catch {
      toast.error('Failed to delete form field');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <FormInput className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dynamic Form Builder</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Configure fields, labels, placeholders, and required validations for website forms dynamically.
            </p>
          </div>

          <Button onClick={handleOpenNew} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" /> Add Custom Field
          </Button>
        </div>

        {/* Form Selection Tabs */}
        <div className="flex gap-3 border-b border-slate-200 pb-4 overflow-x-auto scrollbar-hide">
          {FORM_TYPES.map((ft) => (
            <button
              key={ft.id}
              onClick={() => setSelectedForm(ft.id)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedForm === ft.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {ft.name}
            </button>
          ))}
        </div>

        {/* Modal Field Editor */}
        <Modal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Configure Form Field"
          subtitle="Configure field labels, input types, placeholders, and validation rules."
          icon={<FormInput className="w-6 h-6" />}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
                Cancel
              </Button>
              <Button onClick={handleSaveField} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
                Save Field
              </Button>
            </>
          }
        >
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Field Label *</Label>
                <Input value={editingField.label || ''} onChange={(e) => setEditingField({ ...editingField, label: e.target.value })} placeholder="e.g. License Number" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

               <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name Key (API Identifier) *</Label>
                <Input disabled={editingField.isSystemRequired} value={editingField.nameKey || ''} onChange={(e) => setEditingField({ ...editingField, nameKey: e.target.value.replace(/\s+/g, '_').toLowerCase() })} placeholder="e.g. license_number" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-mono text-xs" />
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Field Type</Label>
                  <Select disabled={editingField.isSystemRequired} value={editingField.fieldType || 'text'} onValueChange={(val: any) => setEditingField({ ...editingField, fieldType: val })}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                      <SelectItem value="location">Location Picker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Placeholder</Label>
                  <Input value={editingField.placeholder || ''} onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })} placeholder="e.g. Enter details..." className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-900">Required Field?</p>
                  <p className="text-[10px] text-slate-500">Block submission if empty</p>
                </div>
                <Switch checked={editingField.isRequired ? false : true} onCheckedChange={(c) => setEditingField({ ...editingField, isRequired: c })} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-900">Visible on Form?</p>
                  <p className="text-[10px] text-slate-500">Display field to user</p>
                </div>
                <Switch checked={editingField.isVisible ? true : false} onCheckedChange={(c) => setEditingField({ ...editingField, isVisible: c })} />
              </div>
            </div>
          )}
        </Modal>

        {/* Fields Table */}
        <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Active Fields ({selectedForm})</h3>
            <span className="text-xs font-bold text-slate-500">{currentFormFields.length} Fields</span>
          </div>

          <div className="divide-y divide-slate-100">
            {currentFormFields.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <p className="text-slate-400 font-medium text-xs">No fields configured for this form yet.</p>
                <Button onClick={seedDefaultFields} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-4 py-2">
                  Seed Default Form Fields
                </Button>
              </div>
            ) : (
              currentFormFields.map((field, idx) => (
                <div key={field.id} className="p-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-all">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-black text-slate-900">{field.label}</h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px]">
                        {field.nameKey}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] uppercase">
                        {field.fieldType}
                      </span>
                      {field.isRequired && <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">Required</span>}
                      {field.isSystemRequired && <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">System Lock</span>}
                    </div>
                    {field.placeholder && <p className="text-xs text-slate-500 mt-1">Placeholder: "{field.placeholder}"</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveField(field, 'up')}
                      disabled={idx === 0}
                      className="h-9 w-9 p-0 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveField(field, 'down')}
                      disabled={idx === currentFormFields.length - 1}
                      className="h-9 w-9 p-0 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingField(field); setIsDialogOpen(true); }} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-blue-600">
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    {!field.isSystemRequired && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteField(field)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

