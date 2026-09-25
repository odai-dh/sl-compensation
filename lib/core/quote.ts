import { VIDARE_POLICY } from "./policy";
import { SL_RULES } from "./sl-rules";

export type QuoteSplit = {
  /** Taxi fare for the shortest route, excluding tip. */
  fareSEK: number;
  /** Paid by Vidare now, reclaimed from SL later. */
  vidarePaysSEK: number;
  /** Charged to the user's card upfront (only the part above SL's cap). */
  userPaysSEK: number;
  /** Tips are never covered; any tip is the user's own business with the driver. */
  tipCoveredSEK: 0;
  vidareFeeSEK: number;
  capSEK: number;
  overCap: boolean;
};

/** Splits a taxi quote into "Vidare pays" and "you pay" using SL's cap. */
export function splitQuote(
  fareSEK: number,
  options: { capSEK?: number; vidareFeeSEK?: number } = {},
): QuoteSplit {
  if (!Number.isFinite(fareSEK) || fareSEK < 0) {
    throw new RangeError(`Invalid fare: ${fareSEK}`);
  }
  const capSEK = options.capSEK ?? SL_RULES.maxPayoutPerOccasion;
  const vidareFeeSEK = options.vidareFeeSEK ?? VIDARE_POLICY.vidareFeeSEK;
  const fare = Math.round(fareSEK);
  const vidarePaysSEK = Math.min(fare, capSEK);
  const userPaysSEK = fare - vidarePaysSEK + vidareFeeSEK;
  return {
    fareSEK: fare,
    vidarePaysSEK,
    userPaysSEK,
    tipCoveredSEK: 0,
    vidareFeeSEK,
    capSEK,
    overCap: fare > capSEK,
  };
}

/** Swedish taxi fares include 6 % VAT. Returns the VAT part of a VAT-inclusive amount. */
export function vatPart(amountInclVat: number, rate = 0.06): number {
  return Math.round((amountInclVat - amountInclVat / (1 + rate)) * 100) / 100;
}
