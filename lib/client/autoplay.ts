"use client";

import { api } from "./api";
import { useApp } from "./store";

type Router = { push: (href: string) => void };

let runId = 0;

export function stopAutoplay() {
  runId++;
}

/**
 * Autoplay: plays the whole story in the real app at a comfortable pace – start demo,
 * I'm stranded, verdict, quote, order, ride, receipt, claim approved and paid.
 */
export async function runAutoplay(router: Router) {
  const id = ++runId;
  const alive = () => id === runId;
  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => setTimeout(() => (alive() ? resolve() : reject(new Error("stopped"))), ms));
  const s = useApp.getState;

  try {
    const { userId } = await api.startDemo();
    s().resetFlow();
    s().setUserId(userId);
    s().setLocation("t-centralen");
    router.push("/app/home");
    await wait(3000);

    s().setDraft({ disruptionId: "d-red-signal", originPlaceId: "t-centralen", destinationPlaceId: "norsborg", ticketValid: true });
    s().setEligibility(null);
    router.push("/app/stranded");
    await wait(3000);

    router.push("/app/stranded/check");
    await wait(4000);

    router.push("/app/stranded/quote");
    await wait(4000);

    const { quote } = await api.quote({ userId, originPlaceId: "t-centralen", destinationPlaceId: "norsborg" });
    const ride = await api.bookRide({
      userId,
      quoteId: quote.id,
      disruptionId: "d-red-signal",
      originPlaceId: "t-centralen",
      destinationPlaceId: "norsborg",
      ticketValid: true,
      acceptExcess: false,
    });
    router.push(`/app/ride/${ride.id}`);
    await wait(9000);
    await api.admin.fastForward(ride.id, "inProgress");
    await wait(9000);
    await api.admin.fastForward(ride.id, "completed");
    await wait(5500); // the ride screen moves on to the receipt by itself

    const done = await api.ride(ride.id);
    if (!done.claimId) return;
    router.push(`/app/claims/${done.claimId}`);
    await wait(3500);
    await api.admin.setClaimStatus(done.claimId, "approved");
    await wait(3000);
    await api.admin.setClaimStatus(done.claimId, "paidOut");
  } catch {
    // Stopped or reset – nothing to clean up.
  }
}
