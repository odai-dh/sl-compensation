import { handle } from "@/lib/server/http";
import { LedgerSummarySchema } from "@/lib/schemas";
import { ledgerSummary } from "@/lib/server/services";

export async function GET() {
  return handle(LedgerSummarySchema, () => ledgerSummary());
}
