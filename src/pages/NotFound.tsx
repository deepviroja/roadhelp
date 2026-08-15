import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F6] flex items-center justify-center px-4 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl -mr-72 -mt-72" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center relative z-10"
      >
        <div className="mb-12 relative inline-block">
          <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-20 animate-pulse" />
          <MapPinOff className="w-32 h-32 text-blue-600 relative z-10" strokeWidth={1} />
        </div>
        
        <h1 className="text-fluid-9xl font-black text-[#1A1A2E] tracking-tighter leading-none mb-6">404</h1>
        <h2 className="text-fluid-2xl font-black text-[#1A1A2E] tracking-tight mb-6 uppercase">Requested Page Not Found</h2>
        <p className="text-slate-500 font-black uppercase text-[11px] tracking-[0.4em] mb-12 max-w-sm mx-auto italic">
          Page Not Found. We couldn't find the page you were looking for.

        </p>
        
        <Button asChild className="h-[3rem] px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-3xl shadow-blue-600/30  transition-all">
          <Link to="/">
            <Home className="w-5 h-5 mr-4" />
            Go Home
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}

