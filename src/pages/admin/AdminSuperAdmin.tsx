import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull,
  Trash2,
  Users,
  Truck,
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';
import { logAdminAction } from '@/lib/auditLogger';

type DeleteTarget = 'customers' | 'providers' | 'requests';

interface DeleteCard {
  id: DeleteTarget;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  warning: string;
}

const DELETE_CARDS: DeleteCard[] = [
  {
    id: 'customers',
    title: 'Delete All Customers',
    description: 'Permanently deletes every customer account from Firestore and Firebase Auth. Customers will be unable to log in.',
    icon: <Users className="w-7 h-7" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    warning: 'All customer profiles, history, and login access will be permanently destroyed.',
  },
  {
    id: 'providers',
    title: 'Delete All Providers',
    description: 'Permanently deletes every service provider account from Firestore and Firebase Auth. Providers will be unable to log in.',
    icon: <Truck className="w-7 h-7" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    warning: 'All provider profiles, earnings data, and login access will be permanently destroyed.',
  },
  {
    id: 'requests',
    title: 'Delete All Service Requests',
    description: 'Permanently deletes every service request record from the database. This cannot be undone.',
    icon: <FileText className="w-7 h-7" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    warning: 'All request history, quotes, tracking data, and reviews will be permanently erased.',
  },
];

export default function AdminSuperAdmin() {
  const { profile } = useAuth();
  const [confirmInputs, setConfirmInputs] = useState<Record<DeleteTarget, string>>({
    customers: '',
    providers: '',
    requests: '',
  });
  const [isDeleting, setIsDeleting] = useState<DeleteTarget | null>(null);
  const [deletedTargets, setDeletedTargets] = useState<Set<DeleteTarget>>(new Set());

  // Super admin check: must have 'all' permissions or no permissions (= full access per App.tsx)
  const isSuperAdmin =
    profile?.isSuperAdmin === true ||
    !profile?.permissions ||
    profile?.permissions?.length === 0 ||
    profile?.permissions?.includes('all');

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">Super Admin Only</h1>
          <p className="text-slate-500 font-medium max-w-md">
            This section is restricted to administrators with full system access. Contact your system administrator if you need access.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const handleDelete = async (target: DeleteTarget) => {
    if (confirmInputs[target] !== 'DELETE') {
      toast.error('Type DELETE exactly to confirm this action.');
      return;
    }

    setIsDeleting(target);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('Authentication token not available.');

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ target }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Deletion failed.');

      setDeletedTargets((prev) => new Set(prev).add(target));
      setConfirmInputs((prev) => ({ ...prev, [target]: '' }));

      await logAdminAction({
        adminEmail: profile?.email || '',
        adminName: profile?.fullName || 'Super Admin',
        action: `BULK_DELETE_${target.toUpperCase()}`,
        module: 'Super Admin Panel',
        details: result.message,
      });

      toast.success(result.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete deletion.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-10 pb-16"
      >
        {/* Header */}
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/30 shrink-0">
            <Skull className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Super Admin — Danger Zone
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1 max-w-2xl">
              This panel is restricted to super administrators only. Actions here are <strong>permanent and irreversible</strong>. Admin accounts will not be affected.
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-900 uppercase tracking-wider">Extreme Caution Required</p>
            <p className="text-xs text-red-700 font-medium mt-1 leading-relaxed">
              All operations below are permanent and cannot be undone. Type <code className="bg-red-200/60 px-1.5 py-0.5 rounded font-black">DELETE</code> exactly in the confirmation field to unlock each action.
              Admin accounts will remain intact in all cases.
            </p>
          </div>
        </div>

        {/* Delete Cards */}
        <div className="space-y-6">
          {DELETE_CARDS.map((card) => {
            const isDone = deletedTargets.has(card.id);
            const isCurrentlyDeleting = isDeleting === card.id;
            const isConfirmed = confirmInputs[card.id] === 'DELETE';

            return (
              <motion.div
                key={card.id}
                layout
                className={`rounded-3xl border-2 ${card.borderColor} bg-white shadow-sm overflow-hidden`}
              >
                <div className="p-8">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${card.bgColor} ${card.color} flex items-center justify-center`}>
                        {isDone ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : card.icon}
                      </div>
                      <div>
                        <h3 className={`text-lg font-black ${isDone ? 'text-green-700 line-through opacity-60' : 'text-slate-900'}`}>
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-lg">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    {isDone && (
                      <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest shrink-0">
                        Deleted
                      </span>
                    )}
                  </div>

                  {!isDone && (
                    <>
                      {/* Warning box */}
                      <div className={`${card.bgColor} ${card.borderColor} border rounded-2xl p-4 mb-6 flex items-start gap-3`}>
                        <ShieldAlert className={`w-4 h-4 ${card.color} shrink-0 mt-0.5`} />
                        <p className="text-xs font-bold text-slate-700">{card.warning}</p>
                      </div>

                      {/* Confirmation input */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            value={confirmInputs[card.id]}
                            onChange={(e) =>
                              setConfirmInputs((prev) => ({ ...prev, [card.id]: e.target.value }))
                            }
                            placeholder={`Type DELETE to confirm`}
                            disabled={isCurrentlyDeleting || !!isDeleting}
                            className={`h-12 rounded-2xl font-black tracking-widest ${
                              isConfirmed
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                        </div>
                        <Button
                          onClick={() => handleDelete(card.id)}
                          disabled={!isConfirmed || !!isDeleting}
                          className="h-12 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 disabled:opacity-40 shrink-0 gap-2"
                        >
                          {isCurrentlyDeleting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Execute
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom safety note */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white">
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm uppercase tracking-wider text-cyan-300 mb-2">What is NOT deleted</p>
              <ul className="space-y-1.5 text-xs text-slate-400 font-medium">
                <li>✓ Admin accounts (all admins remain unaffected)</li>
                <li>✓ Platform configuration & settings</li>
                <li>✓ CMS pages, email templates, form builders</li>
                <li>✓ Service types & vehicle type configurations</li>
                <li>✓ Audit logs (deletion is itself logged)</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
