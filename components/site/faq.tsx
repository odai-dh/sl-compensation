"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, ExternalLink, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { FAQ, type Faq as FaqItem } from "@/lib/site/content";
import { cn } from "@/lib/utils";

/**
 * Opening a question never moves anything else on the page.
 * Desktop: questions on the left, the answer in a panel sized to the longest answer, so switching only crossfades.
 * Phone: a list where answers slide open; several can be open, so nothing above the tapped question moves.
 */
export function Faq() {
  return (
    <>
      <FaqTabs />
      <FaqList />
    </>
  );
}

function Answer({ item, className }: { item: FaqItem; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 leading-relaxed text-[#b3bfd1]", className)}>
      <p>{item.a}</p>
      {item.link && (
        <a
          href={item.link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start font-semibold text-[#ffb020] underline-offset-4 hover:underline"
        >
          {item.link.label} <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}

function FaqTabs() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const to: Record<string, number> = { ArrowDown: selected + 1, ArrowUp: selected - 1, Home: 0, End: FAQ.length - 1 };
    if (!(e.key in to)) return;
    e.preventDefault();
    const next = (to[e.key] + FAQ.length) % FAQ.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="hidden items-start gap-6 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div role="tablist" aria-orientation="vertical" aria-label="Questions" className="flex flex-col gap-1.5" onKeyDown={onKeyDown}>
        {FAQ.map((f, i) => (
          <button
            key={f.q}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`faq-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={`faq-panel-${i}`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-left font-semibold transition-colors",
              i === selected ? "bg-[#ffb020]/12 text-white ring-1 ring-[#ffb020]/40" : "text-[#c9d3e3] hover:bg-white/5 hover:text-white",
            )}
          >
            {f.q}
            <ChevronRight className={cn("size-4 shrink-0 transition-opacity", i === selected ? "text-[#ffb020]" : "opacity-0")} aria-hidden />
          </button>
        ))}
      </div>
      {/* Every answer sits in the same grid cell: the panel is as tall as the longest one and never resizes. */}
      <div className="grid rounded-3xl border border-white/10 bg-[#0e1422]/80 p-8 backdrop-blur">
        {FAQ.map((f, i) => (
          <div
            key={f.q}
            role="tabpanel"
            id={`faq-panel-${i}`}
            aria-labelledby={`faq-tab-${i}`}
            className={cn(
              "col-start-1 row-start-1 flex flex-col gap-4 transition-opacity duration-300",
              i === selected ? "opacity-100" : "invisible opacity-0",
            )}
          >
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{f.q}</h3>
            <Answer item={f} className="text-base" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqList() {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const reduceMotion = useReducedMotion();
  const toggle = (i: number) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {FAQ.map((f, i) => {
        const isOpen = open.has(i);
        return (
          <div key={f.q} className={cn("rounded-3xl border bg-[#0e1422]/80 backdrop-blur", isOpen ? "border-[#ffb020]/40" : "border-white/10")}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-white"
              >
                {f.q}
                <Plus className={cn("size-5 shrink-0 text-[#ffb020] transition-transform", isOpen && "rotate-45")} aria-hidden />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  id={`faq-answer-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <Answer item={f} className="px-5 pb-5 text-sm" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
