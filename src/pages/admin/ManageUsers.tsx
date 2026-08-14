import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Eye, Users } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { db } from '@/config/firebase';
import { UserProfile } from '@/types';
import { formatDate } from '@/lib/utils';

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  if (isTimestampLike(value)) return value.toMillis();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, requestsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'serviceRequests'))
        ]);
        const requestsData = requestsSnap.docs.map(doc => doc.data() as any);
        const data = usersSnap.docs
          .map((d) => {
            const u = { uid: d.id, ...d.data() } as any;
            const userRequests = requestsData.filter(r => r.customerId === u.uid);
            return {
              ...u,
              vehiclesCount: u.vehicles?.length || 0,
              requestsCount: userRequests.length,
            };
          })
          .filter((u) => u.role === 'customer')
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setUsers(data);
        setFiltered(data);
      } catch (err) {
        console.error('Failed to load users:', err);
        toast.error('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(users.filter((u) => u.fullName?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)));
  }, [search, users]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'users', deleteId));
      setUsers((prev) => prev.filter((u) => u.uid !== deleteId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Customers</h1>
          <p className="text-gray-500 mt-1">View and manage all customer accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? <div className="p-8"><LoadingSpinner /></div> : filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-16 h-16 text-gray-300 mx-auto" />} title="No customers found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicles</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Requests</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-gray-600">{user.phone || '—'}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{user.vehiclesCount}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{user.requestsCount}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold gap-1 text-[11px] h-8 rounded-lg"
                            onClick={() => navigate(`/admin/requests?customerId=${user.uid}`)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Requests
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-lg"
                            onClick={() => setDeleteId(user.uid)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete User?" description="This will permanently delete the user's profile data." confirmText="Delete" onConfirm={handleDelete} isDestructive />
    </AdminLayout>
  );
}
