import { useState, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = 'Unable to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. To enable: open browser Settings → Site Settings → Location → Allow for this site, then refresh.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable. Please check your GPS.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        }
        setState({ lat: null, lng: null, error: errorMessage, loading: false });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Always fetch fresh - don't use cached location
      }
    );
  }, []);

  return { ...state, getCurrentLocation };
}
