import { z } from "zod";
import { handle } from "@/lib/server/http";
import { DisruptionWithDistanceSchema } from "@/lib/schemas";
import { listDisruptions } from "@/lib/server/services";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const near = params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  return handle(z.array(DisruptionWithDistanceSchema), () => listDisruptions(near));
}
