import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { AlertCircle, Clock, Phone, Star, Navigation, UserCheck } from 'lucide-react';
import { db, rtdb } from '@/config/firebase';
import { TrackingData, GeoLocation } from '@/types';
import { DEFAULT_MAP_ZOOM } from '@/lib/constants';
import { fetchOSRMRoute, RouteResult } from '@/lib/mapService';
import { calculateDistance } from '@/lib/utils';
import '@/lib/leaflet-setup';
import { toast } from 'sonner';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const customerDivIcon = L.divIcon({
  html: `<div style="position:relative">
    <div style="color:#ef4444;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));display:flex;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
    </div>
    <div style="position:absolute;top:-6px;right:-6px;width:14px;height:14px;background:#ef4444;border:2px solid white;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
  </div>`,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
});

const providerDivIcon = L.divIcon({
  html: `<div style="color:#2563EB;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));display:flex;justify-content:center;align-items:center;transform:translateY(-20%);border-radius:50%;background:white;padding:5px;border:2px solid #2563EB;">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

function makeNearbyProviderIcon(initial: string) {
  return L.divIcon({
    html: `<div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);border:2px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));color:white;font-weight:900;font-size:14px;font-family:sans-serif;">
      ${initial.toUpperCase()}
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

interface NearbyProvider {
  uid: string;
  fullName: string;
  rating?: number;
  phone?: string;
  location?: GeoLocation;
  serviceTypes?: string[];
  distanceKm?: number;
}

interface LiveTrackingMapProps {
  requestId: string;
  customerLocation: GeoLocation;
  showNearbyProviders?: boolean;
  requestServiceType?: string;
}

export function LiveTrackingMap({ requestId, customerLocation, showNearbyProviders, requestServiceType }: LiveTrackingMapProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [fallbackLocation, setFallbackLocation] = useState<GeoLocation | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<RouteResult | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProvider[]>([]);
  const [askingProviderId, setAskingProviderId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // RTDB live tracking
  useEffect(() => {
    const trackingRef = ref(rtdb, `tracking/${requestId}`);
    const unsubscribe = onValue(trackingRef, (snapshot) => {
      if (snapshot.exists()) {
        setTrackingData(snapshot.val());
        setTrackingError(null);
      }
    }, (err) => {
      console.error('[Tracking] RTDB Read Error:', err);
      setTrackingError('Live tracking signal lost.');
    });
    return () => unsubscribe();
  }, [requestId]);

  // Fallback: watch assigned provider location from Firestore
  useEffect(() => {
    let providerUnsub: (() => void) | null = null;
    const requestUnsub = onSnapshot(doc(db, 'serviceRequests', requestId), (requestSnap) => {
      if (!requestSnap.exists()) return;
      const providerId = requestSnap.data().providerId;
      if (!providerId) return;
      if (providerUnsub) providerUnsub();
      providerUnsub = onSnapshot(doc(db, 'users', providerId), (userSnap) => {
        if (userSnap.exists() && userSnap.data().location) {
          setFallbackLocation(userSnap.data().location);
        }
      }, (err) => { console.warn('[LiveTrackingMap] User snapshot error:', err); });
    }, (err) => { console.warn('[LiveTrackingMap] Request snapshot error:', err); });

    return () => {
      requestUnsub();
      if (providerUnsub) providerUnsub();
    };
  }, [requestId]);

  // Load nearby providers when in pending state
  useEffect(() => {
    if (!showNearbyProviders) { setNearbyProviders([]); return; }
    let cancelled = false;
    const loadProviders = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'provider'),
          where('isOnline', '==', true),
          where('isVerified', '==', true),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const providers: NearbyProvider[] = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as NearbyProvider))
          .filter((p) => {
            // Filter by service type if provided
            if (requestServiceType && p.serviceTypes) {
               return p.serviceTypes.includes(requestServiceType);
            }
            return true;
          })
          .filter((p) => p.location && p.location.lat != null && p.location.lng != null)
          .map((p) => ({
            ...p,
            distanceKm: p.location
              ? Number(calculateDistance(customerLocation.lat, customerLocation.lng, p.location.lat, p.location.lng).toFixed(1))
              : undefined,
          }))
          .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
          .slice(0, 20);
        setNearbyProviders(providers);
      } catch (err) {
        console.warn('[LiveTrackingMap] Nearby providers load error:', err);
      }
    };
    loadProviders();
    const interval = setInterval(loadProviders, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [showNearbyProviders, requestServiceType, customerLocation.lat, customerLocation.lng]);

  const activeProviderLat = trackingData?.providerLat ?? fallbackLocation?.lat;
  const activeProviderLng = trackingData?.providerLng ?? fallbackLocation?.lng;
  const hasActiveProvider = activeProviderLat != null && activeProviderLng != null;

  // Calculate OSRM road route when provider location updates
  useEffect(() => {
    if (!hasActiveProvider) return;
    let cancelled = false;
    fetchOSRMRoute(activeProviderLat, activeProviderLng, customerLocation.lat, customerLocation.lng)
      .then((route) => { if (!cancelled) setOsrmRoute(route); })
      .catch((err) => { console.warn('[TrackingMap] Route fetch failed:', err); });
    return () => { cancelled = true; };
  }, [activeProviderLat, activeProviderLng, customerLocation.lat, customerLocation.lng, hasActiveProvider]);

  // Fit map viewport
  useEffect(() => {
    if (!mapRef.current) return;
    if (hasActiveProvider) {
      mapRef.current.fitBounds(
        [[customerLocation.lat, customerLocation.lng], [activeProviderLat as number, activeProviderLng as number]],
        { padding: [50, 50] }
      );
    } else {
      mapRef.current.setView([customerLocation.lat, customerLocation.lng], DEFAULT_MAP_ZOOM);
    }
  }, [activeProviderLat, activeProviderLng, customerLocation.lat, customerLocation.lng, hasActiveProvider]);

  const isStale = useMemo(() => {
    if (!trackingData?.lastUpdated) return false;
    return Date.now() - trackingData.lastUpdated > 180000;
  }, [trackingData?.lastUpdated]);

  const minutesAgo = useMemo(() => {
    if (!trackingData?.lastUpdated) return 0;
    return Math.max(1, Math.round((Date.now() - trackingData.lastUpdated) / 60000));
  }, [trackingData?.lastUpdated]);

  const handleAskProvider = async (provider: NearbyProvider) => {
    setAskingProviderId(provider.uid);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken(true);
      // Estimate ETA: roughly 3 minutes per km driving
      const etaMinutes = provider.distanceKm != null ? Math.ceil(provider.distanceKm * 3) : 15;
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/requests/${requestId}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          providerId: provider.uid,
          providerName: provider.fullName,
          providerPhone: provider.phone || '',
          providerRating: provider.rating || 5,
          estimatedPrice: 0, // provider will set a real price from their end
          estimatedTime: etaMinutes,
          message: 'Customer has directly requested your assistance.',
          distanceKm: provider.distanceKm ?? null,
          requestedByCustomer: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not contact provider');
      toast.success(`Request sent to ${provider.fullName}! They can now see your request.`);
    } catch (err: any) {
      toast.error(err.message || 'Could not send request to provider');
    } finally {
      setAskingProviderId(null);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg relative z-0 h-[380px] sm:h-[460px] lg:h-[520px]">
      <MapContainer
        center={[customerLocation.lat, customerLocation.lng]}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef as any}
      >
        <MapResizer />
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer Marker */}
        <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerDivIcon}>
          <Popup className="leaflet-popup-custom">
            <div className="text-xs font-bold text-slate-700 p-1">📍 Your Location</div>
          </Popup>
        </Marker>

        {/* Assigned Provider Marker */}
        {hasActiveProvider && (
          <Marker position={[activeProviderLat as number, activeProviderLng as number]} icon={providerDivIcon}>
            <Popup>
              <div className="text-xs font-bold text-blue-700 space-y-1 p-1">
                <p>🚗 Your Service Provider</p>
                {osrmRoute && (
                  <>
                    <p>📏 {osrmRoute.distanceKm} km away</p>
                    <p>⏱ ETA: ~{osrmRoute.durationMinutes} min</p>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* OSRM Route — animated dashed blue line */}
        {osrmRoute?.geometry && osrmRoute.geometry.length > 0 && (
          <>
            <Polyline positions={osrmRoute.geometry} pathOptions={{ color: '#bfdbfe', weight: 8, opacity: 0.6 }} />
            <Polyline positions={osrmRoute.geometry} pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.9, dashArray: '10 8' }} />
          </>
        )}

        {/* Nearby Provider Markers (when pending) */}
        {showNearbyProviders && nearbyProviders.map((provider) => {
          if (!provider.location?.lat || !provider.location?.lng) return null;
          return (
            <Marker
              key={provider.uid}
              position={[provider.location.lat, provider.location.lng]}
              icon={makeNearbyProviderIcon(provider.fullName?.charAt(0) || 'P')}
            >
              <Popup maxWidth={240} minWidth={200}>
                <div className="space-y-2 p-1">
                  {/* Provider Name + Rating */}
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900 text-sm">{provider.fullName}</p>
                    {provider.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {provider.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Distance */}
                  {provider.distanceKm !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                      <Navigation className="w-3 h-3" />
                      {provider.distanceKm} km away · ~{Math.ceil(provider.distanceKm * 3)} min
                    </div>
                  )}

                  {/* Phone */}
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-1 text-xs text-slate-600 font-semibold hover:text-blue-600"
                    >
                      <Phone className="w-3 h-3" />
                      {provider.phone}
                    </a>
                  )}

                  {/* Ask Button */}
                  <button
                    disabled={askingProviderId === provider.uid}
                    onClick={() => handleAskProvider(provider)}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '7px 12px',
                      background: askingProviderId === provider.uid ? '#94a3b8' : '#2563eb',
                      color: 'white',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '900',
                      border: 'none',
                      cursor: askingProviderId === provider.uid ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'center',
                    }}
                  >
                    {askingProviderId === provider.uid ? 'Sending...' : '⚡ Ask This Provider'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Tracking Card */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[999] text-xs border border-slate-100 max-w-sm">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isStale ? 'bg-amber-500 animate-pulse' : hasActiveProvider ? 'bg-green-500 animate-ping' : 'bg-slate-300'}`} />
            <span className="font-black text-slate-900 uppercase text-[10px] tracking-wider">
              {!hasActiveProvider && showNearbyProviders
                ? `${nearbyProviders.length} Providers Nearby`
                : isStale ? `Updated ${minutesAgo}m ago` : hasActiveProvider ? 'Live Provider GPS' : 'Awaiting Provider'}
            </span>
          </div>
          {trackingData?.lastUpdated && (
            <span className="text-[10px] text-slate-400 font-medium">
              {new Date(trackingData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {osrmRoute ? (
          <div className="grid grid-cols-2 gap-3 text-slate-700">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black uppercase text-slate-400">Road Distance</p>
              <p className="text-sm font-black text-blue-600 mt-0.5">{osrmRoute.distanceKm} km</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black uppercase text-slate-400">Est. Driving Time</p>
              <p className="text-sm font-black text-blue-600 mt-0.5">{osrmRoute.durationMinutes} min</p>
            </div>
          </div>
        ) : showNearbyProviders && nearbyProviders.length > 0 ? (
          <p className="text-slate-500 text-xs font-semibold">
            Tap a provider marker to view details and request help directly.
          </p>
        ) : (
          <div className="text-slate-400 text-xs italic">
            {hasActiveProvider ? 'Calculating OSRM route...' : 'Waiting for provider assignment...'}
          </div>
        )}

        {isStale && (
          <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Provider location was last updated {minutesAgo} minutes ago. Signal may be weak.
          </div>
        )}
      </div>

      {trackingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-[999]">
          <div className="bg-white rounded-2xl p-5 shadow-2xl text-center max-w-xs mx-4 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-black text-slate-900">Tracking Signal Offline</p>
            <p className="text-xs text-slate-500">{trackingError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
