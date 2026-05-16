import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { Link } from 'react-router-dom';
import { ServiceRequest } from '@/types';
import { formatDate, getServiceLabel, formatCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function RequestHistory() {
  const { profile } = useAuth();
  const { getCustomerRequests } = useServiceRequest();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!profile?.uid) return;
    getCustomerRequests(profile.uid).then((data) => {
      setRequests(data);
      setIsLoading(false);
    });
  }, [profile?.uid, getCustomerRequests]);

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <CustomerLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Request History</h1>
          <p className="text-gray-500 mt-1">All your past and active service requests</p>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <LoadingSpinner text="Loading requests..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No requests found"
            description="You haven't made any service requests yet"
            action={
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/customer/new-request">Make a Request</Link>
              </Button>
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filtered.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900">{req.serviceName ?? getServiceLabel(req.serviceType)}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                    {req.providerName && (
                      <p className="text-xs text-gray-500 mt-0.5">Provider: {req.providerName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    {req.finalPrice && (
                      <span className="text-sm font-semibold text-gray-900 hidden sm:block">{formatCurrency(req.finalPrice)}</span>
                    )}
                    {req.rating && (
                      <span className="text-xs text-amber-600 hidden sm:block">Rating: {req.rating}</span>
                    )}
                    {(req.status === 'pending' || req.status === 'accepted' || req.status === 'arriving' || req.status === 'inProgress') && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/customer/track/${req.id}`}>Track</Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </CustomerLayout>
  );
}
