import { z } from "zod";
import { handle, type Ctx } from "@/lib/server/http";
import { RideViewSchema } from "@/lib/schemas";
import { listRides, requireUser } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(z.array(RideViewSchema), async () => {
    requireUser(userId);
    return listRides(userId);
  });
}
