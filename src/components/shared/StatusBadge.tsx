import { cn, getStatusColor, getStatusLabel } from '@/lib/utils';
import { RequestStatus } from '@/types';
import { motion } from 'framer-motion';

interface StatusBadgeProps {
  status: RequestStatus;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = false, className }: StatusBadgeProps & { className?: string }) {
  const isArriving = status === 'arriving';

  return (
    <motion.span
      className={cn(
        'inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm backdrop-blur-md',
        getStatusColor(status),
        className
      )}
      animate={isArriving || pulse ? { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] } : undefined}
      transition={isArriving || pulse ? { duration: 2, repeat: Infinity } : undefined}
    >
      <span className={cn(
        'w-2 h-2 rounded-full mr-2.5 shadow-sm',
        {
          'bg-amber-500 shadow-amber-500/50': status === 'pending',
          'bg-blue-500 shadow-blue-500/50': status === 'accepted',
          'bg-purple-500 shadow-purple-500/50': status === 'arriving',
          'bg-orange-500 shadow-orange-500/50': status === 'inProgress',
          'bg-green-500 shadow-green-500/50': status === 'completed',
          'bg-red-500 shadow-red-500/50': status === 'cancelled',
        }
      )} />
      {getStatusLabel(status)}
    </motion.span>
  );
}
