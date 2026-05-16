import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, CheckCircle, XCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { ServiceRequest } from '@/types';
import { getServiceLabel, calculateDistance, formatCurrency } from '@/lib/utils';
import { SERVICE_MAP } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

interface IncomingRequestCardProps {
  request: ServiceRequest;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  isAccepting?: boolean;
}

export function IncomingRequestCard({ request, onAccept, onDecline, isAccepting }: IncomingRequestCardProps) {
  const service = SERVICE_MAP[request.serviceType];
  const serviceIcon = request.serviceIcon ?? service?.icon ?? 'Wrench';
  const { profile } = useAuth();
  const navigate = useNavigate();

  const distance = profile?.location
    ? calculateDistance(
        profile.location.lat,
        profile.location.lng,
        request.customerLocation.lat,
        request.customerLocation.lng
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border border-orange-200 shadow-md overflow-hidden"
    >
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl text-white"><IconRenderer name={serviceIcon} size={20} /></span>
          <div>
            <span className="text-white font-semibold text-sm">{request.serviceName ?? getServiceLabel(request.serviceType)}</span>
            <p className="text-orange-100 text-xs">New Request!</p>
          </div>
        </div>
        <Badge className="bg-white/20 text-white border-0">
          {formatCurrency(request.estimatedPrice)}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold text-gray-900">{request.customerName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-500">{request.customerPhone}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 line-clamp-2">{request.customerLocation?.address || 'No address provided'}</p>
        </div>

        {distance !== null && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-blue-600 font-medium">{distance.toFixed(1)} km away</p>
          </div>
        )}

        <p className="text-sm text-gray-500 italic line-clamp-2">"{request.description}"</p>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={onDecline}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Decline
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={async () => {
              await onAccept();
              navigate(`/provider/active-job/${request.id}`);
            }}
            disabled={isAccepting}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {isAccepting ? 'Accepting...' : 'Accept'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
