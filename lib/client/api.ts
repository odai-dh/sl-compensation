"use client";

import type {
  AdminState,
  ApiResponse,
  BankIdPollView,
  ClaimView,
  DisruptionView,
  EligibilityResponse,
  LedgerSummary,
  Place,
  QuoteResponse,
  RideView,
  UserView,
} from "@/lib/schemas";
import { observeApi } from "./embed";
import { getSandboxId } from "./sandbox";
import { useApp } from "./store";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const method = init?.method ?? (init?.body ? "POST" : "GET");
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        "x-vidare-sandbox": getSandboxId(),
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK", "Network error", 0);
  }
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) throw new ApiError("BAD_RESPONSE", "Unexpected response", res.status);
  if (!json.ok) {
    // The demo world was rebuilt (or reset elsewhere) while this screen was open: start over cleanly.
    if (json.error.code === "USER_NOT_FOUND") useApp.getState().signOut();
    throw new ApiError(json.error.code, json.error.message, res.status, json.error.details);
  }
  observeApi(method, path, json.data);
  return json.data;
}

type Order = { orderRef: string; autoStartToken: string };

/** Typed client for the Vidare API. The iOS app will talk to the same endpoints. */
export const api = {
  places: (q = "") => call<Place[]>(`/places?q=${encodeURIComponent(q)}`),
  disruptions: (near?: { lat: number; lng: number }) =>
    call<DisruptionView[]>(`/disruptions${near ? `?lat=${near.lat}&lng=${near.lng}` : ""}`),

  startAuth: () => call<Order>("/bankid/auth", { method: "POST" }),
  pollAuth: (orderRef: string) => call<BankIdPollView>(`/bankid/${orderRef}`),
  cancelBankId: (orderRef: string) => call<BankIdPollView>(`/bankid/${orderRef}/cancel`, { method: "POST" }),

  user: (userId: string) => call<UserView>(`/users/${userId}`),
  updateProfile: (
    userId: string,
    patch: { ticket?: { type: string; priceCategory: string }; homePlaceId?: string | null; workPlaceId?: string | null },
  ) => call<UserView>(`/users/${userId}`, { method: "PATCH", body: patch }),
  addCard: (userId: string, card: { number: string; expMonth: number; expYear: number; cvc: string }) =>
    call<UserView>(`/users/${userId}/card`, { body: card }),
  startFullmaktSign: (userId: string, lang: "en" | "sv") => call<Order>(`/users/${userId}/fullmakt`, { body: { lang } }),
  pollFullmaktSign: (userId: string, orderRef: string) => call<BankIdPollView>(`/users/${userId}/fullmakt/${orderRef}`),
  revokeFullmakt: (userId: string) => call<UserView>(`/users/${userId}/fullmakt`, { method: "DELETE" }),
  rides: (userId: string) => call<RideView[]>(`/users/${userId}/rides`),
  claims: (userId: string) => call<ClaimView[]>(`/users/${userId}/claims`),

  eligibility: (body: {
    userId: string;
    disruptionId: string | null;
    originPlaceId: string;
    destinationPlaceId: string;
    ticketValid: boolean;
    preferredRoute?: "taxi" | "ticketRefund";
  }) => call<EligibilityResponse>("/eligibility", { body }),
  quote: (body: { userId: string; originPlaceId: string; destinationPlaceId: string }) =>
    call<QuoteResponse>("/taxi/quote", { body }),
  bookRide: (body: {
    userId: string;
    quoteId: string;
    disruptionId: string;
    originPlaceId: string;
    destinationPlaceId: string;
    ticketValid: boolean;
    acceptExcess: boolean;
  }) => call<RideView>("/rides", { body }),
  ride: (rideId: string) => call<RideView>(`/rides/${rideId}`),
  claim: (claimId: string) => call<ClaimView>(`/claims/${claimId}`),
  requestReconsideration: (claimId: string, userId: string) =>
    call<ClaimView>(`/claims/${claimId}/reconsideration`, { body: { userId } }),
  ledger: () => call<LedgerSummary>("/ledger"),

  admin: {
    state: () => call<AdminState>("/admin"),
    triggerDisruption: (templateId: string, expectedDelayMinutes?: number) =>
      call("/admin/disruptions", { body: { templateId, expectedDelayMinutes } }),
    setDisruptionActive: (id: string, active: boolean) =>
      call(`/admin/disruptions/${id}`, { method: "PATCH", body: { active } }),
    setClaimStatus: (claimId: string, status: string, rejectionReason?: "userFault" | "other") =>
      call<ClaimView>(`/admin/claims/${claimId}/status`, { body: { status, rejectionReason } }),
    setTaxiAvailability: (available: boolean) => call("/admin/taxi", { body: { available } }),
    fastForward: (rideId: string, to: "arriving" | "inProgress" | "completed") =>
      call<RideView>(`/admin/rides/${rideId}/fast-forward`, { body: { to } }),
    reset: () => call("/admin/reset", { method: "POST" }),
  },
  startDemo: () => call<{ userId: string }>("/demo/start", { method: "POST" }),
};
