"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client/api";
import { STEP_ROUTES } from "@/lib/client/routes";
import { useApp } from "@/lib/client/store";

/** Entry point: routes to welcome, the next onboarding step, or home. */
export default function Gate() {
  const router = useRouter();
  const hydrated = useApp((s) => s.hydrated);
  const userId = useApp((s) => s.userId);
  const signOut = useApp((s) => s.signOut);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      router.replace("/app/welcome");
      return;
    }
    api
      .user(userId)
      .then((u) => router.replace(u.onboarded ? "/app/home" : STEP_ROUTES[u.missingSteps[0]]))
      .catch(() => {
        signOut();
        router.replace("/app/welcome");
      });
  }, [hydrated, userId, router, signOut]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
