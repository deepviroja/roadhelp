import { cn, getStatusColor, getStatusLabel, normalizeStatus } from '@/lib/utils';
import { RequestStatus } from '@/types';
import { motion } from 'framer-motion';

interface StatusBadgeProps {
  status: RequestStatus;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false, className }: StatusBadgeProps & { className?: string }) {
  const norm = normalizeStatus(status);
  const isEnRoute = norm === 'provider_en_route' || norm === 'arriving';

  return (
    <motion.span
      className={cn(
        'inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm backdrop-blur-md',
        getStatusColor(status),
        className
      )}
      animate={isEnRoute || pulse ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] } : undefined}
      transition={isEnRoute || pulse ? { duration: 2, repeat: Infinity } : undefined}
    >
      <span className={cn(
        'w-2 h-2 rounded-full mr-2.5 shadow-sm',
        {
          'bg-slate-500 shadow-slate-500/50': norm === 'draft',
          'bg-blue-500 shadow-blue-500/50': norm === 'submitted' || norm === 'accepted',
          'bg-indigo-500 shadow-indigo-500/50': norm === 'searching_providers',
          'bg-purple-500 shadow-purple-500/50': norm === 'offers_received' || norm === 'provider_en_route',
          'bg-emerald-500 shadow-emerald-500/50': norm === 'provider_arrived',
          'bg-orange-500 shadow-orange-500/50': norm === 'in_progress',
          'bg-green-500 shadow-green-500/50': norm === 'completed',
          'bg-red-500 shadow-red-500/50': norm === 'cancelled',
          'bg-gray-400 shadow-gray-400/50': norm === 'expired',
        }
      )} />
      {getStatusLabel(status)}
    </motion.span>
  );
}

