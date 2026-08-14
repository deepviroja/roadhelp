import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GeoLocation } from '@/types';
import { DEFAULT_MAP_ZOOM } from '@/lib/constants';
import { fetchOSRMRoute, RouteResult } from '@/lib/mapService';
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

function MapRecenter({ providerLoc, customerLoc }: { providerLoc: [number, number], customerLoc: [number, number] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!hasFitted.current && providerLoc && customerLoc) {
      map.fitBounds([providerLoc, customerLoc], { padding: [50, 50] });
      hasFitted.current = true;
    } else if (providerLoc) {
      map.panTo(providerLoc, { animate: true });
    }
  }, [providerLoc, customerLoc, map]);
  return null;
}

interface ProviderLocationMapProps {
  providerLocation: { lat: number; lng: number };
  customerLocation: GeoLocation;
}

export function ProviderLocationMap({ providerLocation, customerLocation }: ProviderLocationMapProps) {
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!providerLocation || !customerLocation) return;
    let active = true;
    fetchOSRMRoute(
      providerLocation.lat,
      providerLocation.lng,
      customerLocation.lat,
      customerLocation.lng
    ).then((result) => {
      if (!active || !result) return;
      setRouteInfo({
        distance: String(result.distanceKm),
        time: String(result.durationMinutes),
      });
      setRouteCoordinates(result.geometry);
    }).catch(err => {
      console.warn('Map routing error:', err);
    });
    return () => {
      active = false;
    };
  }, [providerLocation.lat, providerLocation.lng, customerLocation.lat, customerLocation.lng]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0 h-[280px] sm:h-[360px] lg:h-[420px]">
      <MapContainer
        center={[providerLocation.lat, providerLocation.lng]}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[providerLocation.lat, providerLocation.lng]} icon={providerDivIcon} />
        <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerDivIcon} />

        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            color="#2563EB" 
            weight={4} 
            opacity={0.8} 
          />
        )}
        <MapRecenter providerLoc={[providerLocation.lat, providerLocation.lng]} customerLoc={[customerLocation.lat, customerLocation.lng]} />
      </MapContainer>

      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[9999] text-xs pointer-events-auto border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#ef4444"/></svg>
          <span className="font-medium text-gray-800">Customer Location</span>
        </div>
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
          <span className="font-medium text-gray-800">Your Location</span>
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
    </div>
  );
}
