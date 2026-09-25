import { handle, readBody, type Ctx } from "@/lib/server/http";
import { UpdateProfileRequest, UserViewSchema } from "@/lib/schemas";
import { updateProfile, userView } from "@/lib/server/services";

export async function GET(_req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(UserViewSchema, () => userView(userId));
}

export async function PATCH(req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(UserViewSchema, async () => updateProfile(userId, await readBody(req, UpdateProfileRequest)));
}
