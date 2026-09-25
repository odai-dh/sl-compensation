import { z } from "zod";
import { handle, type Ctx } from "@/lib/server/http";
import { ClaimViewSchema } from "@/lib/schemas";
import { listClaims, requireUser } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(z.array(ClaimViewSchema), async () => {
    requireUser(userId);
    return listClaims(userId);
  });
}
