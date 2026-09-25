import { handle, readBody } from "@/lib/server/http";
import { QuoteRequest, QuoteResponseSchema } from "@/lib/schemas";
import { quote, requireUser } from "@/lib/server/services";

export async function POST(req: Request) {
  return handle(QuoteResponseSchema, async () => {
    const body = await readBody(req, QuoteRequest);
    requireUser(body.userId);
    return quote(body.originPlaceId, body.destinationPlaceId);
  });
}
