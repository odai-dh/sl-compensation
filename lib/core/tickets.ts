import type { TicketType } from "@/lib/core/types";

export const TICKET_TYPES: { type: TicketType; en: string; sv: string }[] = [
  { type: "reskassa", en: "Reskassa (pay-as-you-go on SL Access)", sv: "Reskassa (på SL Access-kort)" },
  { type: "betalkort", en: "Contactless bank card (tap to pay)", sv: "Betalkort (blippa)" },
  { type: "appSingle", en: "Single ticket in the SL app", sv: "Enkelbiljett i SL-appen" },
  { type: "24h", en: "24-hour ticket", sv: "24-timmarsbiljett" },
  { type: "72h", en: "72-hour ticket", sv: "72-timmarsbiljett" },
  { type: "7d", en: "7-day ticket", sv: "7-dagarsbiljett" },
  { type: "30d", en: "30-day ticket", sv: "30-dagarsbiljett" },
  { type: "month", en: "Monthly ticket (månadsbiljett)", sv: "Månadsbiljett" },
  { type: "90d", en: "90-day ticket", sv: "90-dagarsbiljett" },
  { type: "year", en: "Annual ticket", sv: "Årsbiljett" },
];

export const TICKET_TYPE_IDS = TICKET_TYPES.map((t) => t.type) as [TicketType, ...TicketType[]];
