import { handle, readBody, type Ctx } from "@/lib/server/http";
import { DisruptionSchema, SetDisruptionActiveRequest } from "@/lib/schemas";
import { setDisruptionActive } from "@/lib/server/services";

export async function PATCH(req: Request, ctx: Ctx<"disruptionId">) {
  const { disruptionId } = await ctx.params;
  return handle(DisruptionSchema, async () => {
    const { active } = await readBody(req, SetDisruptionActiveRequest);
    return setDisruptionActive(disruptionId, active);
  });
}
