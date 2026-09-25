import { handle, readBody, type Ctx } from "@/lib/server/http";
import { StartAuthResponseSchema, StartSignRequest, UserViewSchema } from "@/lib/schemas";
import { revokeFullmakt, startFullmaktSign } from "@/lib/server/services";

/** Starts a BankID signature of the fullmakt text in the chosen language. */
export async function POST(req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(StartAuthResponseSchema, async () => {
    const { lang } = await readBody(req, StartSignRequest);
    return startFullmaktSign(userId, lang);
  });
}

/** Revokes the fullmakt. */
export async function DELETE(_req: Request, ctx: Ctx<"userId">) {
  const { userId } = await ctx.params;
  return handle(UserViewSchema, () => revokeFullmakt(userId));
}
