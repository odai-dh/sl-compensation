"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { LangToggle } from "@/components/lang-toggle";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ScreenProps = {
  title?: React.ReactNode;
  /** A path, or true for router.back(). */
  back?: string | boolean;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideLang?: boolean;
};

/** A phone screen: header (back, title, language), scrollable content and a sticky footer. */
export function Screen({ title, back, right, footer, children, className, hideLang }: ScreenProps) {
  const router = useRouter();
  const t = useT();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-transparent bg-background/90 px-2 backdrop-blur">
        <div className="w-11">
          {back && (
            <button
              type="button"
              aria-label={t("common.back")}
              onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
              className="flex size-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
          )}
        </div>
        <h1 className="flex-1 truncate text-center text-base font-semibold">{title}</h1>
        <div className="flex min-w-11 items-center justify-end gap-1 pr-1">
          {right}
          {!hideLang && <LangToggle />}
        </div>
      </header>
      <main className={cn("flex-1 px-4 pb-6 pt-2", className)}>{children}</main>
      {footer && (
        <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}
