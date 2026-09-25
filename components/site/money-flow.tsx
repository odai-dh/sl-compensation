"use client";

import { SL_RULES } from "@/lib/core/sl-rules";
import { useSite } from "@/lib/site/store";

type Node = { id: string; x: number; y: number; label: string; sub: string };
const NODES: Node[] = [
  { id: "you", x: 110, y: 200, label: "You", sub: "stranded" },
  { id: "vidare", x: 400, y: 200, label: "Vidare", sub: "fronts the cost" },
  { id: "taxi", x: 690, y: 80, label: "Taxi", sub: "gets you home" },
  { id: "sl", x: 690, y: 320, label: "SL", sub: "reimburses" },
];

const cap = SL_RULES.maxPayoutPerOccasion.toLocaleString("sv-SE");

const EDGES = [
  { id: "fullmakt", d: "M 160 185 C 240 130, 290 130, 350 185", label: "Fullmakt, signed once", lx: 255, ly: 128 },
  { id: "fare", d: "M 450 180 C 520 100, 580 80, 640 80", label: "Pays the fare", lx: 545, ly: 88 },
  { id: "claim", d: "M 450 215 C 520 290, 580 300, 640 310", label: "Files the claim", lx: 588, ly: 280 },
  { id: "payout", d: "M 650 345 C 560 400, 470 330, 420 250", label: `Pays up to ${cap} kr`, lx: 520, ly: 392 },
];

/** Vidare → taxi, you → fullmakt, Vidare → SL claim, SL → Vidare, with glowing particles on each path. */
export function MoneyFlow() {
  const reducedMotion = useSite((s) => s.reducedMotion);
  return (
    <svg viewBox="0 0 800 420" className="w-full max-w-3xl" role="img" aria-label="Money flow: you sign a fullmakt once, Vidare pays the taxi, Vidare files the claim with SL, and SL pays Vidare back.">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {EDGES.map((e) => (
        <g key={e.id}>
          <path id={`flow-${e.id}`} data-flow-path d={e.d} fill="none" stroke="#ffb020" strokeOpacity={0.55} strokeWidth={2} />
          <text x={e.lx} y={e.ly} textAnchor="middle" fontSize={15} fill="#dbe2ee">
            {e.label}
          </text>
          {!reducedMotion &&
            [0, 0.33, 0.66].map((offset) => (
              <circle key={offset} r={4} fill="#ffcf6b" filter="url(#glow)">
                <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${offset * 2.4}s`}>
                  <mpath href={`#flow-${e.id}`} />
                </animateMotion>
              </circle>
            ))}
        </g>
      ))}
      {NODES.map((n) => (
        <g key={n.id} data-flow-node transform={`translate(${n.x} ${n.y})`}>
          <circle r={46} fill={n.id === "vidare" ? "#ffb020" : "#111828"} stroke="#ffb020" strokeOpacity={0.7} strokeWidth={2} filter={n.id === "vidare" ? "url(#glow)" : undefined} />
          <text y={2} textAnchor="middle" fontSize={20} fontWeight={700} fill={n.id === "vidare" ? "#1a1203" : "#ffffff"}>
            {n.label}
          </text>
          <text y={70} textAnchor="middle" fontSize={13} fill="#9aa7bd">
            {n.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}
