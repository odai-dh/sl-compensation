"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "@/lib/core/types";

export type MapProps = {
  origin?: LatLng | null;
  destination?: LatLng | null;
  car?: LatLng | null;
  /** Extra points to keep in view (e.g. the driver's start). */
  fitTo?: (LatLng | null | undefined)[];
  className?: string;
};

const carIcon = L.divIcon({
  className: "vidare-car-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div style="width:36px;height:36px;border-radius:9999px;background:var(--primary);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.35);border:3px solid white">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="stroke:var(--primary-foreground)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
});

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [36, 36] });
  }, [map, points]);
  return null;
}

export default function LeafletMap({ origin, destination, car, fitTo = [], className }: MapProps) {
  const points = [origin, destination, car, ...fitTo].filter((p): p is LatLng => !!p);
  // SVG attributes can't use CSS variables, so resolve the theme colours once.
  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue("--primary").trim() || "#0a6b63";
  const ink = css.getPropertyValue("--foreground").trim() || "#0f172a";
  const center = points[0] ?? { lat: 59.3293, lng: 18.0686 };
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className={className}
      zoomControl={false}
      attributionControl
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {origin && destination && (
        <Polyline
          positions={[
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]}
          pathOptions={{ color: primary, weight: 5, opacity: 0.85, dashArray: "1 10", lineCap: "round" }}
        />
      )}
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: primary, fillOpacity: 1 }}
        />
      )}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: ink, fillOpacity: 1 }}
        />
      )}
      {car && <Marker position={[car.lat, car.lng]} icon={carIcon} />}
    </MapContainer>
  );
}
