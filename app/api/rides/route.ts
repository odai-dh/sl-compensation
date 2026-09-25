import { handle, readBody } from "@/lib/server/http";
import { BookRideRequest, RideViewSchema } from "@/lib/schemas";
import { bookRide } from "@/lib/server/services";

/** Orders and pays for the taxi. Eligibility is re-checked on the server. */
export async function POST(req: Request) {
  return handle(RideViewSchema, async () => bookRide(await readBody(req, BookRideRequest)));
}
