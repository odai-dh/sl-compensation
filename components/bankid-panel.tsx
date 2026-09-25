"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, LoaderCircle, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MockQr } from "@/components/mock-qr";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import type { BankIdPollView } from "@/lib/schemas";

type Props = {
  start: () => Promise<{ orderRef: string }>;
  poll: (orderRef: string) => Promise<BankIdPollView>;
  cancel: (orderRef: string) => Promise<unknown>;
  onComplete: (result: BankIdPollView) => void;
  /** Label for the idle button. */
  actionLabel: string;
  pendingLabel?: string;
};

type Phase = "idle" | "pending" | "complete" | "cancelled" | "error";

/** A realistic BankID hand-off: QR code + "Open BankID", polling until done or cancelled. */
export function BankIdPanel({ start, poll, cancel, onComplete, actionLabel, pendingLabel }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [view, setView] = useState<BankIdPollView | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  });

  const begin = useCallback(async () => {
    setError(null);
    setPhase("pending");
    try {
      const order = await start();
      setOrderRef(order.orderRef);
    } catch (e) {
      setPhase("error");
      setError(e instanceof ApiError ? e.message : t("common.error"));
    }
  }, [start, t]);

  useEffect(() => {
    if (!orderRef || phase !== "pending") return;
    let alive = true;
    const tick = async () => {
      try {
        const v = await poll(orderRef);
        if (!alive) return;
        setView(v);
        if (v.status === "complete") {
          setPhase("complete");
          setTimeout(() => done.current(v), 700);
        } else if (v.status === "cancelled" || v.status === "failed") {
          setPhase("cancelled");
        }
      } catch (e) {
        if (alive) {
          setPhase("error");
          setError(e instanceof ApiError ? e.message : t("common.error"));
        }
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [orderRef, phase, poll, t]);

  const onCancel = async () => {
    if (orderRef) await cancel(orderRef).catch(() => null);
    setPhase("cancelled");
  };

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <Button size="lg" className="w-full" onClick={begin}>
              <BankIdLogo /> {actionLabel}
            </Button>
          </motion.div>
        )}
        {phase === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-4"
          >
            <p className="text-sm font-medium">{t("bankid.scan")}</p>
            {view ? <MockQr data={view.qrData} /> : <div className="size-[200px] animate-pulse rounded-md bg-muted" />}
            <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {pendingLabel ??
                (view?.hintCode === "userSign" ? t("bankid.hint.userSign") : t("bankid.hint.outstandingTransaction"))}
            </p>
            <Button variant="outline" className="w-full" onClick={() => undefined}>
              <Smartphone aria-hidden /> {t("bankid.open")}
            </Button>
            <Button variant="ghost" className="w-full" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          </motion.div>
        )}
        {phase === "complete" && (
          <motion.div key="complete" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2 py-8">
            <CircleCheck className="size-16 text-success" aria-hidden />
            <p className="font-semibold">{t("bankid.complete")}</p>
          </motion.div>
        )}
        {(phase === "cancelled" || phase === "error") && (
          <motion.div key="cancelled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full flex-col items-center gap-3 py-4">
            <CircleX className="size-12 text-danger" aria-hidden />
            <p className="font-semibold">{phase === "error" ? t("common.error") : t("bankid.cancelled")}</p>
            <p className="text-sm text-muted-foreground">{error ?? t("bankid.cancelledBody")}</p>
            <Button className="mt-2 w-full" onClick={begin}>
              {t("common.retry")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-xs text-muted-foreground">{t("bankid.mockNote")}</p>
    </div>
  );
}

function BankIdLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <path d="M7.2 11.3 8.4 3.8h4.9c1.9 0 3.1 1 2.8 2.7-.2 1-.9 1.8-2 2.2 1.4.4 1.9 1.4 1.7 2.6-.3 2.1-2.1 3.1-4.3 3.1H9.1l.4-2.3h1.9c.9 0 1.6-.4 1.7-1.1.1-.7-.3-1.1-1.2-1.1H7.2Zm2.3-5.2-.3 2.1h1.6c.8 0 1.4-.4 1.5-1 .1-.7-.3-1.1-1.1-1.1H9.5ZM4.5 20.2l.4-2.4h14.6l-.4 2.4H4.5Z" />
    </svg>
  );
}
