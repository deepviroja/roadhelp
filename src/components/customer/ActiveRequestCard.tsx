import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { ServiceRequest } from '@/types';
import { getServiceLabel } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';

interface ActiveRequestCardProps {
  request: ServiceRequest;
  onCancel?: () => void;
}

export function ActiveRequestCard({ request, onCancel }: ActiveRequestCardProps) {
  const service = SERVICE_MAP[request.serviceType];
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const canCancel = request.status === 'pending' || request.status === 'accepted';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl text-white"><IconRenderer name={serviceIcon} size={20} /></span>
          <span className="text-white font-medium text-sm">{request.serviceName ?? getServiceLabel(request.serviceType)}</span>
        </div>
        <StatusBadge status={request.status} pulse />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2 mb-3 py-8">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 line-clamp-2">{request.customerLocation.address}</p>
        </div>

        {request.providerName && (
          <div className="p-3 bg-gray-50 rounded-lg mb-3">
            <p className="text-xs text-gray-500 mb-1">Your Provider</p>
            <p className="font-medium text-gray-900">{request.providerName}</p>
            <div className="flex items-center gap-2 mt-1">
              {request.providerRating && (
                <span className="text-xs text-amber-600">Rating: {request.providerRating.toFixed(1)}</span>
              )}
              {request.providerVehicleNumber && (
                <span className="text-xs text-gray-500">• {request.providerVehicleNumber}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Link to={`/customer/track/${request.id}`}>
              <Clock className="w-4 h-4" />
              Track Request
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          {request.providerPhone && (
            <Button variant="outline" size="icon" asChild>
              <a
                href={`tel:${request.providerPhone}`}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${request.providerPhone}`;
                }}
              >
                <Phone className="w-4 h-4 text-green-600" />
              </a>
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
