export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  isFallback: boolean;
  statusMessage?: string;
}

export const STALE_LOCATION_THRESHOLD_MINUTES = 3;

/**
 * Calculates straight-line Haversine distance in KM
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Fetches real road route driving geometry, distance and duration via OSRM with automatic fallback
 */
export async function fetchOSRMRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const haversineDist = calculateHaversineDistance(originLat, originLng, destLat, destLng);
  // Default fallback estimation assuming 40 km/h average speed
  const fallbackDuration = Math.max(2, Math.round((haversineDist / 40) * 60));

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OSRM HTTP error ${res.status}`);

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        (pt: [number, number]) => [pt[1], pt[0]]
      );
      const roadDistKm = Math.round((route.distance / 1000) * 10) / 10;
      const roadDurationMin = Math.max(1, Math.round(route.duration / 60));

      return {
        coordinates: coords,
        distanceKm: roadDistKm,
        durationMinutes: roadDurationMin,
        isFallback: false,
      };
    }
  } catch (err) {
    console.warn('[RoutingService] OSRM routing failed, using fallback:', err);
  }

  return {
    coordinates: [
      [originLat, originLng],
      [destLat, destLng],
    ],
    distanceKm: haversineDist,
    durationMinutes: fallbackDuration,
    isFallback: true,
    statusMessage: 'Live road route temporarily unavailable (showing fallback estimation).',
  };
}

/**
 * Checks if location update timestamp is older than maxAgeMinutes
 */
export function isLocationStale(
  lastUpdatedAt?: string | number | null,
  maxAgeMinutes: number = STALE_LOCATION_THRESHOLD_MINUTES
): boolean {
  if (!lastUpdatedAt) return true;
  const updateTime = typeof lastUpdatedAt === 'string' ? new Date(lastUpdatedAt).getTime() : lastUpdatedAt;
  if (isNaN(updateTime)) return true;
  const ageInMs = Date.now() - updateTime;
  return ageInMs > maxAgeMinutes * 60 * 1000;
}

/**
 * Formats last updated time into human-friendly string
 */
export function formatLastUpdatedTime(lastUpdatedAt?: string | number | null): string {
  if (!lastUpdatedAt) return 'Provider location unavailable';
  const updateTime = typeof lastUpdatedAt === 'string' ? new Date(lastUpdatedAt).getTime() : lastUpdatedAt;
  if (isNaN(updateTime)) return 'Provider location unavailable';

  const elapsedMs = Date.now() - updateTime;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);

  if (elapsedSec < 30) return 'Updated just now';
  if (elapsedMin < 1) return `Updated ${elapsedSec} seconds ago`;
  if (elapsedMin === 1) return 'Updated 1 minute ago';
  if (elapsedMin < 60) return `Last updated ${elapsedMin} minutes ago`;

  return 'Provider location unavailable';
}
