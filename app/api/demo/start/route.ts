import { z } from "zod";
import { handle } from "@/lib/server/http";
import { startDemo } from "@/lib/server/seed";

/** Resets the demo and returns a fully onboarded user stranded near the Red line. */
export async function POST() {
  return handle(z.object({ userId: z.string() }), () => startDemo());
}
