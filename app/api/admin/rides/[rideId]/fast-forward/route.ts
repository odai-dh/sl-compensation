import { handle, readBody, type Ctx } from "@/lib/server/http";
import { FastForwardRequest, RideViewSchema } from "@/lib/schemas";
import { fastForwardRide } from "@/lib/server/services";

export async function POST(req: Request, ctx: Ctx<"rideId">) {
  const { rideId } = await ctx.params;
  return handle(RideViewSchema, async () => {
    const { to } = await readBody(req, FastForwardRequest);
    return fastForwardRide(rideId, to);
  });
}
