import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ref, onValue } from 'firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';
import { rtdb, db } from '@/config/firebase';
import { TrackingData, GeoLocation } from '@/types';
import { DEFAULT_MAP_ZOOM } from '@/lib/constants';
import { useNearbyProviders } from '@/hooks/useNearbyProviders';
import '@/lib/leaflet-setup';

const customerDivIcon = L.divIcon({
  html: `<div style="color: #ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); transform: translateY(-50%); display:flex; justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const providerDivIcon = L.divIcon({
  html: `<div style="color: #2563EB; font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); display:flex; justify-content:center; align-items:center; transform:translateY(-20%) border-radius:50%; background:white; padding:4px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const othersDivIcon = L.divIcon({
  html: `<div style="color: #94a3b8; transform: translateY(-50%); display:flex; justify-content:center; opacity: 0.6;">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

function RoutingLayer({
  from,
  to,
  onRouteFound,
}: {
  from: [number, number];
  to: [number, number];
  onRouteFound?: (info: { distance: string; time: string }) => void;
}) {
  const map = useMap();
  const routingRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const onRouteFoundRef = useRef(onRouteFound);

  useEffect(() => {
    onRouteFoundRef.current = onRouteFound;
  }, [onRouteFound]);

  useEffect(() => {
    if (!map || !(L as any).Routing) return; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!routingRef.current) {
      routingRef.current = (L as any).Routing.control({ // eslint-disable-line @typescript-eslint/no-explicit-any
        waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
        router: (L as any).Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
        }),
        lineOptions: {
          styles: [{ color: '#2563EB', weight: 4, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        show: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        routeWhileDragging: false,
      }).addTo(map);

      routingRef.current.on('routesfound', function (e: any) {
        const routes = e.routes;
        if (routes && routes[0]) {
          const summary = routes[0].summary;
          if (onRouteFoundRef.current) {
            onRouteFoundRef.current({
              distance: (summary.totalDistance / 1000).toFixed(1) + ' km',
              time: Math.round(summary.totalTime / 60) + ' min',
            });
          }
        }
      });
    } else {
      routingRef.current.getPlan().setWaypoints([L.latLng(from[0], from[1]), L.latLng(to[0], to[1])]);
    }
  }, [map, from, to]);

  return null;
}

function MapRecenter({
  providerLoc,
  customerLoc,
}: {
  providerLoc: [number, number];
  customerLoc: [number, number];
}) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (providerLoc && customerLoc) {
      if (!hasFitted.current) {
        map.fitBounds([providerLoc, customerLoc], { padding: [50, 50] });
        hasFitted.current = true;
      } else {
        map.panTo(providerLoc, { animate: true });
      }
    }
  }, [providerLoc, customerLoc, map]);
  return null;
}

interface LiveTrackingMapProps {
  requestId: string;
  customerLocation: GeoLocation;
}

export function LiveTrackingMap({ requestId, customerLocation }: LiveTrackingMapProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [fallbackLocation, setFallbackLocation] = useState<GeoLocation | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const { providers: otherProviders } = useNearbyProviders();
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);

  useEffect(() => {
    const trackingRef = ref(rtdb, `tracking/${requestId}`);
    const unsubscribe = onValue(trackingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // console.log('[Tracking] RTDB Update:', data);
        setTrackingData(data);
        setTrackingError(null);
      }
    }, (err) => {
      console.error('[Tracking] RTDB Read Error:', err);
      setTrackingError(err?.message || 'Live tracking is unavailable right now.');
    });
    return () => unsubscribe();
  }, [requestId]);

  // Fallback: Get provider's profile location from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'serviceRequests', requestId), (requestSnap) => {
       if (requestSnap.exists()) {
         const providerId = requestSnap.data().providerId;
         if (providerId) {
            onSnapshot(doc(db, 'users', providerId), (userSnap) => {
               if (userSnap.exists() && userSnap.data().location) {
                //  console.log('[Tracking] Fallback Location Update:', userSnap.data().location);
                 setFallbackLocation(userSnap.data().location);
               }
            });
         }
       }
    });
    return () => unsub();
  }, [requestId]);

  const activeProviderLat = trackingData?.providerLat ?? fallbackLocation?.lat;
  const activeProviderLng = trackingData?.providerLng ?? fallbackLocation?.lng;
  const hasActiveProvider = activeProviderLat != null && activeProviderLng != null;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0 h-[280px] sm:h-[360px] lg:h-[420px]">
      <MapContainer
        center={[customerLocation.lat, customerLocation.lng]}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Other providers nearby - but NOT our active one */}
        {otherProviders.filter(p => !hasActiveProvider || (p.location?.lat !== activeProviderLat || p.location?.lng !== activeProviderLng)).map(p => (
           p.location && <Marker key={p.uid} position={[p.location.lat, p.location.lng]} icon={othersDivIcon} opacity={0.5} />
        ))}
        
        {/* Customer Marker */}
        <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerDivIcon} />

        {/* Tracking Components */}
        {hasActiveProvider && (
          <>
            <Marker position={[activeProviderLat, activeProviderLng]} icon={providerDivIcon} />
            <RoutingLayer
              from={[activeProviderLat, activeProviderLng]}
              to={[customerLocation.lat, customerLocation.lng]}
              onRouteFound={setRouteInfo}
            />
            <MapRecenter
              providerLoc={[activeProviderLat, activeProviderLng]}
              customerLoc={[customerLocation.lat, customerLocation.lng]}
            />
          </>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[9999] text-xs pointer-events-auto border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#ef4444"/></svg>
          <span className="font-medium text-gray-800">Your Location</span>
        </div>
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          <span className="font-medium text-gray-800">Provider Location</span>
        </div>
        {routeInfo ? (
          <div className="flex flex-col gap-1 text-sm pt-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-500">Distance:</span>
              <span className="font-semibold text-blue-600">{routeInfo.distance}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-500">Est. Time:</span>
              <span className="font-semibold text-blue-600">{routeInfo.time}</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic mt-2">Calculating route...</div>
        )}
      </div>

      {trackingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[999]">
          <div className="bg-white rounded-lg p-4 shadow-lg text-center mx-4">
            <p className="text-sm font-medium text-gray-700">Live tracking unavailable</p>
            <p className="text-xs text-gray-500 mt-1">{trackingError}</p>
          </div>
        </div>
      )}

      {!trackingError && !hasActiveProvider && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[999]">
          <div className="bg-white rounded-lg p-4 shadow-lg text-center mx-4">
            <p className="text-sm font-medium text-gray-700">Waiting for provider to connect...</p>
            <p className="text-xs text-gray-500 mt-1">Live tracking will appear when provider accepts</p>
          </div>
        </div>
      )}
    </div>
  );
}
