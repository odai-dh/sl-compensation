import "server-only";
import { z } from "zod";
import type { ApiResponse } from "@/lib/schemas";
import { headers } from "next/headers";
import { DEFAULT_SANDBOX, normalizeSandboxId, withSandbox } from "./sandbox";
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

/** Every answer is private to one visitor's sandbox, so no CDN or browser may cache it. */
const NO_STORE = { "cache-control": "no-store" };

/** Header carrying the visitor's private sandbox id (see lib/server/sandbox.ts). */
export const SANDBOX_HEADER = "x-vidare-sandbox";

/**
 * Runs a handler with the shared envelope: { ok: true, data } or { ok: false, error }.
 * The output is validated against `output` so the API contract (also used by the iOS app) holds.
 * The handler runs inside the caller's sandbox; callers without the header share one public sandbox.
 */
export async function handle<S extends z.ZodType>(output: S, fn: () => Promise<z.input<S>>): Promise<Response> {
  try {
    const sandboxId = normalizeSandboxId((await headers()).get(SANDBOX_HEADER)) || DEFAULT_SANDBOX;
    const data = await withSandbox(sandboxId, async () => output.parse(await fn()));
    return Response.json({ ok: true, data } satisfies ApiResponse<unknown>, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ServiceError) {
      return Response.json(
        { ok: false, error: { code: e.code, message: e.message, details: e.details } } satisfies ApiResponse<never>,
        { status: e.status, headers: NO_STORE },
      );
    }
    console.error(e);
    const message = e instanceof Error ? e.message : "Unexpected error";
    return Response.json({ ok: false, error: { code: "INTERNAL", message } } satisfies ApiResponse<never>, {
      status: 500,
      headers: NO_STORE,
    });
  }
}

export type Ctx<P extends string> = { params: Promise<Record<P, string>> };
