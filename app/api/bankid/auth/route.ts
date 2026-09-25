import { handle } from "@/lib/server/http";
import { StartAuthResponseSchema } from "@/lib/schemas";
import { startAuth } from "@/lib/server/services";

export async function POST() {
  return handle(StartAuthResponseSchema, () => startAuth());
}
