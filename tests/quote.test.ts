import { describe, expect, it } from "vitest";
import { splitQuote, vatPart } from "@/lib/core/quote";
import { SL_RULES } from "@/lib/core/sl-rules";

describe("splitQuote", () => {
  it("below the cap: Vidare pays everything", () => {
    const s = splitQuote(412);
    expect(s).toMatchObject({ fareSEK: 412, vidarePaysSEK: 412, userPaysSEK: 0, overCap: false, tipCoveredSEK: 0 });
  });

  it("exactly at the cap: still nothing for the user", () => {
    const s = splitQuote(SL_RULES.maxPayoutPerOccasion);
    expect(s.userPaysSEK).toBe(0);
    expect(s.overCap).toBe(false);
  });

  it("above the cap: user pays the difference", () => {
    const s = splitQuote(1710);
    expect(s.vidarePaysSEK).toBe(1480);
    expect(s.userPaysSEK).toBe(230);
    expect(s.overCap).toBe(true);
  });

  it("rounds to whole kronor", () => {
    expect(splitQuote(412.6).fareSEK).toBe(413);
  });

  it("adds the Vidare fee to what the user pays", () => {
    expect(splitQuote(300, { vidareFeeSEK: 19 }).userPaysSEK).toBe(19);
  });

  it("rejects invalid fares", () => {
    expect(() => splitQuote(-1)).toThrow(RangeError);
    expect(() => splitQuote(Number.NaN)).toThrow(RangeError);
  });
});

describe("vatPart", () => {
  it("computes 6 % VAT included in a taxi fare", () => {
    expect(vatPart(106)).toBe(6);
  });
});
