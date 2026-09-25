import { handle, type Ctx } from "@/lib/server/http";
import { BankIdPollSchema } from "@/lib/schemas";
import { cancelBankId } from "@/lib/server/services";

export async function POST(_req: Request, ctx: Ctx<"orderRef">) {
  const { orderRef } = await ctx.params;
  return handle(BankIdPollSchema, () => cancelBankId(orderRef));
}
