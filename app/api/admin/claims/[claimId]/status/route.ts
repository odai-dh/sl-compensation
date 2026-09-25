import { handle, readBody, type Ctx } from "@/lib/server/http";
import { ClaimViewSchema, ForceClaimStatusRequest } from "@/lib/schemas";
import { setClaimStatus } from "@/lib/server/services";

export async function POST(req: Request, ctx: Ctx<"claimId">) {
  const { claimId } = await ctx.params;
  return handle(ClaimViewSchema, async () => {
    const { status, ...opts } = await readBody(req, ForceClaimStatusRequest);
    return setClaimStatus(claimId, status, opts);
  });
}
