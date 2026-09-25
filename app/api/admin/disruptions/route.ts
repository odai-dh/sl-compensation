import { handle, readBody } from "@/lib/server/http";
import { CreateDisruptionRequest, DisruptionSchema } from "@/lib/schemas";
import { triggerDisruption } from "@/lib/server/services";

export async function POST(req: Request) {
  return handle(DisruptionSchema, async () => {
    const { templateId, expectedDelayMinutes } = await readBody(req, CreateDisruptionRequest);
    return triggerDisruption(templateId, expectedDelayMinutes);
  });
}
