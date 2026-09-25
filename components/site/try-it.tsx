"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, PlayCircle, RotateCcw, SquareStop, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { readAppEvent, SITE_SOURCE, type SiteMessage } from "@/lib/embed/events";
import { scrollToStation } from "@/lib/site/scroll";
import { useSite } from "@/lib/site/store";
import { STATIONS, TRY_STATION } from "@/lib/site/story";
import { cn } from "@/lib/utils";
import { CURSOR_EVENT, type CursorDetail } from "./cursor";
import { Magnetic, siteButton } from "./magnetic";

const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 14;

/** The real app, in a CSS phone, synced with the 3D world via postMessage. */
export function TryIt() {
  const frame = useRef<HTMLIFrameElement>(null);
  const section = useRef<HTMLElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const [paying, setPaying] = useState(false);
  const autoStarted = useRef(false);
  const demo = useSite((s) => s.demo);

  const post = useCallback((msg: SiteMessage) => {
    frame.current?.contentWindow?.postMessage({ source: SITE_SOURCE, ...msg }, window.location.origin);
  }, []);

  // Lazy-load the iframe when the section gets close.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSrc("/app?embed=1");
          io.disconnect();
        }
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fit the 390×844 phone into the viewport.
  useEffect(() => {
    const fit = () => {
      const mobile = window.innerWidth < 768;
      const byHeight = (window.innerHeight - (mobile ? 40 : 120)) / (PHONE_H + BEZEL * 2);
      const byWidth = (window.innerWidth - 32) / (PHONE_W + BEZEL * 2);
      setScale(Math.max(0.45, Math.min(1, mobile ? Math.min(byHeight, byWidth) : byHeight)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // App → site events.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const e = readAppEvent(event, window.location.origin);
      if (!e) return;
      if (e.type === "pointer") {
        const r = frame.current!.getBoundingClientRect();
        const detail: CursorDetail = { x: r.left + e.x * scale, y: r.top + e.y * scale, overPhone: e.inside };
        window.dispatchEvent(new CustomEvent(CURSOR_EVENT, { detail }));
        return;
      }
      if (e.type === "ready" && document.documentElement.classList.contains("site-cursor")) post({ type: "cursor", hidden: true });
      // Nobody signed in inside the phone yet: start the demo user so the jury can tap "I'm stranded" right away.
      if (e.type === "route" && e.path === "/app/welcome" && !autoStarted.current) {
        autoStarted.current = true;
        post({ type: "resetDemo" });
      }
      useSite.getState().applyAppEvent(e);
      if (e.type === "claimStatusChanged" && e.status === "paidOut") useSite.getState().setJury(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post, scale]);

  const runJury = () => {
    const s = useSite.getState();
    if (s.demo.juryRunning) {
      post({ type: "stopJury" });
      s.setJury(false);
      return;
    }
    scrollToStation(TRY_STATION, { offsetRatio: 0 });
    s.resetDemo();
    s.setJury(true);
    setSrc((cur) => cur ?? "/app?embed=1");
    // Give a freshly loaded iframe a moment to boot.
    setTimeout(() => post({ type: "runJury" }), s.demo.appReady ? 300 : 2500);
  };

  const reset = () => {
    post({ type: "stopJury" });
    post({ type: "resetDemo" });
    useSite.getState().resetDemo();
  };

  /** SL takes weeks; the demo admin API lets us skip to the payout. */
  const payOut = async () => {
    const claimId = useSite.getState().demo.claimId;
    if (!claimId) return;
    setPaying(true);
    try {
      for (const status of ["approved", "paidOut"]) {
        const res = await fetch(`/api/admin/claims/${claimId}/status`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const json = (await res.json()) as { ok: boolean; data?: { claimedSEK: number } };
        if (json.ok && status === "paidOut") {
          useSite.getState().applyAppEvent({ type: "claimStatusChanged", claimId, status: "paidOut", amountSEK: json.data?.claimedSEK ?? 0 });
        }
      }
    } finally {
      setPaying(false);
    }
  };

  const steps = [
    { done: demo.checklist.stranded, label: "Tap “I’m stranded”", hint: "The train in the city stops and the signal turns red." },
    { done: demo.checklist.ordered, label: "Order the taxi", hint: "Watch it drive in, pick you up and head home." },
    { done: demo.checklist.paid, label: "Watch your claim get paid", hint: "SL pays Vidare. You paid nothing." },
  ];

  return (
    <section ref={section} id={STATIONS[TRY_STATION].id} className="relative md:h-[200vh]" aria-labelledby="try-title">
      <div className="flex min-h-svh flex-col md:sticky md:top-0 items-center justify-center gap-8 px-4 py-20 md:flex-row md:justify-between md:gap-10 md:px-12 lg:px-20">
        <div className="flex max-w-sm flex-col gap-5 rounded-3xl bg-[#070b14]/70 p-6 backdrop-blur-sm xl:max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffb020]">Live demo</p>
          <h2 id="try-title" className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight md:text-5xl">
            Try it. This is the real app.
          </h2>
          <p className="text-[#c9d3e3]">Everything in the phone works. The city behind it reacts to what you do.</p>
          <ol className="flex flex-col gap-3" aria-label="Demo checklist">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                    s.done ? "border-[#ffb020] bg-[#ffb020] text-[#1a1203]" : "border-white/30 text-[#c9d3e3]",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {s.done ? (
                      <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="size-4" aria-label="done" />
                      </motion.span>
                    ) : (
                      <motion.span key="todo">{i + 1}</motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span>
                  <span className={cn("block font-semibold", s.done && "text-[#ffb020]")}>{s.label}</span>
                  <span className="block text-sm text-[#9aa7bd]">{s.hint}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Magnetic>
              <button type="button" onClick={runJury} className={siteButton.primary}>
                {demo.juryRunning ? <SquareStop className="size-5" aria-hidden /> : <PlayCircle className="size-5" aria-hidden />}
                {demo.juryRunning ? "Stop jury mode" : "Jury mode"}
              </button>
            </Magnetic>
            <button type="button" onClick={reset} className={siteButton.ghost}>
              <RotateCcw className="size-4" aria-hidden /> Reset demo
            </button>
          </div>
          {demo.rideDone && !demo.checklist.paid && (
            <button type="button" onClick={payOut} disabled={paying || !demo.claimId} className={cn(siteButton.ghost, "self-start")}>
              {paying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Zap className="size-4" aria-hidden />}
              SL takes weeks – skip to the payout
            </button>
          )}
          <p className="text-xs text-[#8995ab]">Jury mode plays the whole flow by itself. Demo data only – no real money.</p>
        </div>

        <div
          data-cursor="taxi"
          className="relative shrink-0"
          style={{ width: (PHONE_W + BEZEL * 2) * scale, height: (PHONE_H + BEZEL * 2) * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left rounded-[3.4rem] bg-gradient-to-b from-[#2b3242] to-[#11151f] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_120px_rgba(0,0,0,0.7),0_0_80px_rgba(255,176,32,0.18)]"
            style={{ width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2, padding: BEZEL, transform: `scale(${scale})` }}
          >
            <div className="relative size-full overflow-hidden rounded-[2.6rem] bg-[#0b0f14]">
              {src ? (
                <iframe
                  ref={frame}
                  src={src}
                  title="Vidare app – live demo"
                  width={PHONE_W}
                  height={PHONE_H}
                  className="block border-0"
                  allow="vibrate"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-[#9aa7bd]">Loading the app…</div>
              )}
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-2.5 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
