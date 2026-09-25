import { handle, readBody } from "@/lib/server/http";
import { EligibilityRequest, EligibilityResponseSchema } from "@/lib/schemas";
import { eligibility } from "@/lib/server/services";

export async function POST(req: Request) {
  return handle(EligibilityResponseSchema, async () => eligibility(await readBody(req, EligibilityRequest)));
}
