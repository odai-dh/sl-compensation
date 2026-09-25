"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useApp, type Theme } from "@/lib/client/store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const t = useT();
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const options: { id: Theme; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: t("common.light") },
    { id: "dark", icon: Moon, label: t("common.dark") },
    { id: "system", icon: Monitor, label: t("common.system") },
  ];
  return (
    <div role="group" aria-label={t("common.theme")} className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
      {options.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-sm text-sm font-medium",
            theme === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
