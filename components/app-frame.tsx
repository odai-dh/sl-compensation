"use client";

import { DemoBanner } from "@/components/demo-banner";
import { EmbedBridge } from "@/components/embed-bridge";
import { useEmbedded } from "@/lib/client/embed";

/**
 * Phone-sized frame: full screen on phones, a centred device on desktop.
 * In embed mode (inside the showcase website) the site draws the phone, so we render edge to edge.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const embedded = useEmbedded();
  if (embedded) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background pt-9">
        <EmbedBridge />
        {children}
      </div>
    );
  }
  return (
    <div className="min-h-dvh md:bg-muted md:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2.25rem] md:border md:shadow-2xl">
        <DemoBanner />
        {children}
      </div>
    </div>
  );
}
