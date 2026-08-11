// Unified Map Service Abstraction for OpenStreetMap + Nominatim + OSRM Routing

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // Array of [lat, lng]
}

const geocodeCache = new Map<string, string>();
const osrmCache = new Map<string, RouteResult>();
let lastOsrmCallTime = 0;

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, {
      headers: {
        'User-Agent': 'RoadHelpAssistanceMarketplace/1.0',
      },
    });
    if (!res.ok) throw new Error('Geocoding service unavailable');
    const data = await res.json();
    const formatted = data.display_name
      || [data.address?.suburb || data.address?.neighbourhood, data.address?.city || data.address?.town || data.address?.county, data.address?.state].filter(Boolean).join(', ')
      || 'Selected Map Location';
    
    geocodeCache.set(cacheKey, formatted);
    return formatted;
  } catch (err) {
    console.warn('[MapService] Reverse geocode error:', err);
    return 'Selected Map Location';
  }
}

export async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult> {
  const key = `${startLat.toFixed(3)},${startLng.toFixed(3)}->${endLat.toFixed(3)},${endLng.toFixed(3)}`;
  if (osrmCache.has(key)) {
    return osrmCache.get(key)!;
  }

  // Throttle OSRM API calls to max 1 request per 2 seconds
  const now = Date.now();
  if (now - lastOsrmCallTime < 2000) {
    await new Promise((r) => setTimeout(r, 2000 - (now - lastOsrmCallTime)));
  }
  lastOsrmCallTime = Date.now();

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM API error ${res.status}`);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));
    
    // GeoJSON coordinates are [lng, lat] -> Convert to Leaflet [lat, lng]
    const geometry: [number, number][] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

    const result: RouteResult = {
      distanceKm,
      durationMinutes,
      geometry,
    };

    osrmCache.set(key, result);
    return result;
  } catch (error) {
    console.warn('[MapService] OSRM route fetch failed, falling back to Haversine:', error);
    const haversineKm = calculateHaversineDistance(startLat, startLng, endLat, endLng);
    const fallbackDuration = Math.max(5, Math.round((haversineKm / 30) * 60)); // 30 km/h avg speed fallback
    return {
      distanceKm: haversineKm,
      durationMinutes: fallbackDuration,
      geometry: [
        [startLat, startLng],
        [endLat, endLng],
      ],
    };
  }
}
