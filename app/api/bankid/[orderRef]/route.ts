import { handle, type Ctx } from "@/lib/server/http";
import { BankIdPollSchema } from "@/lib/schemas";
import { pollAuth } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"orderRef">) {
  const { orderRef } = await ctx.params;
  return handle(BankIdPollSchema, () => pollAuth(orderRef));
}
