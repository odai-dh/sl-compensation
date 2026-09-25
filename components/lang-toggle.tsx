"use client";

import { useApp } from "@/lib/client/store";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  return (
    <div role="group" aria-label="Language / Språk" className={cn("inline-flex rounded-full bg-muted p-0.5 text-xs font-semibold", className)}>
      {(["en", "sv"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cn(
            "min-w-9 rounded-full px-2.5 py-1.5 uppercase transition-colors",
            lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
