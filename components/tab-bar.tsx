"use client";

import { FileText, House, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TabBar() {
  const t = useT();
  const path = usePathname();
  const tabs = [
    { href: "/app/home", label: t("tabs.home"), icon: House },
    { href: "/app/claims", label: t("tabs.claims"), icon: FileText },
    { href: "/app/profile", label: t("tabs.profile"), icon: User },
  ];
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-6" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
