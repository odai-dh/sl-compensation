"use client";

import { ArrowRight } from "lucide-react";
import { SL_RULES } from "@/lib/core/sl-rules";
import { useSite } from "@/lib/site/store";
import { cn } from "@/lib/utils";

type Node = { id: string; x: number; y: number; label: string; sub: string };
const NODES: Node[] = [
  { id: "you", x: 110, y: 200, label: "You", sub: "stranded" },
  { id: "vidare", x: 400, y: 200, label: "Vidare", sub: "fronts the cost" },
  { id: "taxi", x: 690, y: 80, label: "Taxi", sub: "gets you home" },
  { id: "sl", x: 690, y: 320, label: "SL", sub: "reimburses" },
];

const cap = SL_RULES.maxPayoutPerOccasion.toLocaleString("sv-SE");

const EDGES = [
  { id: "fullmakt", from: "you", to: "vidare", d: "M 160 185 C 240 130, 290 130, 350 185", label: "Fullmakt, signed once", lx: 255, ly: 128 },
  { id: "fare", from: "vidare", to: "taxi", d: "M 450 180 C 520 100, 580 80, 640 80", label: "Pays the fare", lx: 545, ly: 88 },
  { id: "claim", from: "vidare", to: "sl", d: "M 450 215 C 520 290, 580 300, 640 310", label: "Files the claim", lx: 588, ly: 280 },
  { id: "payout", from: "sl", to: "vidare", d: "M 650 345 C 560 400, 470 330, 420 250", label: `Pays up to ${cap} kr`, lx: 520, ly: 392 },
];

/**
 * Who pays whom. A diagram from md up; on a phone its labels would shrink to a few pixels, so the same
 * four flows are a list there instead.
 */
export function MoneyFlow() {
  return (
    <>
      <MoneyFlowDiagram />
      <MoneyFlowSteps />
    </>
  );
}

function Party({ id }: { id: string }) {
  const node = NODES.find((n) => n.id === id)!;
  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 justify-center rounded-full border border-[#ffb020]/70 py-1.5 text-sm font-bold",
        id === "vidare" ? "bg-[#ffb020] text-[#1a1203] shadow-[0_0_16px_rgba(255,176,32,0.45)]" : "bg-[#111828] text-white",
      )}
    >
      {node.label}
    </span>
  );
}

function MoneyFlowSteps() {
  return (
    <ol className="flex w-full max-w-sm flex-col gap-2 md:hidden" aria-label="Money flow">
      {EDGES.map((e) => (
        <li key={e.id} data-flow-step className="flex items-center gap-2 rounded-2xl bg-[#0e1422]/75 px-3 py-2.5 backdrop-blur">
          <Party id={e.from} />
          <span className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-xs leading-tight text-[#dbe2ee]">
            {e.label}
            <span className="flex w-full items-center text-[#ffb020]" aria-hidden>
              <span className="h-px flex-1 bg-[#ffb020]/60" />
              <ArrowRight className="-ml-1 size-3.5" />
            </span>
          </span>
          <Party id={e.to} />
        </li>
      ))}
    </ol>
  );
}

/** Vidare → taxi, you → fullmakt, Vidare → SL claim, SL → Vidare, with glowing particles on each path. */
function MoneyFlowDiagram() {
  const reducedMotion = useSite((s) => s.reducedMotion);
  return (
    <svg viewBox="0 0 800 420" className="hidden w-full max-w-3xl md:block" role="img" aria-label="Money flow: you sign a fullmakt once, Vidare pays the taxi, Vidare files the claim with SL, and SL pays Vidare back.">
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
