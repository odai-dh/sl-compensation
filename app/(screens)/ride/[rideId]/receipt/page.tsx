"use client";

import { motion } from "framer-motion";
import { CircleCheck, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ReceiptCard } from "@/components/receipt-card";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { useT } from "@/lib/i18n";

export default function ReceiptScreen() {
  const t = useT();
  useRequireUser();
  const { rideId } = useParams<{ rideId: string }>();
  const ride = useFetch(() => api.ride(rideId), rideId);
  const claim = useFetch(ride.data?.claimId ? () => api.claim(ride.data!.claimId!) : null, ride.data?.claimId ?? "none");
  const r = ride.data;

  return (
    <Screen
      title={t("receipt.title")}
      back="/home"
      footer={
        <div className="flex flex-col gap-2">
          {r?.claimId && (
            <Button size="lg" className="w-full" asChild>
              <Link href={`/claims/${r.claimId}`}>{t("receipt.viewClaim")}</Link>
            </Button>
          )}
          <Button size="lg" variant="outline" className="w-full" asChild>
            <Link href="/home">{t("receipt.home")}</Link>
          </Button>
        </div>
      }
    >
      {ride.error ? (
        <ErrorState error={ride.error} onRetry={ride.reload} />
      ) : !r || !r.receipt ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="flex flex-col gap-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2 py-2 text-center">
            <CircleCheck className="size-14 text-success" aria-hidden />
            <h2 className="text-2xl font-bold">{t("ride.arrived")}</h2>
            <p className="text-sm text-muted-foreground">
              {r.trip.origin.name} → {r.trip.destination.name}
            </p>
          </motion.div>

          {r.claimId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex gap-3 rounded-lg bg-primary-soft p-4 text-primary-soft-foreground"
            >
              <Send className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{t("receipt.claimFiled")}</p>
                <p className="text-sm">{t("receipt.claimFiledBody", { ref: claim.data?.slReference ?? "…" })}</p>
              </div>
            </motion.div>
          )}

          <ReceiptCard receipt={r.receipt} split={r.split} />
        </div>
      )}
    </Screen>
  );
}
