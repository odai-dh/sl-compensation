import { handle, type Ctx } from "@/lib/server/http";
import { BankIdPollSchema } from "@/lib/schemas";
import { pollFullmaktSign } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"userId" | "orderRef">) {
  const { userId, orderRef } = await ctx.params;
  return handle(BankIdPollSchema, () => pollFullmaktSign(userId, orderRef));
}
