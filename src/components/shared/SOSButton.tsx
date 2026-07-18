import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, X, Shield, MapPin, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useSystemStore } from '@/stores/systemStore';
import { db } from '@/config/firebase';

export function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();
  const { settings } = usePlatformSettings();
  const { appName } = useSystemStore();
  const location = useLocation();

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (
      profile?.role === 'admin' ||
      profile?.role === 'provider' ||
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/provider')
    ) {
      return;
    }

    if (!isOpen) {
      setAddress('');
      setCoords(null);
      return;
    }

    // Generate a unique session ID for this distress alert
    const newAlertId = 'SOS-' + Math.random().toString(36).slice(2, 9).toUpperCase();

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddress(addr);

          // Update/Create distress alert document in Firestore
          const alertRef = doc(db, 'sosAlerts', newAlertId);
          await setDoc(alertRef, {
            id: newAlertId,
            customerId: profile?.uid || 'guest',
            customerName: profile?.fullName || 'Guest User',
            customerPhone: profile?.phone ? `${profile.countryCode || ''}${profile.phone}` : 'N/A',
            latitude: lat,
            longitude: lng,
            address: addr,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (err) {
          console.error('Failed to sync SOS distress data:', err);
          const addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddress(addr);

          const alertRef = doc(db, 'sosAlerts', newAlertId);
          await setDoc(alertRef, {
            id: newAlertId,
            customerId: profile?.uid || 'guest',
            customerName: profile?.fullName || 'Guest User',
            customerPhone: profile?.phone ? `${profile.countryCode || ''}${profile.phone}` : 'N/A',
            latitude: lat,
            longitude: lng,
            address: addr,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      },
      (err) => {
        console.error('Geolocation watch error in SOSButton:', err);
      },
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isOpen, profile, location.pathname]);

  if (
    profile?.role === 'admin' ||
    profile?.role === 'provider' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/provider')
  ) {
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
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-red-600/20 animate-pulse">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none mb-1">SOS Protocol</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-slate-500 font-bold uppercase ">Our team members are here to help </p>
                <div className="p-3 bg-red-50/50 rounded-xl flex items-start gap-3 border border-red-100/50">
                  <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center text-white flex-shrink-0">
                     <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none mb-1.5">Live Location For better help</p>
                     <p className="text-[11px] font-bold text-slate-700 leading-normal line-clamp-2">
                       {address || (
                         <span className="flex items-center gap-1">
                           <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                           Syncing with satellites...
                         </span>
                       )}
                     </p>
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                   <Button 
                     variant="outline" 
                     className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 text-slate-700"
                     onClick={() => window.location.href = `tel:${policeNumber}`}
                   >
                     <Phone className="w-3 h-3 mr-1 text-slate-400" />
                     {policeNumber}
                   </Button>
                   <Button 
                     variant="outline" 
                     className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 text-slate-700"
                     onClick={() => window.location.href = `tel:${ambulanceNumber}`}
                   >
                     <Phone className="w-3 h-3 mr-1 text-slate-400" />
                     {ambulanceNumber}
                   </Button>
                   <Button 
                     variant="outline" 
                     className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 sm:col-span-1 text-slate-700"
                     onClick={() => window.location.href = `tel:${teamContactNumber}`}
                   >
                     <Phone className="w-3 h-3 mr-1 text-slate-400" />
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
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen ? 'bg-slate-900 text-white' : 'bg-red-600 text-white shadow-red-600/30 ring-4 ring-red-600/20'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 animate-pulse" />}
      </motion.button>
    </div>
  );
}
