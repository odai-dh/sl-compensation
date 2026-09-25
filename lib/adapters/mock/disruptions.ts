import type { NewDisruption, SLDisruptionAdapter } from "@/lib/adapters/types";
import type { Disruption } from "@/lib/core/types";
import type { MockState } from "@/lib/server/store";

type Deps = { state: () => MockState; now: () => number; id: (prefix: string) => string };

export function createMockDisruptionAdapter({ state, now, id }: Deps): SLDisruptionAdapter {
  const all = () => Object.values(state().disruptions);
  return {
    async getActiveDisruptions() {
      return all()
        .filter((d) => d.active)
        .sort((a, b) => b.announcedAt.localeCompare(a.announcedAt));
    },
    async getDisruption(disruptionId) {
      return state().disruptions[disruptionId] ?? null;
    },
    async getDisruptionForTrip({ line, stop }) {
      const candidates = all().filter((d) => d.active && d.affectedLines.includes(line));
      if (stop) {
        const onStretch = candidates.find((d) => d.affectedStops.includes(stop));
        if (onStretch) return onStretch;
      }
      return candidates[0] ?? null;
    },
    async createDisruption(input: NewDisruption) {
      const d: Disruption = {
        ...input,
        id: id("dis"),
        announcedAt: input.announcedAt ?? new Date(now()).toISOString(),
        active: true,
      };
      state().disruptions[d.id] = d;
      return d;
    },
    async setActive(disruptionId, active) {
      const d = state().disruptions[disruptionId];
      if (!d) return null;
      d.active = active;
      return d;
    },
  };
}
