import { z } from "zod";
import { handle, readBody } from "@/lib/server/http";
import { TaxiAvailabilityRequest } from "@/lib/schemas";
import { setTaxiAvailability } from "@/lib/server/services";

export async function POST(req: Request) {
  return handle(z.object({ taxiAvailable: z.boolean() }), async () => {
    const { available } = await readBody(req, TaxiAvailabilityRequest);
    return setTaxiAvailability(available);
  });
}
