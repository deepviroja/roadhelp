import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, X, Shield, MapPin, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useSystemStore } from '@/stores/systemStore';
import { db } from '@/config/firebase';

/** Reverse geocode lat/lng → human readable area name (never raw coordinates) */
async function getAreaName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    // Build a natural area name from most-specific to least-specific fields
    const parts = [
      a.suburb || a.neighbourhood || a.quarter || a.hamlet,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length > 0 ? `Near ${parts.slice(0, 2).join(', ')}` : data.display_name?.split(',').slice(0, 2).join(',').trim() || 'your location';
  } catch {
    return 'your location';
  }
}

export function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();
  const { settings } = usePlatformSettings();
  const location = useLocation();

  // Location fetched ONCE on first mount — stored in ref to persist without re-renders
  const [locationName, setLocationName] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const locationFetchedRef = useRef(false);

  const isAdminOrProvider =
    profile?.role === 'admin' ||
    profile?.role === 'provider' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/provider');

  // Fetch location ONCE on page load (not on every SOS open)
  useEffect(() => {
    if (isAdminOrProvider) return;
    if (locationFetchedRef.current) return;
    if (!navigator.geolocation) return;

    locationFetchedRef.current = true;
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        coordsRef.current = { lat, lng };
        const name = await getAreaName(lat, lng);
        setLocationName(name);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, [isAdminOrProvider]);

  if (isAdminOrProvider) return null;

  const policeNumber = settings?.sosConfig?.policeNumber || '100';
  const ambulanceNumber = settings?.sosConfig?.ambulanceNumber || '108';
  const helplineNumber = settings?.sosConfig?.helplineNumber || '1073';
  const teamContactNumber = settings?.sosConfig?.teamContactNumber || '1090';

  /** Called when user presses any emergency call button.
   *  Re-fetches location, logs the call to Firestore, then dials. */
  const handleCall = async (callType: 'police' | 'ambulance' | 'helpline' | 'team', number: string) => {
    // Re-fetch location silently before logging
    let lat = coordsRef.current?.lat;
    let lng = coordsRef.current?.lng;
    let areaName = locationName || 'unknown location';

    if (navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            coordsRef.current = { lat, lng };
            const freshName = await getAreaName(lat, lng);
            if (freshName) {
              areaName = freshName;
              setLocationName(freshName);
            }
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
        );
      });
    }

    // Log SOS call to Firestore
    try {
      const alertId = `SOS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      await setDoc(doc(db, 'sosAlerts', alertId), {
        id: alertId,
        callType,
        calledNumber: number,
        customerId: profile?.uid || 'guest',
        customerName: profile?.fullName || 'Guest',
        customerEmail: profile?.email || null,
        customerPhone: profile?.phone ? `${profile.countryCode || ''}${profile.phone}` : null,
        locationName: areaName,
        latitude: lat ?? null,
        longitude: lng ?? null,
        status: 'active',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[SOS] Failed to log call:', err);
    }

    // Dial the number
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl p-5 w-[calc(100vw-3rem)] max-w-sm sm:w-80 border border-red-100 mb-2 origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-red-600/20 animate-pulse">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">
                  Emergency Help
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Our team and emergency services are ready to help you.
              </p>

              {/* Location display */}
              <div className="p-3 bg-red-50 rounded-xl flex items-start gap-3 border border-red-100">
                <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none mb-1.5">
                    Your current location
                  </p>
                  <p className="text-[11px] font-bold text-slate-700 leading-normal">
                    {locationLoading ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Getting your location...
                      </span>
                    ) : locationName ? (
                      locationName
                    ) : (
                      <span className="text-slate-400 italic">Location not available</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick call buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 hover:border-red-300 text-slate-700 flex-col gap-0.5"
                  onClick={() => handleCall('police', policeNumber)}
                >
                  <Phone className="w-3 h-3 text-slate-400" />
                  Police {policeNumber}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 hover:border-red-300 text-slate-700 flex-col gap-0.5"
                  onClick={() => handleCall('ambulance', ambulanceNumber)}
                >
                  <Phone className="w-3 h-3 text-slate-400" />
                  Ambulance {ambulanceNumber}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[9px] tracking-widest hover:bg-slate-50 hover:border-red-300 text-slate-700 flex-col gap-0.5"
                  onClick={() => handleCall('team', teamContactNumber)}
                >
                  <Phone className="w-3 h-3 text-slate-400" />
                  Team {teamContactNumber}
                </Button>
              </div>

              {/* Main helpline */}
              <Button
                onClick={() => handleCall('helpline', helplineNumber)}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-md shadow-red-600/20 gap-2"
              >
                <Phone className="w-4 h-4" />
                Call Road Helpline — {helplineNumber}
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
