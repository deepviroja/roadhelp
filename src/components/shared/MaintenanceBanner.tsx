import { Wrench, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStore } from '@/stores/systemStore';

export function MaintenanceBanner() {
  const { appName } = useSystemStore();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-10 max-w-md w-full text-center border border-white/20 shadow-2xl"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Wrench className="w-10 h-10 text-orange-400" />
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-3">{appName} is Down for Maintenance</h1>
        <p className="text-blue-200 mb-6 leading-relaxed">
          We're currently performing scheduled maintenance to improve your experience. We'll be back shortly!
        </p>
        <div className="flex items-center justify-center gap-2 text-blue-300">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Please check back in a few minutes</span>
        </div>
        <div className="mt-8 flex gap-2 justify-center">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-blue-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
