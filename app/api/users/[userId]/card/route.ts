import { handle, readBody, type Ctx } from "@/lib/server/http";
import { AddCardRequest, UserViewSchema } from "@/lib/schemas";
import { addCard } from "@/lib/server/services";

export async function POST(req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(UserViewSchema, async () => addCard(userId, await readBody(req, AddCardRequest)));
}
