"use client";

import { useFormat } from "@/lib/client/format";
import { useT } from "@/lib/i18n";
import type { RideView } from "@/lib/schemas";

type Receipt = NonNullable<RideView["receipt"]>;

export function ReceiptCard({ receipt, split }: { receipt: Receipt; split?: RideView["split"] }) {
  const t = useT();
  const f = useFormat();
  const rows: [string, string][] = [
    [t("receipt.number"), receipt.receiptNo],
    [t("receipt.company"), receipt.company],
    [t("receipt.orgNr"), receipt.orgNr],
    [t("receipt.vehicle"), receipt.vehicleReg],
    [t("receipt.driver"), receipt.driverName],
    [t("receipt.pickup"), f.dateTime(receipt.pickupAt)],
    [t("receipt.dropoff"), f.dateTime(receipt.dropoffAt)],
    [t("receipt.from"), receipt.fromAddress],
    [t("receipt.to"), receipt.toAddress],
    [t("receipt.distance"), t("common.km", { n: receipt.distanceKm })],
  ];
  return (
    <div className="rounded-lg border bg-card text-sm">
      <dl className="flex flex-col gap-2 p-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="flex flex-col gap-2 border-t border-dashed p-4">
        <div className="flex justify-between">
          <dt>{t("receipt.fare")}</dt>
          <dd className="font-semibold tabular-nums">{f.kr(receipt.fareSEK)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>{t("receipt.vat")}</dt>
          <dd className="tabular-nums">{receipt.vatSEK.toFixed(2).replace(".", ",")} kr</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("receipt.tip")}</dt>
          <dd className="tabular-nums">{f.kr(receipt.tipSEK)}</dd>
        </div>
        {split && (
          <>
            <div className="flex justify-between">
              <dt>{t("receipt.vidarePaid")}</dt>
              <dd className="tabular-nums">{f.kr(split.vidarePaysSEK)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("receipt.fee")}</dt>
              <dd className="tabular-nums">{f.kr(split.vidareFeeSEK)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>{t("receipt.youPaid")}</dt>
              <dd className="tabular-nums">{f.kr(split.userPaysSEK)}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
