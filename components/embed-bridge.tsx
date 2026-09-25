"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/client/api";
import { emitToSite, isEmbedded } from "@/lib/client/embed";
import { runJury, stopJury } from "@/lib/client/jury";
import { useApp } from "@/lib/client/store";
import { readSiteMessage } from "@/lib/embed/events";

/** Talks to the showcase website when the app runs inside its iframe. Renders nothing. */
export function EmbedBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isEmbedded()) emitToSite({ type: "route", path: pathname });
  }, [pathname]);

  useEffect(() => {
    if (!isEmbedded()) return;
    emitToSite({ type: "ready", path: window.location.pathname });

    // Tapping "I'm stranded" (or picking a line) is the moment the train stops in the 3D world.
    const unsubscribe = useApp.subscribe((state, prev) => {
      const id = state.draft.disruptionId;
      if (id && id !== prev.draft.disruptionId) emitToSite({ type: "disruptionDetected", disruptionId: id });
    });

    let cursorHidden = false;
    let frame = 0;
    const onPointer = (e: PointerEvent) => {
      if (!cursorHidden || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        emitToSite({ type: "pointer", x: e.clientX, y: e.clientY, inside: true });
      });
    };
    const onLeave = () => cursorHidden && emitToSite({ type: "pointer", x: 0, y: 0, inside: false });

    const onMessage = async (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const msg = readSiteMessage(event, window.location.origin);
      if (!msg) return;
      if (msg.type === "cursor") {
        cursorHidden = msg.hidden;
        document.documentElement.classList.toggle("embed-no-cursor", msg.hidden);
      } else if (msg.type === "runJury") {
        runJury(router);
      } else if (msg.type === "stopJury") {
        stopJury();
      } else if (msg.type === "resetDemo") {
        stopJury();
        const { userId } = await api.startDemo();
        const s = useApp.getState();
        s.resetFlow();
        s.setUserId(userId);
        s.setLocation("t-centralen");
        router.push("/app/home");
      }
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("pointermove", onPointer);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      unsubscribe();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [router]);

  return null;
}
