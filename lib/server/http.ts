import "server-only";
import { z } from "zod";
import type { ApiResponse } from "@/lib/schemas";
import { ensureSeeded } from "./seed";
import { ServiceError } from "./services";

/** Parses and validates a JSON body. */
export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ServiceError("BAD_JSON", "Request body must be JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION", "Invalid request", 422, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

/**
 * Runs a handler with the shared envelope: { ok: true, data } or { ok: false, error }.
 * The output is validated against `output` so the API contract (also used by the iOS app) holds.
 */
export async function handle<S extends z.ZodType>(output: S, fn: () => Promise<z.input<S>>): Promise<Response> {
  try {
    await ensureSeeded();
    const data = output.parse(await fn());
    return Response.json({ ok: true, data } satisfies ApiResponse<unknown>);
  } catch (e) {
    if (e instanceof ServiceError) {
      return Response.json(
        { ok: false, error: { code: e.code, message: e.message, details: e.details } } satisfies ApiResponse<never>,
        { status: e.status },
      );
    }
    console.error(e);
    const message = e instanceof Error ? e.message : "Unexpected error";
    return Response.json({ ok: false, error: { code: "INTERNAL", message } } satisfies ApiResponse<never>, {
      status: 500,
    });
  }
}

export type Ctx<P extends string> = { params: Promise<Record<P, string>> };
