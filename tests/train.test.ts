import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/site/rng";
import { TRAIN_STOP_X } from "@/lib/site/story";
import {
  CRUISE_SPEED,
  initialTrains,
  MAX_TRAINS,
  RESTART_X,
  stepTrains,
  TRACK_END_X,
  TRAIN_LENGTH,
  type TrainGoal,
  type TrainState,
  type TrainView,
} from "@/lib/site/train";

const DT = 1 / 60;
/** A camera that sees the track from x = -45 to x = 150 (a train is hidden once none of it is in that range). */
const view: TrainView = { reducedMotion: false, hidden: (x) => x < -45 || x - TRAIN_LENGTH > 150 };

/** Steps the simulation, checking every frame that trains only ever drive forwards. */
function run(start: TrainState[], goal: TrainGoal, seconds: number, v: TrainView = view) {
  let trains = start;
  for (let f = 0; f < seconds / DT; f++) {
    const next = stepTrains(trains, goal, DT, v);
    expectSane(trains, next, v);
    trains = next;
  }
  return trains;
}

function expectSane(prev: TrainState[], next: TrainState[], { hidden }: TrainView) {
  expect(next.length).toBeGreaterThan(0);
  expect(next.length).toBeLessThanOrEqual(MAX_TRAINS);
  for (const t of next) {
    const before = prev.find((p) => p.id === t.id);
    // Trains only appear out of sight.
    if (!before) {
      expect(hidden(t.x - t.v * DT)).toBe(true);
      continue;
    }
    // Driving forwards, one frame at a time (give or take a speed change within the frame)…
    const jumped = t.x < before.x || t.x - before.x > (Math.max(t.v, before.v) + 1) * DT;
    // …except when a train that has driven out of sight (or off the end of the track) skips ahead or comes
    // round again, to somewhere out of sight.
    if (jumped) expect([outOfSight(before, hidden), hidden(t.x - t.v * DT)]).toEqual([true, true]);
  }
  // Trains only go away once they've driven out of sight.
  for (const t of prev) if (!next.some((n) => n.id === t.id)) expect(outOfSight(t, hidden)).toBe(true);
  // Never two trains in the same place.
  const byFront = [...next].sort((a, b) => b.x - a.x);
  for (let i = 1; i < byFront.length; i++) expect(byFront[i].x).toBeLessThanOrEqual(byFront[i - 1].x - TRAIN_LENGTH);
}

/** Out of sight, or off the end of the track, wherever the train got to this frame. */
function outOfSight(t: TrainState, hidden: TrainView["hidden"]) {
  const reached = t.x + (t.v + 1) * DT;
  return [t.x, reached].some((x) => hidden(x) || x > TRACK_END_X);
}

describe("train simulation", () => {
  it("cruises forwards and comes round again once out of sight", () => {
    let trains = initialTrains("run");
    let wrapped = false;
    for (let s = 0; s < 60; s++) {
      const next = run(trains, "run", 1);
      if (next[0].x < trains[0].x) wrapped = true;
      trains = next;
    }
    expect(wrapped).toBe(true);
    expect(trains).toHaveLength(1);
    expect(trains[0].v).toBe(CRUISE_SPEED);
  });

  it("keeps a train that is still in sight until the end of the track", () => {
    const wide: TrainView = { reducedMotion: false, hidden: (x) => x < RESTART_X + 1 };
    expect(run([{ id: 1, x: 100, v: CRUISE_SPEED }], "run", 15, wide)[0].x).toBeGreaterThan(200);
    expect(run([{ id: 1, x: TRACK_END_X - 5, v: CRUISE_SPEED }], "run", 1, wide)[0].x).toBeLessThan(RESTART_X + CRUISE_SPEED);
  });

  it("brakes onto the stop without passing it", () => {
    const trains = run([{ id: 1, x: -30, v: CRUISE_SPEED }], "stop", 10);
    expect(trains).toEqual([{ id: 1, x: TRAIN_STOP_X, v: 0 }]);
  });

  it("brings a train in from out of sight quickly when the last one is far back", () => {
    const trains = run([{ id: 1, x: -120, v: CRUISE_SPEED }], "stop", 8);
    expect(trains).toEqual([{ id: 1, x: TRAIN_STOP_X, v: 0 }]);
  });

  it("lets a train that is already past the signal drive on while the next one pulls in", () => {
    let trains = run([{ id: 1, x: 20, v: CRUISE_SPEED }], "stop", 2);
    expect(trains.map((t) => t.id).sort()).toEqual([1, 2]);
    trains = run(trains, "stop", 25);
    expect(trains).toEqual([{ id: 2, x: TRAIN_STOP_X, v: 0 }]);
  });

  it("pulls away gently when the story lets the train run again", () => {
    const [stopped] = run(initialTrains("stop"), "stop", 1);
    const [moving] = stepTrains([stopped], "run", DT, view);
    expect(moving.v).toBeLessThan(0.1);
    expect(run([stopped], "run", 10)[0].v).toBe(CRUISE_SPEED);
  });

  it("never reverses, jumps in sight or overlaps, however the goal flips", () => {
    const rng = mulberry32(42);
    let trains = initialTrains("run");
    for (let i = 0; i < 200; i++) {
      const goal: TrainGoal = rng() < 0.5 ? "run" : "stop";
      trains = run(trains, goal, 0.1 + rng() * 4);
    }
  });

  it("survives a long frame after the tab was in the background", () => {
    const [t] = stepTrains([{ id: 1, x: -30, v: CRUISE_SPEED }], "run", 30, view);
    expect(t.x).toBeLessThan(-28);
  });

  it("stands still with reduced motion", () => {
    const reduced = { ...view, reducedMotion: true };
    expect(stepTrains(initialTrains("run", true), "stop", DT, reduced)).toEqual([{ id: 1, x: TRAIN_STOP_X, v: 0 }]);
  });
});
