import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Phone, ChevronRight, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ServiceRequest } from '@/types';
import { getServiceLabel, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';
import { IconRenderer } from '@/components/shared/IconRenderer';

interface ActiveJobCardProps {
  request: ServiceRequest;
}

export function ActiveJobCard({ request }: ActiveJobCardProps) {
  const service = SERVICE_MAP[request.serviceType];
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white"><IconRenderer name={serviceIcon} size={18} /></span>
          <span className="text-white font-medium text-sm">{request.serviceName ?? getServiceLabel(request.serviceType)}</span>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 line-clamp-2">{request.customerLocation?.address || 'No address provided'}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg mb-3">
          <p className="text-xs text-gray-500">Customer</p>
          <p className="font-medium text-gray-900">{request.customerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600">{request.customerPhone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Estimated Price</span>
          <span className="font-semibold text-gray-900">{formatCurrency(request.estimatedPrice)}</span>
        </div>

        <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5">
          <Link to={`/provider/active-job/${request.id}`}>
            <Navigation className="w-4 h-4" />
            View Active Job
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
