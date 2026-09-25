import { DemoBanner } from "@/components/demo-banner";

/** Phone-sized frame: full screen on phones, a centred device on desktop for the demo. */
export default function ScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:bg-muted md:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-[2.25rem] md:border md:shadow-2xl">
        <DemoBanner />
        {children}
      </div>
    </div>
  );
}
