"use client";

import { useMemo } from "react";
import { mulberry32 } from "@/lib/site/rng";
import { useSite } from "@/lib/site/store";
import { TRY_STATION } from "@/lib/site/story";
import { cn } from "@/lib/utils";

const W = 1600;
const H = 900;
const TRACK_Y = 520;
const STREET_Y = 700;

type Block = { x: number; w: number; h: number; windows: { x: number; y: number; lit: boolean }[] };

function skyline(seed: number, baseY: number, minH: number, maxH: number, step: number): Block[] {
  const rng = mulberry32(seed);
  const out: Block[] = [];
  for (let x = -40; x < W + 40; x += step * (0.7 + rng() * 0.6)) {
    const w = step * (0.6 + rng() * 0.5);
    const h = minH + rng() * (maxH - minH);
    const windows = [];
    for (let wy = baseY - h + 14; wy < baseY - 18; wy += 22) {
      for (let wx = x + 8; wx < x + w - 10; wx += 16) windows.push({ x: wx, y: wy, lit: rng() > 0.55 });
    }
    out.push({ x, w, h, windows });
  }
  return out;
}

/**
 * Illustrated version of each chapter, used when WebGL isn't available or the device is too slow.
 * Chapters crossfade; nothing moves when reduced motion is on.
 */
export function StaticScene() {
  const chapter = useSite((s) => s.currentChapter);
  const tod = useSite((s) => s.timeOfDay);
  const demo = useSite((s) => s.demo);
  const far = useMemo(() => skyline(3, TRACK_Y - 40, 120, 330, 90), []);
  const near = useMemo(() => skyline(11, STREET_Y - 40, 60, 170, 120), []);

  const stopped = chapter >= 1 && !(chapter === TRY_STATION && !demo.disruption) && chapter !== 6;
  const signalRed = chapter === TRY_STATION ? demo.disruption : chapter >= 1 && chapter < TRY_STATION;
  const taxi = chapter === 3 || (chapter === TRY_STATION && demo.taxiOrdered && !demo.rideDone);
  const taxiX = chapter === 3 ? 760 : 200 + demo.rideProgress * 1100;
  const rain = chapter === 1 ? 0.5 : 0.22;
  const top = tod > 0.5 ? "#03050b" : "#121b38";
  const horizon = tod > 0.5 ? "#161a2a" : "#4d3445";

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b14]">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="size-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={horizon} />
          </linearGradient>
          <radialGradient id="lamp" cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#ffb45a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="amberGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffb020" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffb020" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#sky)" />
        <g fill="#141b2a">
          {far.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={TRACK_Y - 40 - b.h} width={b.w} height={b.h} />
              {b.windows.map((w, j) => w.lit && <rect key={j} x={w.x} y={w.y} width={7} height={10} fill="#ffc774" opacity={0.85} />)}
            </g>
          ))}
        </g>
        {/* Track */}
        <rect x={0} y={TRACK_Y} width={W} height={16} fill="#2a3244" />
        {Array.from({ length: 17 }, (_, i) => (
          <rect key={i} x={i * 100} y={TRACK_Y + 16} width={14} height={STREET_Y - TRACK_Y - 30} fill="#1d2433" />
        ))}
        {/* Signal */}
        <g transform={`translate(1040 ${TRACK_Y - 110})`}>
          <rect x={4} y={40} width={6} height={70} fill="#3a4152" />
          <rect x={-6} y={0} width={26} height={46} rx={4} fill="#10131a" />
          <circle cx={7} cy={13} r={7} fill={signalRed ? "#ff3b3b" : "#2a1416"} />
          <circle cx={7} cy={32} r={7} fill={signalRed ? "#10241a" : "#38e08a"} />
          {signalRed && <circle cx={7} cy={13} r={30} fill="#ff3b3b" opacity={0.18} />}
        </g>
        {/* Train */}
        <g
          className={cn("transition-transform duration-[1400ms] ease-out", !stopped && "motion-safe:animate-[train_14s_linear_infinite]")}
          style={{ transform: stopped ? "translateX(420px)" : undefined }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <g key={i} transform={`translate(${-i * 150} ${TRACK_Y - 44})`}>
              <rect x={0} y={0} width={144} height={42} rx={9} fill="#aeb8c6" />
              <rect x={10} y={10} width={124} height={12} rx={3} fill="#ffc774" />
            </g>
          ))}
        </g>
        {/* Street and lamps */}
        <g fill="#0f141f">
          {near.map((b, i) => (
            <rect key={i} x={b.x} y={STREET_Y + 150 - b.h} width={b.w} height={b.h} opacity={0.6} />
          ))}
        </g>
        <rect x={0} y={STREET_Y} width={W} height={H - STREET_Y} fill="#10151f" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`translate(${120 + i * 280} ${STREET_Y - 160})`}>
            <rect x={0} y={0} width={5} height={160} fill="#2c3342" />
            <rect x={-26} y={-2} width={32} height={5} fill="#2c3342" />
            <ellipse cx={-24} cy={8} rx={10} ry={4} fill="#ffcf8a" />
            <path d={`M -24 8 L -110 ${170} L 60 ${170} Z`} fill="url(#lamp)" />
          </g>
        ))}
        {/* Taxi */}
        <g className="transition-all duration-[1200ms] ease-out" style={{ opacity: taxi ? 1 : 0, transform: `translate(${taxiX}px, ${STREET_Y + 34}px)` }}>
          <ellipse cx={60} cy={10} rx={130} ry={40} fill="url(#amberGlow)" />
          <rect x={0} y={-30} width={120} height={30} rx={8} fill="#f5b301" />
          <rect x={25} y={-52} width={64} height={24} rx={6} fill="#1a2230" />
          <rect x={46} y={-62} width={22} height={9} rx={2} fill="#ffb020" />
          <circle cx={26} cy={0} r={11} fill="#0d0f14" />
          <circle cx={94} cy={0} r={11} fill="#0d0f14" />
          <rect x={116} y={-24} width={6} height={7} fill="#fff2cf" />
        </g>
        {chapter === 4 && <circle cx={W / 2} cy={H / 2} r={380} fill="url(#amberGlow)" />}
      </svg>
      <div
        className="absolute inset-0 transition-opacity duration-1000 motion-reduce:hidden"
        style={{
          opacity: rain,
          backgroundImage: "repeating-linear-gradient(105deg, transparent 0 22px, rgba(180,200,240,0.18) 22px 23px)",
        }}
      />
    </div>
  );
}
