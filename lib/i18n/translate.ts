import { PRE_ANNOUNCED_DAYS, SL_RULES } from "@/lib/core/sl-rules";
import { dictionaries, type DictKey, type Lang } from "./dictionaries";

export function formatKr(amount: number, lang: Lang): string {
  return `${Math.round(amount).toLocaleString(lang === "sv" ? "sv-SE" : "en-GB").replace(/,/g, " ")} kr`;
}

function tiers(lang: Lang): string {
  return SL_RULES.refundTiers
    .map((t) => `${t.maxDelay === null ? `${t.minDelay}+` : `${t.minDelay}–${t.maxDelay}`} min ${t.percent} %`)
    .join(lang === "sv" ? ", " : ", ");
}

/** Numbers every string may reference, straight from the SL rules. */
export function rulePlaceholders(lang: Lang): Record<string, string | number> {
  return {
    cap: SL_RULES.maxPayoutPerOccasion.toLocaleString("sv-SE"),
    min: SL_RULES.minDelayMinutes,
    days: PRE_ANNOUNCED_DAYS,
    months: SL_RULES.deadlines.complaintMonths,
    weeks: SL_RULES.deadlines.reconsiderationWeeks,
    tiers: tiers(lang),
  };
}

export function translate(lang: Lang, key: DictKey, params: Record<string, string | number> = {}): string {
  const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  const all = { ...rulePlaceholders(lang), ...params };
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in all ? String(all[name]) : m));
}

export function hasKey(key: string): key is DictKey {
  return key in dictionaries.en;
}
