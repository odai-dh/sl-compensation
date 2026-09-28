import { describe, expect, it } from "vitest";
import { getAdapters } from "@/lib/adapters";
import { createBlobsBackend, createMemoryBackend, getBackend } from "@/lib/server/persistence";
import { DEFAULT_SANDBOX, normalizeSandboxId, SANDBOX_TTL_MS, withSandbox } from "@/lib/server/sandbox";
import { startDemo } from "@/lib/server/seed";
import * as services from "@/lib/server/services";
import { getStore, newId } from "@/lib/server/store";

const fresh = () => createMemoryBackend();
const claimCount = (b: ReturnType<typeof fresh>, id: string) =>
  withSandbox(id, async () => Object.keys(getStore().app.claims).length, b);

/** Starts the demo, orders the Red line taxi and returns the ids needed to poll it. */
async function bookDemoRide(b: ReturnType<typeof fresh>, id: string) {
  return withSandbox(
    id,
    async () => {
      const { userId } = await startDemo();
      const { quote } = await services.quote("t-centralen", "norsborg");
      const ride = await services.bookRide({
        userId,
        quoteId: quote.id,
        disruptionId: "d-red-signal",
        originPlaceId: "t-centralen",
        destinationPlaceId: "norsborg",
        ticketValid: true,
        acceptExcess: false,
      });
      return { userId, rideId: ride.id, bookingId: Object.keys(getStore().mock.bookings).at(-1)! };
    },
    b,
  );
}

describe("sandbox isolation", () => {
  it("gives each visitor a private world", async () => {
    const b = fresh();
    const a = await withSandbox("visitor-aaaa", async () => (await startDemo()).userId, b);
    await withSandbox("visitor-bbbb", async () => void (await startDemo()), b);

    // B's reset must not have touched A.
    const stillThere = await withSandbox("visitor-aaaa", async () => !!getStore().app.users[a], b);
    expect(stillThere).toBe(true);
    const otherHasIt = await withSandbox("visitor-bbbb", async () => !!getStore().app.users[a], b);
    expect(otherHasIt).toBe(false);
  });

  it("keeps changes between requests", async () => {
    const b = fresh();
    const rideId = (await bookDemoRide(b, "visitor-cccc")).rideId;
    const seen = await withSandbox("visitor-cccc", async () => (await services.rideView(rideId)).id, b);
    expect(seen).toBe(rideId);
  });

  it("falls back to one shared sandbox for missing or malformed ids", () => {
    expect(normalizeSandboxId(null)).toBe(DEFAULT_SANDBOX);
    expect(normalizeSandboxId("x")).toBe(DEFAULT_SANDBOX);
    expect(normalizeSandboxId("../../etc/passwd")).toBe(DEFAULT_SANDBOX);
    expect(normalizeSandboxId("visitor-1234")).toBe("visitor-1234");
  });
});

describe("concurrent requests", () => {
  it("files exactly one SL claim when several polls hit a finished ride at once", async () => {
    const b = fresh();
    const { rideId, bookingId } = await bookDemoRide(b, "visitor-race");
    // Finish the ride through the adapter so nothing files the claim before the polls race.
    await withSandbox("visitor-race", () => getAdapters().taxi.fastForward(bookingId, "completed"), b);
    const before = await claimCount(b, "visitor-race");

    await Promise.all(Array.from({ length: 6 }, () => withSandbox("visitor-race", () => services.rideView(rideId), b)));

    expect((await claimCount(b, "visitor-race")) - before).toBe(1);
  });

  it("loses no updates when requests write at the same time", async () => {
    const b = fresh();
    await withSandbox("visitor-writes", async () => undefined, b);
    const before = await withSandbox("visitor-writes", async () => Object.keys(getStore().app.users).length, b);

    await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        withSandbox(
          "visitor-writes",
          async () => {
            const id = newId("usr");
            // A delay makes the requests genuinely overlap.
            await new Promise((r) => setTimeout(r, 5));
            getStore().app.users[id] = { id, name: `Writer ${i}` } as never;
          },
          b,
        ),
      ),
    );

    const after = await withSandbox("visitor-writes", async () => Object.keys(getStore().app.users).length, b);
    expect(after - before).toBe(4);
  });

  it("discards everything a failed request did", async () => {
    const b = fresh();
    const before = await claimCount(b, "visitor-fail");
    await expect(
      withSandbox(
        "visitor-fail",
        async () => {
          getStore().app.users["ghost"] = { id: "ghost" } as never;
          throw new Error("boom");
        },
        b,
      ),
    ).rejects.toThrow("boom");
    expect(await withSandbox("visitor-fail", async () => "ghost" in getStore().app.users, b)).toBe(false);
    expect(await claimCount(b, "visitor-fail")).toBe(before);
  });
});

describe("stale sandboxes", () => {
  it("rebuilds a sandbox older than the TTL, so 'announced 12 min ago' stays true", async () => {
    const b = fresh();
    const { userId } = await bookDemoRide(b, "visitor-old");
    const snap = (await b.read("sandbox/visitor-old"))!;
    const aged = JSON.parse(snap.json);
    aged.seededAt = Date.now() - SANDBOX_TTL_MS - 1000;
    expect(await b.write("sandbox/visitor-old", JSON.stringify(aged), snap.version)).not.toBeNull();

    const survived = await withSandbox("visitor-old", async () => !!getStore().app.users[userId], b);
    expect(survived).toBe(false);
    const red = await withSandbox("visitor-old", async () => getStore().mock.disruptions["d-red-signal"], b);
    // Seeded as "announced 12 min ago" – measured from the re-seed, not from 12 hours ago.
    const ageMin = (Date.now() - new Date(red.announcedAt).getTime()) / 60_000;
    expect(ageMin).toBeGreaterThan(11.9);
    expect(ageMin).toBeLessThan(13);
  });
});

describe("backends", () => {
  it("memory: compare-and-swap semantics", async () => {
    const b = fresh();
    expect(await b.read("k")).toBeNull();
    const v1 = await b.write("k", "one", null);
    expect(v1).not.toBeNull();
    expect(await b.write("k", "dup", null)).toBeNull(); // must not exist yet
    expect(await b.write("k", "stale", "nope")).toBeNull(); // wrong version
    const v2 = await b.write("k", "two", v1);
    expect(v2).not.toBe(v1);
    expect((await b.read("k"))?.json).toBe("two");
  });

  it("netlify blobs: maps the version checks to onlyIfNew / onlyIfMatch", async () => {
    const calls: unknown[] = [];
    const store = {
      async getWithMetadata(key: string, opts: unknown) {
        calls.push(["get", key, opts]);
        return { data: "{}", etag: "abc", metadata: {} };
      },
      async set(key: string, data: string, opts: unknown) {
        calls.push(["set", key, opts]);
        const o = opts as { onlyIfMatch?: string };
        return o.onlyIfMatch === "stale" ? { modified: false } : { modified: true, etag: "def" };
      },
    };
    const b = createBlobsBackend(store as never);
    expect(await b.read("k")).toEqual({ json: "{}", version: "abc" });
    expect(await b.write("k", "x", null)).toBe("def");
    expect(await b.write("k", "x", "abc")).toBe("def");
    expect(await b.write("k", "x", "stale")).toBeNull();
    expect(calls).toContainEqual(["get", "k", { type: "text", consistency: "strong" }]);
    expect(calls).toContainEqual(["set", "k", { onlyIfNew: true }]);
    expect(calls).toContainEqual(["set", "k", { onlyIfMatch: "abc" }]);
  });

  it("auto: falls back to memory when Netlify Blobs isn't configured (local dev)", async () => {
    const b = getBackend();
    const v = await b.write("auto-test", "hello", null);
    expect(v).not.toBeNull();
    expect((await b.read("auto-test"))?.json).toBe("hello");
    expect(b.name).toBe("memory");
  });
});
