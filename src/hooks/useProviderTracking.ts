import { useCallback, useEffect, useRef, useState } from 'react';
import { ref, set } from 'firebase/database';
import { doc, setDoc } from 'firebase/firestore';
import { rtdb } from '@/config/firebase';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStore } from '@/stores/systemStore';

export function useProviderTracking(requestId: string | null, isActive: boolean) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const lastProfileUpdateRef = useRef<number>(0);
  const { trackingInterval } = useSystemStore();
  const { profile } = useAuth();
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; error: string | null }>({
    lat: null,
    lng: null,
    error: null,
  });

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setCoords((p) => ({ ...p, error: 'Geolocation is not supported by your browser.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null });
      },
      (err) => {
        setCoords((p) => ({ ...p, error: err.message || 'Unable to get your location.' }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!requestId || !isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) return;

    const trackingRef = ref(rtdb, `tracking/${requestId}`);
    const intervalMs = (trackingInterval || 5) * 1000;
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const { latitude, longitude, heading, speed } = pos.coords;

        // Update UI state (throttled to avoid excessive re-renders)
        if (now - lastUiUpdateRef.current >= 1000) {
          setCoords({ lat: latitude, lng: longitude, error: null });
          lastUiUpdateRef.current = now;
        }

        // Throttle updates based on admin setting
        if (now - lastUpdateRef.current < intervalMs) return;

        set(trackingRef, {
          providerLat: latitude,
          providerLng: longitude,
          heading: heading ?? null,
          speed: speed ?? null,
          lastUpdated: now,
        }).catch((err) => {
          console.error('[Tracking] RTDB Write Error:', err);
        });

        // Also update provider's Firestore profile location as a fallback for customer tracking
        // (in case RTDB is blocked or misconfigured). Throttle to at most every 10s.
        if (profile?.uid && now - lastProfileUpdateRef.current >= 10_000) {
          setDoc(
            doc(db, 'users', profile.uid),
            {
              location: { lat: latitude, lng: longitude },
              locationUpdatedAt: now,
            },
            { merge: true }
          ).catch((err) => {
            console.error('[Tracking] Firestore location update error:', err);
          });
          lastProfileUpdateRef.current = now;
        }

        lastUpdateRef.current = now;
      },
      (err) => {
        console.error('[Tracking] Geolocation Error:', err);
        setCoords((p) => ({ ...p, error: err.message || 'Unable to read GPS location.' }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [requestId, isActive, trackingInterval, profile?.uid]);

  return { ...coords, requestPermission };
}
