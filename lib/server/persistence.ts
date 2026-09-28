import "server-only";

/**
 * Where a visitor's sandbox lives between requests.
 *
 * Serverless hosts (Netlify) run each request on whichever instance is free, so state cannot live in a
 * module-level variable. A backend stores one JSON string per key and supports a compare-and-swap write,
 * which is all the optimistic concurrency in `sandbox.ts` needs.
 */
export interface Snapshot {
  json: string;
  /** Opaque version (an ETag on Netlify Blobs). Changes on every write. */
  version: string;
}

export interface StoreBackend {
  readonly name: string;
  read(key: string): Promise<Snapshot | null>;
  /**
   * Writes only if the stored version still equals `expected` (`null` = the key must not exist yet).
   * Returns the new version, or `null` if someone else wrote first.
   */
  write(key: string, json: string, expected: string | null): Promise<string | null>;
}

/** In-process backend for local development and tests. Same semantics as Blobs, minus the network. */
export function createMemoryBackend(): StoreBackend {
  const data = new Map<string, Snapshot>();
  let counter = 0;
  return {
    name: "memory",
    async read(key) {
      return data.get(key) ?? null;
    },
    async write(key, json, expected) {
      const current = data.get(key)?.version ?? null;
      if (current !== expected) return null;
      const version = String(++counter);
      data.set(key, { json, version });
      return version;
    },
  };
}

type BlobStore = import("@netlify/blobs").Store;

const STORE_NAME = "vidare-sandboxes";

export function createBlobsBackend(store: BlobStore): StoreBackend {
  return {
    name: "netlify-blobs",
    async read(key) {
      const hit = await store.getWithMetadata(key, { type: "text", consistency: "strong" });
      return hit?.etag ? { json: hit.data, version: hit.etag } : null;
    },
    async write(key, json, expected) {
      const result = await store.set(key, json, expected === null ? { onlyIfNew: true } : { onlyIfMatch: expected });
      return result.modified && result.etag ? result.etag : null;
    },
  };
}

const isMissingBlobs = (e: unknown) => e instanceof Error && e.name === "MissingBlobsEnvironmentError";

/**
 * Picks Netlify Blobs when the runtime provides it and falls back to memory everywhere else.
 * Only the "not configured" error triggers the fallback: any other Blobs failure is a real error,
 * because silently switching to per-instance memory would split one visitor's state across instances.
 */
function createAutoBackend(): StoreBackend {
  let active: StoreBackend | null = null;
  const memory = createMemoryBackend();
  let blobs: StoreBackend | null | undefined;

  const resolve = async (): Promise<StoreBackend> => {
    if (active) return active;
    if (blobs === undefined) {
      try {
        const { getStore } = await import("@netlify/blobs");
        blobs = createBlobsBackend(getStore({ name: STORE_NAME, consistency: "strong" }));
      } catch (e) {
        if (!isMissingBlobs(e)) throw e;
        blobs = null;
      }
    }
    return blobs ?? memory;
  };

  const run = async <T>(op: (b: StoreBackend) => Promise<T>): Promise<T> => {
    const backend = await resolve();
    try {
      const result = await op(backend);
      active = backend;
      return result;
    } catch (e) {
      if (backend !== memory && !active && isMissingBlobs(e)) {
        console.warn("[vidare] Netlify Blobs is not configured here – using in-memory sandboxes (single instance only).");
        blobs = null;
        return op(memory);
      }
      throw e;
    }
  };

  return {
    get name() {
      return (active ?? memory).name;
    },
    read: (key) => run((b) => b.read(key)),
    write: (key, json, expected) => run((b) => b.write(key, json, expected)),
  };
}

const g = globalThis as unknown as { __vidareBackend?: StoreBackend };

export function getBackend(): StoreBackend {
  g.__vidareBackend ??= createAutoBackend();
  return g.__vidareBackend;
}
