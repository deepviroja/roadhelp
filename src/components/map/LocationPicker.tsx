import { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GeoLocation } from '@/types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';
import { reverseGeocodeAddress } from '@/lib/mapService';
import '@/lib/leaflet-setup';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const t3 = setTimeout(() => map.invalidateSize(), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map]);
  return null;
}

interface LocationPickerProps {
  onLocationSelect: (location: GeoLocation) => void;
  initialLocation?: GeoLocation;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (loc: GeoLocation) => void }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await reverseGeocodeAddress(lat, lng);
      onLocationSelect({ lat, lng, address });
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
        const address = await reverseGeocodeAddress(lat, lng);
        const loc: GeoLocation = { lat, lng, address };
        handleLocationSelect(loc);
        mapRef.current?.flyTo([lat, lng], DEFAULT_MAP_ZOOM);
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        if (err.code === 1) {
          toast.error('Location permission denied. Please enable location services in your browser settings.');
        } else {
          toast.error('Unable to retrieve GPS location. Please select manually on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-0 w-full h-[400px] sm:h-[480px] flex flex-col rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">
            TAP OR DRAG MARKER ON MAP TO SET ADDRESS
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="h-9 px-4 rounded-xl bg-blue-600 border-blue-500 text-white hover:bg-blue-700 font-black text-[10px] tracking-widest shadow-sm active:scale-95 transition-all w-full sm:w-auto"
        >
          {isGettingLocation ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Navigation className="w-3.5 h-3.5 mr-2" />}
          {isGettingLocation ? 'SYNCING GPS...' : 'USE MY LOCATION'}
        </Button>
      </div>

      <div className="flex-1 w-full h-full relative z-0 overflow-hidden">
        <MapContainer
          center={initialLocation ? [initialLocation.lat, initialLocation.lng] : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
          zoom={DEFAULT_MAP_ZOOM}
          style={{ height: '100%', width: '100%', minHeight: '350px' }}
          ref={mapRef}
        >

          <MapResizer />
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
                  const address = await reverseGeocodeAddress(lat, lng);
                  handleLocationSelect({ lat, lng, address });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

