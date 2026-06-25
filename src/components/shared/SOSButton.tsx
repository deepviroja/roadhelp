import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, X, Shield, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();
  const { settings } = usePlatformSettings();

  if (profile?.role === 'admin' || profile?.role === 'provider') {
    return null;
  }

  const policeNumber = settings?.sosConfig?.policeNumber || "100";
  const ambulanceNumber = settings?.sosConfig?.ambulanceNumber || "108";
  const helplineNumber = settings?.sosConfig?.helplineNumber || "1073";
  const teamContactNumber = settings?.sosConfig?.teamContactNumber || "1090";
  const responseTeamCount = settings?.sosConfig?.teamCount || 3;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-lg p-5 w-[calc(100vw-3rem)] max-w-sm sm:w-80 border border-red-50 mb-2 origin-bottom-right"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-red-600/20">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">SOS Protocol</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-medium">Response team: {responseTeamCount} members</p>
               <div className="p-3 bg-slate-50 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600/10 rounded-md flex items-center justify-center text-blue-600 flex-shrink-0">
                     <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Live Coordinates</p>
                     <p className="text-[11px] font-semibold text-slate-700">Syncing with satellite...</p>
                  </div>
               </div>

               <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Immediate connection to RoadHelp's rapid response unit and local emergency services.
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50"
                    onClick={() => window.location.href = `tel:${policeNumber}`}
                  >
                 <Phone className="w-2 h-2 mr-1 group-hover:rotate-12 transition-transform" />

                     {policeNumber}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50"
                    onClick={() => window.location.href = `tel:${ambulanceNumber}`}
                  >
                 <Phone className="w-2 h-2 mr-1 group-hover:rotate-12 transition-transform" />

                     {ambulanceNumber}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 sm:col-span-1"
                    onClick={() => window.location.href = `tel:${teamContactNumber}`}
                  >
                 <Phone className="w-2 h-2 mr-1 group-hover:rotate-12 transition-transform" />

                     {teamContactNumber}
                  </Button>
               </div>

               <Button 
                onClick={() => window.location.href = `tel:${helplineNumber}`}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-md shadow-red-600/20 group"
               >
                 <Phone className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                 {helplineNumber}
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-50 ${isOpen ? 'bg-slate-900 text-white' : 'bg-red-600 text-white shadow-red-600/30 ring-4 ring-red-600/20'}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 animate-pulse" />}
      </motion.button>
    </div>
  );
}
