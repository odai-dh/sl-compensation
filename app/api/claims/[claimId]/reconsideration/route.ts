import { handle, readBody, type Ctx } from "@/lib/server/http";
import { ClaimViewSchema, UserRef } from "@/lib/schemas";
import { requestReconsideration } from "@/lib/server/services";

/** Omprövning: within 3 weeks of SL's decision. */
export async function POST(req: Request, ctx: Ctx<"claimId">) {
  const { claimId } = await ctx.params;
  return handle(ClaimViewSchema, async () => {
    const { userId } = await readBody(req, UserRef);
    return requestReconsideration(userId, claimId);
  });
}
