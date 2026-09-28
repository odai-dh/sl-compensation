import "server-only";
import { getBackend, type Snapshot, type StoreBackend } from "./persistence";
import { seedAll } from "./seed";
import { ServiceError } from "./services";
import { emptyStore, runWithStore, type Store } from "./store";

/**
 * Sandboxes: every visitor gets a private copy of the demo world, keyed by a random id the browser keeps.
 * One person clicking "Reset demo" never wipes another visitor's ride, and the same code works on a
 * serverless host where requests land on different instances.
 *
 * A request works on its own snapshot. If anything changed, it is written back only if nobody else wrote
 * in the meantime (compare-and-swap). A collision re-runs the request on fresh data, so two simultaneous
 * polls can never both file the same SL claim.
 */

/** Seeded data (disruption times, history) goes stale, so an old sandbox is rebuilt on its next visit. */
export const SANDBOX_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;
/** Quotes and BankID orders are only useful for minutes; dropping them keeps the stored JSON small. */
const EPHEMERAL_MS = 60 * 60 * 1000;

export const DEFAULT_SANDBOX = "shared";
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function normalizeSandboxId(raw: string | null | undefined): string {
  return raw && ID_PATTERN.test(raw) ? raw : DEFAULT_SANDBOX;
}

const keyFor = (id: string) => `sandbox/${id}`;

function prune(store: Store, nowMs: number) {
  for (const [id, q] of Object.entries(store.mock.quotes)) {
    if (nowMs - new Date(q.createdAt).getTime() > EPHEMERAL_MS) delete store.mock.quotes[id];
  }
  for (const [id, o] of Object.entries(store.mock.bankid)) {
    if (nowMs - o.startedAtMs > EPHEMERAL_MS) delete store.mock.bankid[id];
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadOrSeed(key: string, backend: StoreBackend, nowMs: number): Promise<{ store: Store; json: string; version: string }> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const snap: Snapshot | null = await backend.read(key);
    if (snap) {
      const store = JSON.parse(snap.json) as Store;
      if (nowMs - store.seededAt < SANDBOX_TTL_MS) return { store, json: snap.json, version: snap.version };
    }
    // First visit, or the sandbox is stale: build a fresh world and store it before doing any work.
    const fresh = emptyStore();
    const { store } = await runWithStore(fresh, async () => {
      await seedAll();
    });
    const json = JSON.stringify(store);
    const version = await backend.write(key, json, snap?.version ?? null);
    if (version) return { store, json, version };
    // Someone else seeded first – read theirs.
  }
  throw new ServiceError("BUSY", "The demo is busy – try again in a moment", 503);
}

export async function withSandbox<T>(
  id: string,
  fn: () => Promise<T>,
  backend: StoreBackend = getBackend(),
): Promise<T> {
  const key = keyFor(normalizeSandboxId(id));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const loaded = await loadOrSeed(key, backend, Date.now());
    // A throw inside fn discards every change it made: a failed booking never leaves half a payment behind.
    const { result, store } = await runWithStore(loaded.store, fn);
    prune(store, Date.now());
    const json = JSON.stringify(store);
    if (json === loaded.json) return result;
    if (await backend.write(key, json, loaded.version)) return result;
    // Lost the race: run again on the winner's data.
    await pause(5 + Math.random() * 25 * (attempt + 1));
  }
  throw new ServiceError("BUSY", "The demo is busy – try again in a moment", 503);
}
