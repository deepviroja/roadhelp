import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, icon: Icon, color = 'blue', change, changeType }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600/10 text-blue-600',
    green: 'bg-green-600/10 text-green-600',
    amber: 'bg-amber-600/10 text-amber-600',
    red: 'bg-red-600/10 text-red-600',
    purple: 'bg-purple-600/10 text-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="glass-card rounded-[2.5rem] p-8 shadow-premium transition-all"
    >
      <div className="flex items-center justify-between mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            changeType === 'up' ? 'text-green-600 bg-green-50 px-3 py-1 rounded-full' :
            changeType === 'down' ? 'text-red-600 bg-red-50 px-3 py-1 rounded-full' :
            'text-gray-500 bg-gray-50 px-3 py-1 rounded-full'
          }`}>
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1 leading-none">{value}</p>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
    </motion.div>
  );
}
