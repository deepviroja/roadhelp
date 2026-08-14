import { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast.error('No addresses found for your search query.');
      }
    } catch (err) {
      console.error('OSM Nominatim Geocode error:', err);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

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

  useEffect(() => {
    if (!initialLocation) {
      handleGetCurrentLocation();
    }
  }, [initialLocation]);

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

      <form onSubmit={handleSearch} className="px-5 py-3 bg-slate-800 text-white flex gap-2 relative z-20 shrink-0 border-t border-slate-700">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address, landmark, city..."
            className="h-10 rounded-xl bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-450 font-semibold w-full pl-3 pr-10 text-xs focus:bg-slate-700 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSearching}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-xl transition-all active:scale-95 shrink-0 animate-pulse-once"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto divide-y divide-slate-100 text-slate-850">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => {
                  const lat = parseFloat(result.lat);
                  const lon = parseFloat(result.lon);
                  const loc: GeoLocation = { lat, lng: lon, address: result.display_name };
                  handleLocationSelect(loc);
                  mapRef.current?.flyTo([lat, lon], DEFAULT_MAP_ZOOM);
                  setSearchResults([]);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <span className="font-bold text-slate-900 truncate">{result.display_name.split(',')[0]}</span>
                <span className="text-slate-500 truncate text-[10px]">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </form>

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

