import { z } from "zod";
import { handle } from "@/lib/server/http";
import { resetDemo } from "@/lib/server/seed";

export async function POST() {
  return handle(z.object({ reset: z.literal(true) }), async () => {
    await resetDemo();
    return { reset: true as const };
  });
}
