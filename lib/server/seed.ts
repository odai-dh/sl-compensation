import "server-only";
import { getAdapters } from "@/lib/adapters";
import { TEST_CARDS } from "@/lib/adapters/mock/payments";
import { demoHash } from "@/lib/adapters/mock/bankid";
import type { ClaimStatus } from "@/lib/core/claim-machine";
import type { RejectionReason } from "@/lib/core/policy";
import type { Disruption } from "@/lib/core/types";
import { FULLMAKT_VERSION, fullmaktPlainText } from "@/lib/i18n/fullmakt";
import { seedDisruptions } from "@/lib/mock-data/disruptions";
import { DEMO_PERSON, SEED_PEOPLE } from "@/lib/mock-data/people";
import * as services from "./services";
import { emptyStore, getStore, newId, now, nowIso, replaceStore, type User } from "./store";

const DAY = 24 * 60 * 60 * 1000;
const g = globalThis as unknown as { __vidareSeed?: Promise<void> };

/** Awaited by every route handler: seeds the in-memory store once per server boot. */
export function ensureSeeded(): Promise<void> {
  g.__vidareSeed ??= seedAll();
  return g.__vidareSeed;
}

export async function resetDemo(): Promise<void> {
  replaceStore(emptyStore());
  g.__vidareSeed = seedAll();
  await g.__vidareSeed;
}

/** One click: a fresh store with a fully onboarded user stranded near the Red line. */
export async function startDemo(): Promise<{ userId: string }> {
  await resetDemo();
  const user = await createOnboardedUser(DEMO_PERSON, { home: "norsborg", work: "kth", ticket: "30d" });
  await pastRide({
    userId: user.id,
    daysAgo: 16,
    disruption: {
      title: { en: "Red line: points failure at Liljeholmen", sv: "Röda linjen: växelfel vid Liljeholmen" },
      mode: "metro",
      lines: ["13"],
      stops: ["Slussen", "Liljeholmen", "Norsborg"],
    },
    originId: "slussen",
    destinationId: "norsborg",
    finalStatus: "paidOut",
  });
  return { userId: user.id };
}

async function seedAll(): Promise<void> {
  const store = getStore();
  for (const d of seedDisruptions(now())) store.mock.disruptions[d.id] = d;

  // Background history so the admin and ledger views are not empty.
  const [p1, p2] = SEED_PEOPLE;
  const u1 = await createOnboardedUser(p1, { home: "skarpnack", work: "kista", ticket: "month" });
  const u2 = await createOnboardedUser(p2, { home: "solna", work: "t-centralen", ticket: "reskassa" });
  await pastRide({
    userId: u1.id,
    daysAgo: 9,
    disruption: {
      title: { en: "Green line: signal fault Gullmarsplan", sv: "Gröna linjen: signalfel Gullmarsplan" },
      mode: "metro",
      lines: ["17"],
      stops: ["Gullmarsplan", "Skarpnäck"],
    },
    originId: "gullmarsplan",
    destinationId: "kista",
    finalStatus: "paidOut",
  });
  await pastRide({
    userId: u1.id,
    daysAgo: 2,
    disruption: {
      title: { en: "Commuter rail: points failure Karlberg", sv: "Pendeltåg: växelfel Karlberg" },
      mode: "commuterRail",
      lines: ["40"],
      stops: ["Solna centrum", "Stockholm Södra"],
    },
    originId: "solna",
    destinationId: "skarpnack",
    finalStatus: "underReview",
  });
  await pastRide({
    userId: u2.id,
    daysAgo: 20,
    disruption: {
      title: { en: "Bus 4: road closed", sv: "Buss 4: avstängd väg" },
      mode: "bus",
      lines: ["4"],
      stops: ["Odenplan", "Gullmarsplan"],
    },
    originId: "odenplan",
    destinationId: "solna",
    finalStatus: "rejected",
    rejectionReason: "other",
  });
}

async function createOnboardedUser(
  person: { name: string; personnummer: string; address: string; id?: string },
  opts: { home: string; work: string; ticket: NonNullable<User["ticket"]>["type"] },
): Promise<User> {
  const at = nowIso();
  const doc = fullmaktPlainText("sv");
  const user: User = {
    id: person.id ?? newId("usr"),
    name: person.name,
    personnummer: person.personnummer,
    address: person.address,
    identityVerifiedAt: at,
    fullmakt: {
      id: newId("fm"),
      version: FULLMAKT_VERSION,
      signedAt: at,
      documentHash: demoHash(doc.title + "\n" + doc.text),
      signature: `MOCKSIG-${demoHash(person.personnummer + at)}`,
      revokedAt: null,
    },
    ticket: { type: opts.ticket, priceCategory: "adult", registeredAt: at },
    homePlaceId: opts.home,
    workPlaceId: opts.work,
    ownsTaxiCompany: false,
    createdAt: at,
  };
  getStore().app.users[user.id] = user;
  await getAdapters().payments.addCard(user.id, { number: TEST_CARDS.ok, expMonth: 12, expYear: 2030, cvc: "123" });
  return user;
}

/** Runs a full ride + claim in the past by shifting the server clock. */
async function pastRide(args: {
  userId: string;
  daysAgo: number;
  disruption: { title: Disruption["title"]; mode: Disruption["mode"]; lines: string[]; stops: string[] };
  originId: string;
  destinationId: string;
  finalStatus: ClaimStatus;
  rejectionReason?: RejectionReason;
}) {
  const store = getStore();
  const { disruptions } = getAdapters();
  store.timeOffsetMs = -args.daysAgo * DAY;
  try {
    const d = await disruptions.createDisruption({
      title: args.disruption.title,
      cause: args.disruption.title,
      mode: args.disruption.mode,
      lineName: `Line ${args.disruption.lines.join("/")}`,
      affectedLines: args.disruption.lines,
      affectedStops: args.disruption.stops,
      position: { lat: 59.33, lng: 18.06 },
      county: "Stockholm",
      operator: "SL",
      expectedDelayMinutes: 40,
    });
    const common = {
      userId: args.userId,
      disruptionId: d.id,
      originPlaceId: args.originId,
      destinationPlaceId: args.destinationId,
      ticketValid: true,
    };
    const { quote } = await services.quote(args.originId, args.destinationId);
    const ride = await services.bookRide({ ...common, quoteId: quote.id, acceptExcess: true });
    await services.fastForwardRide(ride.id, "completed");
    const done = await services.rideView(ride.id);
    if (done.claimId && args.finalStatus !== "submitted") {
      store.timeOffsetMs = -(args.daysAgo - 1) * DAY;
      await services.setClaimStatus(done.claimId, "underReview");
      if (args.finalStatus !== "underReview") {
        store.timeOffsetMs = -Math.max(0, args.daysAgo - 5) * DAY;
        const decision = args.finalStatus === "rejected" ? "rejected" : "approved";
        await services.setClaimStatus(done.claimId, decision, { rejectionReason: args.rejectionReason });
        if (args.finalStatus === "paidOut") {
          store.timeOffsetMs = -Math.max(0, args.daysAgo - 7) * DAY;
          await services.setClaimStatus(done.claimId, "paidOut");
        }
      }
    }
    await disruptions.setActive(d.id, false);
  } finally {
    store.timeOffsetMs = 0;
  }
}
