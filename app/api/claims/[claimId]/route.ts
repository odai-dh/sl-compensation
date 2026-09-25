import { handle, type Ctx } from "@/lib/server/http";
import { ClaimViewSchema } from "@/lib/schemas";
import { claimView } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"claimId">) {
  const { claimId } = await ctx.params;
  return handle(ClaimViewSchema, () => claimView(claimId));
}
