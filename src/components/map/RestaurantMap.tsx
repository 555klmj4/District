"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface MapRestaurant {
  id: string;
  name: string;
  lat: string | null;
  lng: string | null;
  cuisine_primary: string | null;
  rating_aggregate: string | null;
  is_open_now?: boolean;
}

interface RestaurantMapProps {
  restaurants: MapRestaurant[];
}

export function RestaurantMap({ restaurants }: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const pins = restaurants.filter((r) => r.lat && r.lng);
    if (pins.length === 0) return;

    // Dynamic import to avoid SSR issues with Leaflet
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css" as string),
    ]).then(([L]) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default marker icons (webpack bundles break Leaflet's default icon paths)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center = [
        pins.reduce((s, r) => s + parseFloat(r.lat!), 0) / pins.length,
        pins.reduce((s, r) => s + parseFloat(r.lng!), 0) / pins.length,
      ] as [number, number];

      const map = L.map(mapRef.current!).setView(center, 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Custom amber marker icon
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:#C8723A;border:2px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          transform:rotate(-45deg);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      pins.forEach((r) => {
        const rating = r.rating_aggregate ? `⭐ ${parseFloat(r.rating_aggregate).toFixed(1)}` : "";
        const open = r.is_open_now === true ? '<span style="color:#22a561;font-weight:600"> · Open</span>' : "";
        const cuisine = r.cuisine_primary ? `<div style="color:#888;font-size:11px">${r.cuisine_primary}</div>` : "";

        const popup = L.popup({ maxWidth: 200 }).setContent(`
          <div style="font-family:system-ui;padding:2px 0">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px">${r.name}</div>
            ${cuisine}
            <div style="font-size:12px;margin-top:4px">${rating}${open}</div>
            <a href="/restaurants/${r.id}"
               style="display:inline-block;margin-top:8px;padding:4px 10px;background:#C8723A;color:white;border-radius:999px;font-size:11px;font-weight:600;text-decoration:none"
            >View details</a>
          </div>
        `);

        L.marker([parseFloat(r.lat!), parseFloat(r.lng!)], { icon })
          .addTo(map)
          .bindPopup(popup);
      });

      if (pins.length > 1) {
        const bounds = L.latLngBounds(pins.map((r) => [parseFloat(r.lat!), parseFloat(r.lng!)]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [restaurants]);

  return (
    <div
      ref={mapRef}
      className="w-full"
      style={{ height: "calc(100dvh - 7rem)" }}
    />
  );
}
