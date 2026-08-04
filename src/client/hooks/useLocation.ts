"use client";
import { useState, useCallback, useEffect } from "react";

export interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  granted: boolean | null;
}

const LOCATION_KEY = "district_location";
const LOCATION_EVENT = "district:location";

function broadcastLocation(lat: number, lng: number) {
  sessionStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: { lat, lng } }));
}

function broadcastClear() {
  sessionStorage.removeItem(LOCATION_KEY);
  window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: null }));
}

export function useLocation() {
  const [state, setState] = useState<LocationState>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(LOCATION_KEY);
      if (cached) {
        const { lat, lng } = JSON.parse(cached) as { lat: number; lng: number };
        return { lat, lng, error: null, loading: false, granted: true };
      }
    }
    return { lat: null, lng: null, error: null, loading: false, granted: null };
  });

  // Sync state when another useLocation instance updates sessionStorage
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number } | null>).detail;
      if (detail) {
        setState({ lat: detail.lat, lng: detail.lng, error: null, loading: false, granted: true });
      } else {
        setState({ lat: null, lng: null, error: null, loading: false, granted: null });
      }
    };
    window.addEventListener(LOCATION_EVENT, handler);
    return () => window.removeEventListener(LOCATION_EVENT, handler);
  }, []);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation is not supported by this browser", granted: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        broadcastLocation(lat, lng);
        setState({ lat, lng, error: null, loading: false, granted: true });
      },
      (err) => {
        setState((s) => ({ ...s, loading: false, error: err.message, granted: false }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const clear = useCallback(() => {
    broadcastClear();
    setState({ lat: null, lng: null, error: null, loading: false, granted: null });
  }, []);

  return { ...state, request, clear };
}
