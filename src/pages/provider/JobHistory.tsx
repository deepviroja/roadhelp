import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useServiceRequest } from '@/hooks/useServiceRequest';
import { ServiceRequest } from '@/types';
import { formatDate, getServiceLabel, formatCurrency } from '@/lib/utils';
import { COMMISSION_RATE } from '@/lib/constants';

export default function JobHistory() {
  const { profile } = useAuth();
  const { getProviderRequests } = useServiceRequest();
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.uid) return;
    getProviderRequests(profile.uid).then((data) => {
      setJobs(data.filter((j) => j.status === 'completed' || j.status === 'cancelled'));
      setIsLoading(false);
    });
  }, [profile?.uid, getProviderRequests]);

  return (
    <ProviderLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Job History</h1>
          <p className="text-gray-500 mt-1">All your past completed and cancelled jobs</p>
        </div>

        {isLoading ? <LoadingSpinner text="Loading jobs..." /> : jobs.length === 0 ? (
          <EmptyState title="No jobs yet" description="Completed jobs will appear here" />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {jobs.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/provider/active-job/${job.id}`)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900">{job.serviceName ?? getServiceLabel(job.serviceType)}</p>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(job.createdAt)}</p>
                    <p className="text-xs text-gray-500">Customer: {job.customerName}</p>
                  </div>
                  <div className="text-right ml-4">
                    {job.status === 'completed' && (
                      job.isPaid && job.finalPrice ? (
                        <>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(job.finalPrice * (1 - COMMISSION_RATE))}</p>
                          <p className="text-xs text-gray-400">After 15% fee</p>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                          Awaiting Payment
                        </span>
                      )
                    )}
                    {job.rating && <p className="text-xs text-amber-600 mt-1">Rating: {job.rating}/5</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </ProviderLayout>
  );
}
