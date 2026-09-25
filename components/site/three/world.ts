import * as THREE from "three";

/** World layout (metres). The elevated track runs along x; the street runs parallel in front of it. */
export const TRACK_Y = 7;
export const TRACK_Z = 0;
export const STREET_Z = 12;
export const STREET_WIDTH = 12;
export const LANE_Z = 14.5;
export const LAMP_Z = 19.5;
export const LAMP_SPACING = 18;
export const SIGNAL_X = 9;
export const PICKUP = new THREE.Vector3(0, 0, LANE_Z);

export const COLORS = {
  night: "#070b14",
  amber: "#ffb020",
  sodium: "#ffb45a",
  signalRed: "#ff3b3b",
  signalGreen: "#38e08a",
  wall: "#1a2233",
  window: "#ffc774",
  taxi: "#ffc21a",
  trainBody: "#aeb8c6",
};

/** The taxi's street path: in from the far left, pickup under a streetlight, off round the corner. */
export const TAXI_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-120, 0, LANE_Z),
    new THREE.Vector3(-60, 0, LANE_Z),
    PICKUP.clone(),
    new THREE.Vector3(38, 0, LANE_Z),
    new THREE.Vector3(56, 0, LANE_Z + 3),
    new THREE.Vector3(64, 0, LANE_Z + 14),
    new THREE.Vector3(66, 0, 90),
  ],
  false,
  "centripetal",
);

/** Arc-length parameter of the pickup point on TAXI_PATH. */
export const PICKUP_U = (() => {
  let best = 0;
  let bestD = Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i <= 1000; i++) {
    TAXI_PATH.getPointAt(i / 1000, p);
    const d = p.distanceToSquared(PICKUP);
    if (d < bestD) {
      bestD = d;
      best = i / 1000;
    }
  }
  return best;
})();

export type Station = { pos: [number, number, number]; target: [number, number, number] };

/** Camera stations, one per story section (ch1–ch5, try, final). */
export const STATIONS_DESKTOP: Station[] = [
  { pos: [-40, 12, 36], target: [-6, 7.5, 0] },
  { pos: [8, 13, 32], target: [-3, 8, 0] },
  { pos: [18, 58, 96], target: [0, 4, -24] },
  { pos: [-7, 5, 34], target: [4, 2.5, 14] },
  { pos: [34, 30, 64], target: [8, 4, 0] },
  { pos: [-4, 11, 46], target: [2, 3, 12] },
  { pos: [0, 95, 150], target: [0, 0, -40] },
];

/** Mobile: a simpler, further-back path that keeps the subject in a portrait frame. */
export const STATIONS_MOBILE: Station[] = [
  { pos: [-30, 16, 52], target: [-4, 8, 0] },
  { pos: [4, 16, 40], target: [-8, 7, 0] },
  { pos: [10, 70, 120], target: [0, 4, -20] },
  { pos: [-4, 9, 46], target: [2, 2, 12] },
  { pos: [20, 40, 90], target: [4, 4, 0] },
  { pos: [-10, 20, 70], target: [4, 4, 6] },
  { pos: [0, 110, 170], target: [0, 0, -40] },
];
