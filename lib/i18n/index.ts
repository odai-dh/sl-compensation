"use client";

import { useCallback } from "react";
import { useApp } from "@/lib/client/store";
import { rulePlaceholders, translate } from "./translate";
import type { DictKey } from "./dictionaries";

export type { DictKey, Lang } from "./dictionaries";
export { rulePlaceholders, translate };

export type TFunction = (key: DictKey, params?: Record<string, string | number>) => string;

/** Translation hook. Rule numbers ({cap}, {min}, …) are filled from sl-rules automatically. */
export function useT(): TFunction {
  const lang = useApp((s) => s.lang);
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

export function useLang() {
  return useApp((s) => s.lang);
}
