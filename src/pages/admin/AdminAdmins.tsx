import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit2, Key, CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLogger';

interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin';
  isSuperAdmin?: boolean;
  status: 'active' | 'inactive';
  permissions?: string[];
}

const DEFAULT_PERMISSIONS = [
  'dashboard.view',
  'customers.view',
  'providers.view',
  'requests.view',
  'services.edit',
  'vehicles.edit',
  'forms.edit',
  'pages.edit',
  'settings.edit',
];

export default function AdminAdmins() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Partial<AdminAccount> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAccount));
      setAdmins(docs);
      setIsLoading(false);
    }, (err) => {
      console.warn('[AdminAdmins] Read error:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenNew = () => {
    setErrors({});
    setEditingAdmin({
      id: `admin_${Date.now()}`,
      fullName: '',
      email: '',
      password: '',
      phone: '',
      role: 'admin',
      isSuperAdmin: false,
      status: 'active',
      permissions: [...DEFAULT_PERMISSIONS],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin: AdminAccount) => {
    setErrors({});
    setEditingAdmin({ ...admin, password: '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!editingAdmin?.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!editingAdmin?.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!editingAdmin.email.includes('@')) {
      newErrors.email = 'Invalid email address';
    }

    const isNew = !admins.some(a => a.id === editingAdmin?.id);
    if (isNew) {
      if (!editingAdmin?.password?.trim()) {
        newErrors.password = 'Password is required';
      } else if (editingAdmin.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix validation highlights before saving');
      return;
    }

    try {
      if (editingAdmin.password) {
        // Creating a new admin through API
        const { auth } = await import('@/config/firebase');
        const idToken = await auth.currentUser?.getIdToken(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify({
            email: editingAdmin.email,
            password: editingAdmin.password,
            fullName: editingAdmin.fullName,
            permissions: editingAdmin.permissions,
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Failed to create admin');
        }

        toast.success('Admin account created successfully!');
      } else {
        // Updating existing admin
        const docId = editingAdmin.id || editingAdmin.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const dataToSave: any = {
          ...editingAdmin,
          id: docId,
          role: 'admin',
          updatedAt: new Date().toISOString(),
        };

        delete dataToSave.password;

        await setDoc(doc(db, 'users', docId), dataToSave, { merge: true });
        
        await logAdminAction({
          adminEmail: profile?.email || 'admin@roadhelp.com',
          adminName: profile?.fullName || 'Super Admin',
          action: 'UPDATE_ADMIN_ACCOUNT',
          module: 'Admins & Permissions',
          details: `Updated admin account: ${editingAdmin.email}`,
          targetId: docId,
        });
        toast.success('Admin account updated successfully!');
      }

      setIsModalOpen(false);
      setEditingAdmin(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save admin account');
    }
  };

  const handleToggleStatus = async (admin: AdminAccount) => {
    const updatedStatus = admin.status === 'active' ? 'inactive' : 'active';
    await setDoc(doc(db, 'users', admin.id), { status: updatedStatus }, { merge: true });
    await logAdminAction({
      adminEmail: profile?.email || 'admin@roadhelp.com',
      action: 'TOGGLE_ADMIN_STATUS',
      module: 'Admins & Permissions',
      details: `Updated ${admin.email} status to ${updatedStatus}`,
    });
    toast.success(`Admin account is now ${updatedStatus}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <Shield className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admins & Role Permissions</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Manage system administrator accounts, assign passwords, and control access privileges.
            </p>
          </div>

          <Button onClick={handleOpenNew} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" /> Add Administrator
          </Button>
        </div>

        {/* Admins Table */}
        <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Active Admin Users</h3>
            <span className="text-xs font-bold text-slate-500">{admins.length} Admins</span>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">Loading admin accounts...</div>
            ) : (
              admins.map((admin) => (
                <div key={admin.id} className="p-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-black text-slate-900">{admin.fullName}</h4>
                        {admin.isSuperAdmin && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase">
                            Super Admin
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${admin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {admin.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{admin.email} {admin.phone ? `• ${admin.phone}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(admin)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-slate-600">
                      {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(admin)} className="h-9 px-3 text-xs font-black uppercase tracking-wider text-blue-600">
                      <Edit2 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Editor */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAdmin?.id ? "Edit Administrator Account" : "Add Administrator Account"}
          subtitle="Configure admin login email, password credentials, and system privileges."
          icon={<Shield className="w-6 h-6" />}
          footer={
            <>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-11 px-5 font-black text-xs uppercase tracking-widest">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20">
                Save Account
              </Button>
            </>
          }
        >
          {editingAdmin && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name *</Label>
                <Input value={editingAdmin.fullName || ''} onChange={(e) => setEditingAdmin({ ...editingAdmin, fullName: e.target.value })} placeholder="Alex Mercer" className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold ${errors.fullName ? 'border-rose-500 focus-visible:ring-rose-200 bg-rose-50/20' : ''}`} />
                {errors.fullName && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 tracking-wider">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address *</Label>
                  <Input type="email" value={editingAdmin.email || ''} onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })} placeholder="admin@roadhelp.com" className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold ${errors.email ? 'border-rose-500 focus-visible:ring-rose-200 bg-rose-50/20' : ''}`} />
                  {errors.email && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 tracking-wider">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login Password *</Label>
                  <Input type="password" value={editingAdmin.password || ''} onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })} placeholder="Enter secure password..." className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold ${errors.password ? 'border-rose-500 focus-visible:ring-rose-200 bg-rose-50/20' : ''}`} />
                  {errors.password && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 tracking-wider">{errors.password}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile Phone</Label>
                <Input value={editingAdmin.phone || ''} onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })} placeholder="+91 9876543210" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-black text-slate-900">Super Admin Privileges</p>
                  <p className="text-[10px] text-slate-500">Grant full unrestricted administrative control</p>
                </div>
                <Switch checked={editingAdmin.permissions?.includes('all')} onCheckedChange={(c) => {
                  if (c) {
                    setEditingAdmin({ ...editingAdmin, permissions: ['all'], isSuperAdmin: true });
                  } else {
                    setEditingAdmin({ ...editingAdmin, permissions: [], isSuperAdmin: false });
                  }
                }} />
              </div>

              {!editingAdmin.permissions?.includes('all') && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Granular Access Permissions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'users', label: 'Manage Users & Providers' },
                      { id: 'requests', label: 'Manage Requests' },
                      { id: 'services', label: 'Manage Services & Vehicles' },
                      { id: 'cms', label: 'Manage Website CMS & Forms' },
                      { id: 'finance', label: 'Manage Revenue & Payouts' },
                      { id: 'settings', label: 'System Settings & Audit Logs' },
                    ].map(perm => (
                      <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          checked={editingAdmin.permissions?.includes(perm.id) || false}
                          onChange={(e) => {
                            const newPerms = new Set(editingAdmin.permissions || []);
                            if (e.target.checked) newPerms.add(perm.id);
                            else newPerms.delete(perm.id);
                            setEditingAdmin({ ...editingAdmin, permissions: Array.from(newPerms) });
                          }}
                        />
                        <span className="text-xs font-bold text-slate-700">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
