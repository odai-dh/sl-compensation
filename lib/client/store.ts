"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n/dictionaries";
import type { EligibilityResponse, QuoteResponse } from "@/lib/schemas";

export type Theme = "light" | "dark" | "system";

export type StrandedDraft = {
  disruptionId: string | null;
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  ticketValid: boolean;
};

/** Demo "current location" presets – a real app would use the GPS position. */
export const LOCATIONS = [
  { id: "t-centralen", lat: 59.3313, lng: 18.0598 },
  { id: "flemingsberg", lat: 59.2194, lng: 17.9466 },
  { id: "fridhemsplan", lat: 59.3322, lng: 18.0296 },
  { id: "knivsta", lat: 59.7249, lng: 17.788 },
] as const;

type AppState = {
  lang: Lang;
  theme: Theme;
  userId: string | null;
  locationId: (typeof LOCATIONS)[number]["id"];
  draft: StrandedDraft;
  eligibility: EligibilityResponse | null;
  quote: QuoteResponse | null;
  hydrated: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setUserId: (id: string | null) => void;
  setLocation: (id: AppState["locationId"]) => void;
  setDraft: (patch: Partial<StrandedDraft>) => void;
  setEligibility: (e: EligibilityResponse | null) => void;
  setQuote: (q: QuoteResponse | null) => void;
  resetFlow: () => void;
  signOut: () => void;
};

const emptyDraft: StrandedDraft = { disruptionId: null, originPlaceId: null, destinationPlaceId: null, ticketValid: true };

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      lang: "en",
      theme: "system",
      userId: null,
      locationId: "t-centralen",
      draft: emptyDraft,
      eligibility: null,
      quote: null,
      hydrated: false,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setUserId: (userId) => set({ userId }),
      setLocation: (locationId) => set({ locationId }),
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setEligibility: (eligibility) => set({ eligibility }),
      setQuote: (quote) => set({ quote }),
      resetFlow: () => set({ draft: emptyDraft, eligibility: null, quote: null }),
      signOut: () => set({ userId: null, draft: emptyDraft, eligibility: null, quote: null }),
    }),
    {
      name: "vidare",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lang, theme, userId, locationId, draft, eligibility }) => ({
        lang,
        theme,
        userId,
        locationId,
        draft,
        eligibility,
      }),
    },
  ),
);

// Mark local state as loaded (localStorage hydrates synchronously, so check both ways).
if (typeof window !== "undefined") {
  if (useApp.persist.hasHydrated()) useApp.setState({ hydrated: true });
  useApp.persist.onFinishHydration(() => useApp.setState({ hydrated: true }));
}

export function currentLocation(id: AppState["locationId"]) {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}
