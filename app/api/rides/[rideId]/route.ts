import { handle, type Ctx } from "@/lib/server/http";
import { RideViewSchema } from "@/lib/schemas";
import { rideView } from "@/lib/server/services";

/** Live ride status. When the ride completes, the receipt is created and the SL claim is filed. */
export async function GET(_req: Request, ctx: Ctx<"rideId">) {
  const { rideId } = await ctx.params;
  return handle(RideViewSchema, () => rideView(rideId));
}
