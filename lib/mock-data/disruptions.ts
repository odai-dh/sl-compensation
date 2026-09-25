import type { Disruption } from "@/lib/core/types";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

type Template = Omit<Disruption, "announcedAt" | "active" | "id"> & { id: string; announcedAgoMs: number };

/**
 * Seed disruptions, modelled on the kind of messages in Trafiklab's SL Deviations API.
 * Two of them are deliberately NOT eligible (pre-announced, Uppsala-only).
 */
const SEED: Template[] = [
  {
    id: "d-red-signal",
    title: { en: "Red line: signal fault T-Centralen–Slussen", sv: "Röda linjen: signalfel T-Centralen–Slussen" },
    cause: { en: "Signal fault", sv: "Signalfel" },
    mode: "metro",
    lineName: "Red line (T13/T14)",
    affectedLines: ["13", "14"],
    affectedStops: ["T-Centralen", "Gamla stan", "Slussen"],
    position: { lat: 59.3231, lng: 18.0676 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 35,
    announcedAgoMs: 12 * MIN,
  },
  {
    id: "d-pendel-stopped",
    title: {
      en: "Commuter rail stopped Södertälje–Flemingsberg",
      sv: "Pendeltågen stoppade Södertälje–Flemingsberg",
    },
    cause: { en: "Overhead line damage", sv: "Skadad kontaktledning" },
    mode: "commuterRail",
    lineName: "Commuter rail (40/43)",
    affectedLines: ["40", "43"],
    affectedStops: ["Södertälje centrum", "Tumba", "Huddinge station", "Flemingsberg"],
    position: { lat: 59.2194, lng: 17.9466 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 70,
    announcedAgoMs: 25 * MIN,
  },
  {
    id: "d-bus4-cancelled",
    title: { en: "Bus 4 cancelled", sv: "Buss 4 inställd" },
    cause: { en: "Driver shortage", sv: "Förarbrist" },
    mode: "bus",
    lineName: "Bus 4",
    affectedLines: ["4"],
    affectedStops: ["Odenplan", "Fridhemsplan", "Hornstull", "Gullmarsplan"],
    position: { lat: 59.3322, lng: 18.0296 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 25,
    announcedAgoMs: 5 * MIN,
  },
  {
    id: "d-green-trackwork",
    title: {
      en: "Green line: planned track work Gullmarsplan–Skarpnäck",
      sv: "Gröna linjen: planerat banarbete Gullmarsplan–Skarpnäck",
    },
    cause: { en: "Planned track work", sv: "Planerat banarbete" },
    mode: "metro",
    lineName: "Green line (T17)",
    affectedLines: ["17"],
    affectedStops: ["Gullmarsplan", "Skarpnäck"],
    position: { lat: 59.2991, lng: 18.0808 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 30,
    announcedAgoMs: 4 * DAY,
  },
  {
    id: "d-uppsala-knivsta",
    title: { en: "Commuter rail delays Knivsta–Uppsala C", sv: "Pendeltåg försenade Knivsta–Uppsala C" },
    cause: { en: "Points failure", sv: "Växelfel" },
    mode: "commuterRail",
    lineName: "Commuter rail (41)",
    affectedLines: ["41"],
    affectedStops: ["Knivsta", "Uppsala C"],
    position: { lat: 59.7249, lng: 17.788 },
    county: "Uppsala",
    operator: "SL",
    expectedDelayMinutes: 45,
    announcedAgoMs: 15 * MIN,
  },
];

/** Templates the demo admin can "trigger". */
export const DISRUPTION_TEMPLATES: Template[] = [
  {
    id: "tpl-blue-power",
    title: { en: "Blue line: power failure T-Centralen–Kista", sv: "Blå linjen: strömavbrott T-Centralen–Kista" },
    cause: { en: "Power failure", sv: "Strömavbrott" },
    mode: "metro",
    lineName: "Blue line (T11)",
    affectedLines: ["11"],
    affectedStops: ["T-Centralen", "Fridhemsplan", "Solna centrum", "Kista"],
    position: { lat: 59.3588, lng: 17.999 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 45,
    announcedAgoMs: 0,
  },
  {
    id: "tpl-red-train-fault",
    title: { en: "Red line: broken-down train at Liljeholmen", sv: "Röda linjen: tåg med fel vid Liljeholmen" },
    cause: { en: "Train fault", sv: "Fel på tåg" },
    mode: "metro",
    lineName: "Red line (T13/T14)",
    affectedLines: ["13", "14"],
    affectedStops: ["Slussen", "Hornstull", "Liljeholmen", "Fruängen", "Norsborg"],
    position: { lat: 59.3106, lng: 18.023 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 25,
    announcedAgoMs: 0,
  },
  {
    id: "tpl-pendel-arlanda",
    title: { en: "Commuter rail: no trains Solna–Märsta", sv: "Pendeltåg: inga tåg Solna–Märsta" },
    cause: { en: "Person on the track", sv: "Obehörig i spårområdet" },
    mode: "commuterRail",
    lineName: "Commuter rail (41/42X)",
    affectedLines: ["41", "42X"],
    affectedStops: ["Solna centrum", "Märsta"],
    position: { lat: 59.6276, lng: 17.8606 },
    county: "Stockholm",
    operator: "SL",
    expectedDelayMinutes: 60,
    announcedAgoMs: 0,
  },
];

export function materialize(t: Template, now: number, idSuffix = ""): Disruption {
  const { announcedAgoMs, ...rest } = t;
  return {
    ...rest,
    id: t.id + idSuffix,
    announcedAt: new Date(now - announcedAgoMs).toISOString(),
    active: true,
  };
}

export function seedDisruptions(now: number): Disruption[] {
  return SEED.map((t) => materialize(t, now));
}
