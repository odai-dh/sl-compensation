/**
 * The elevated train as a tiny simulation, shared by the 3D scene and the illustrated fallback.
 * The story only sets a goal – keep running, or stop at the red signal – and trains always drive
 * forwards towards it. So whichever way or however fast you scroll, a train never reverses or jumps
 * while you can see it: one that is already past the stop drives on, and the next one pulls in behind it.
 * Trains only appear, skip ahead or go away where the renderer says they can't be seen.
 * Positions are the train's front, in metres along the track.
 */
import { TRAIN_STOP_X } from "./story";

export const CARRIAGES = 4;
export const CAR_LEN = 11.5;
export const CAR_GAP = 0.6;
export const TRAIN_LENGTH = CARRIAGES * (CAR_LEN + CAR_GAP);

export const CRUISE_SPEED = 9;
/** Trains only leave (or a lone one comes round again) once they are past this and out of sight… */
export const FAR_X = 60;
/** …and at the latest at the end of the track. */
export const TRACK_END_X = 260;
/** A lone train comes round again from here. */
export const RESTART_X = -130;
/** A train that is going to stop comes in from here (or further back, if this is in view)… */
export const ENTRY_X = -55;
/** …at this speed (m/s), and brakes onto the stop. */
const ENTRY_SPEED = 12;
const DEPART_SPEED = 13;
/** m/s² */
const ACCEL = 1.5;
const BRAKE = 3;
/** Metres between one train's tail and the next one's front. */
const SPACING = 10;
export const MAX_TRAINS = 3;
/** With reduced motion nothing moves: the train simply stands here, or at the stop. */
const REDUCED_RUN_X = -40;
/** A long frame (the tab was in the background) must not teleport anything. */
const MAX_DT = 0.1;

export type TrainState = { id: number; x: number; v: number };
export type TrainGoal = "run" | "stop";
/** Whether a train with its front at x can't be seen right now (off screen, or lost in the fog). */
export type HiddenAt = (x: number) => boolean;
export type TrainView = { hidden: HiddenAt; reducedMotion: boolean };

export const trainGoal = (trainStop: number): TrainGoal => (trainStop > 0 ? "stop" : "run");

export function initialTrains(goal: TrainGoal, reducedMotion = false): TrainState[] {
  if (goal === "stop") return [{ id: 1, x: TRAIN_STOP_X, v: 0 }];
  // Just out of view, so the first train rolls in soon after the page opens.
  return [reducedMotion ? { id: 1, x: REDUCED_RUN_X, v: 0 } : { id: 1, x: -75, v: CRUISE_SPEED }];
}

export function stepTrains(trains: TrainState[], goal: TrainGoal, dt: number, view: TrainView): TrainState[] {
  if (view.reducedMotion) return [{ id: trains[0]?.id ?? 1, x: goal === "stop" ? TRAIN_STOP_X : REDUCED_RUN_X, v: 0 }];
  const frontFirst = [...trains].sort((a, b) => b.x - a.x);
  const step = Math.min(dt, MAX_DT);
  return goal === "stop" ? stepStop(frontFirst, step, view.hidden) : stepRun(frontFirst, step, view.hidden);
}

const gone = (t: TrainState, hidden: HiddenAt) => t.x > TRACK_END_X || (t.x > FAR_X && hidden(t.x));

function stepRun(trains: TrainState[], dt: number, hidden: HiddenAt): TrainState[] {
  if (!trains.length) return [{ id: 1, x: RESTART_X, v: CRUISE_SPEED }];
  const out: TrainState[] = [];
  for (const t of trains) {
    // Pull away from a stop (or ease off after a fast departure) towards cruising speed.
    const v = t.v < CRUISE_SPEED ? Math.min(CRUISE_SPEED, t.v + ACCEL * dt) : Math.max(CRUISE_SPEED, t.v - ACCEL * dt);
    out.push(follow({ id: t.id, x: t.x + v * dt, v }, t.x, out.at(-1)));
  }
  const staying = out.filter((t) => !gone(t, hidden));
  if (staying.length) return staying;
  // The last train has driven out of sight: it comes round again.
  const last = out[out.length - 1];
  return [{ ...last, x: RESTART_X }];
}

function stepStop(trains: TrainState[], dt: number, hidden: HiddenAt): TrainState[] {
  const past = trains.filter((t) => t.x > TRAIN_STOP_X + 0.5);
  const [waiting, ...queued] = trains.filter((t) => t.x <= TRAIN_STOP_X + 0.5);

  // Already past the signal: drive on and leave.
  const out: TrainState[] = [];
  for (const t of past) {
    const v = t.v < DEPART_SPEED ? Math.min(DEPART_SPEED, t.v + ACCEL * dt) : t.v;
    const next = follow({ id: t.id, x: t.x + v * dt, v }, t.x, out.at(-1));
    if (!gone(next, hidden)) out.push(next);
  }

  const ahead = out.at(-1);
  // The entry point: behind any train still on its way out, and out of sight.
  let entry = Math.min(ENTRY_X, ahead ? ahead.x - TRAIN_LENGTH - SPACING : Infinity);
  while (entry > RESTART_X && !hidden(entry)) entry -= 5;

  let stopper = waiting;
  if (!stopper) {
    // Nobody left to stop at the signal: the next train comes in.
    if (out.length >= MAX_TRAINS) return out;
    stopper = { id: Math.max(0, ...trains.map((t) => t.id)) + 1, x: entry, v: ENTRY_SPEED };
  } else if (stopper.x < entry && hidden(stopper.x)) {
    // Still far back and out of sight: skip ahead rather than keep everyone waiting.
    stopper = { ...stopper, x: entry, v: Math.max(stopper.v, ENTRY_SPEED) };
  }

  out.push(follow(brakeTo(stopper, TRAIN_STOP_X, dt), stopper.x, ahead));

  // Any trains further back: out of sight they're dropped, otherwise they pull up behind.
  for (const t of queued) {
    if (hidden(t.x)) continue;
    out.push(brakeTo(t, out[out.length - 1].x - TRAIN_LENGTH - SPACING, dt));
  }
  return out;
}

/** Drives on towards stopX and brakes to rest exactly there. */
function brakeTo(t: TrainState, stopX: number, dt: number): TrainState {
  let { x, v } = t;
  const d = stopX - x;
  if (d > 0) {
    // The fastest speed that still stops in time with normal braking.
    const vBrake = Math.sqrt(2 * BRAKE * d);
    v = v > vBrake ? Math.max(0, v - ((v * v) / (2 * d)) * dt) : Math.min(v + ACCEL * dt, vBrake, Math.max(v, CRUISE_SPEED));
    x += v * dt;
  }
  // Arrived: the last frame of braking lands exactly on the spot (a train already a hair past it stays put).
  if (x >= stopX) {
    x = Math.max(t.x, stopX);
    v = 0;
  }
  return { id: t.id, x, v };
}

/** Keeps a train behind the one ahead of it – without ever moving it backwards. */
function follow(t: TrainState, prevX: number, ahead: TrainState | undefined): TrainState {
  if (!ahead) return t;
  const limit = ahead.x - TRAIN_LENGTH - SPACING;
  return t.x > limit ? { id: t.id, x: Math.max(prevX, limit), v: Math.min(t.v, ahead.v) } : t;
}
