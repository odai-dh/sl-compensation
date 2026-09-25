"use client";

import { ArrowRight } from "lucide-react";
import { useFormat } from "@/lib/client/format";
import type { LedgerEntryView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<LedgerEntryView["kind"], string> = {
  taxiPaymentByVidare: "Vidare pays taxi",
  taxiExcessByUser: "User pays excess above cap",
  slPayout: "SL pays Vidare",
  userFaultCharge: "User charged (user fault)",
  writeOff: "Vidare absorbs loss",
  userRefund: "Refund to user",
  writeOffReversal: "Loss reversed",
};

const PARTY: Record<LedgerEntryView["from"], string> = { vidare: "Vidare", user: "User", sl: "SL", taxi: "Taxi", loss: "Loss" };

export function LedgerEntries({ entries, showDate = true }: { entries: LedgerEntryView[]; showDate?: boolean }) {
  const f = useFormat();
  if (!entries.length) return <p className="text-sm text-muted-foreground">No money movements yet.</p>;
  return (
    <ul className="flex flex-col divide-y text-sm">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2">
          <span className="flex w-36 shrink-0 items-center gap-1 font-medium">
            {PARTY[e.from]} <ArrowRight className="size-3.5 text-muted-foreground" aria-label="to" /> {PARTY[e.to]}
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {KIND_LABEL[e.kind]}
            {showDate && ` · ${f.dateTime(e.at)}`}
          </span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              e.to === "vidare" && "text-success",
              (e.from === "vidare" || e.kind === "writeOff") && "text-danger",
            )}
          >
            {f.kr(e.amountSEK)}
          </span>
        </li>
      ))}
    </ul>
  );
}
