import { handle } from "@/lib/server/http";
import { AdminStateSchema } from "@/lib/schemas";
import { adminState } from "@/lib/server/services";

/** Demo admin only. Not protected – never deploy the admin routes to production as-is. */
export async function GET() {
  return handle(AdminStateSchema, () => adminState());
}
