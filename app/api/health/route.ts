import { getBackend } from "@/lib/server/persistence";

/**
 * Deployment check: open /api/health after deploying. `storage` must say "netlify-blobs" on Netlify.
 * "memory" there means Blobs isn't available and every function instance would keep its own private
 * copy of the demo – visitors would see rides and users vanish between requests.
 */
export async function GET() {
  const backend = getBackend();
  try {
    const key = "health/probe";
    const first = await backend.read(key);
    const written = await backend.write(key, String(Date.now()), first?.version ?? null);
    const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_LOCAL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const ok = written !== null && !(onNetlify && backend.name === "memory");
    return Response.json(
      {
        ok,
        storage: backend.name,
        runtime: onNetlify ? "netlify" : "local",
        ...(ok ? {} : { problem: "Running on Netlify without Netlify Blobs: demo data will not persist between requests." }),
      },
      { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { ok: false, storage: backend.name, problem: e instanceof Error ? e.message : "Storage check failed" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
