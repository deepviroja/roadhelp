import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GeoLocation } from '@/types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import '@/lib/leaflet-setup';

interface LocationPickerProps {
  onLocationSelect: (location: GeoLocation) => void;
  initialLocation?: GeoLocation;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (loc: GeoLocation) => void }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        onLocationSelect({
          lat,
          lng,
          address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      } catch {
        onLocationSelect({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    },
  });
  return null;
}

const pickerIcon = L.divIcon({
  html: `<div style="color: #ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)); transform: translateY(-50%); display:flex; justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(initialLocation || null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  const handleLocationSelect = (loc: GeoLocation) => {
    setSelectedLocation(loc);
    onLocationSelect(loc);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location services.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const loc: GeoLocation = {
            lat,
            lng,
            address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          };
          handleLocationSelect(loc);
          mapRef.current?.flyTo([lat, lng], DEFAULT_MAP_ZOOM);
        } catch {
          handleLocationSelect({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          mapRef.current?.flyTo([lat, lng], DEFAULT_MAP_ZOOM);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        if (err.code === 1) {
          toast.error('Location permission denied. Please enable location services in your browser settings.');
        } else {
          toast.error('Unable to retrieve location. Please check your signal or select manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-center gap-4 px-4 py-3 bg-white/50 backdrop-blur-md border-b border-slate-100 relative z-20">
        <Button
          type="button"
          variant="outline"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="h-10 px-6 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs tracking-widest shadow-sm active:scale-95 transition-all w-full sm:w-auto"
        >
          {isGettingLocation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
          {isGettingLocation ? 'SYNCING GPS...' : 'USE MY LOCATION'}
        </Button>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          MANUAL OVERRIDE: CLICK ANYWHERE ON MAP
        </p>
      </div>

      <div className="flex-1 min-h-[400px] md:min-h-[500px] relative z-0">
        <MapContainer
          center={initialLocation ? [initialLocation.lat, initialLocation.lng] : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {selectedLocation && (
            <Marker
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={pickerIcon}
              draggable
              eventHandlers={{
                dragend: async (e) => {
                  const marker = e.target as L.Marker;
                  const { lat, lng } = marker.getLatLng();
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    handleLocationSelect({
                      lat,
                      lng,
                      address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    });
                  } catch {
                    handleLocationSelect({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
                  }
                },
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
