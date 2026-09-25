"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/client/store";

/** Sends signed-out visitors to the welcome screen once local state has loaded. */
export function useRequireUser() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const userId = useApp((s) => s.userId);
  useEffect(() => {
    if (hydrated && !userId) router.replace("/welcome");
  }, [hydrated, userId, router]);
  return hydrated ? userId : null;
}
