"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MapProps } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

/** OpenStreetMap via react-leaflet. Client-only, since Leaflet needs `window`. */
export function MapView({ className, ...props }: MapProps) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-lg border bg-muted", className)}>
      <LeafletMap {...props} className="size-full" />
    </div>
  );
}
