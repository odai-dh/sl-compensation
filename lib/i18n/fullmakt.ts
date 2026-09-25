import { SL_RULES } from "@/lib/core/sl-rules";

export const FULLMAKT_VERSION = "2026-09-v1";

const cap = SL_RULES.maxPayoutPerOccasion.toLocaleString("sv-SE");

/**
 * Draft power of attorney. A lawyer must review this before any real use.
 * Scope is deliberately narrow: SL delay compensation for rides Vidare has paid for, nothing else.
 */
export const FULLMAKT = {
  en: {
    title: "Power of attorney (fullmakt) – SL delay compensation",
    sections: [
      {
        heading: "1. Parties",
        body: "I, the undersigned (the \"Principal\", identified by BankID), give Vidare AB (the \"Agent\") power of attorney as described below.",
      },
      {
        heading: "2. What Vidare may do",
        body: `Vidare may, in my name, file claims for delay compensation (förseningsersättning) with Region Stockholm / SL under Lag (2015:953) om kollektivtrafikresenärers rättigheter and SL's terms of travel, for journeys where Vidare has paid for alternative transport (taxi) on my behalf. This includes submitting the claim, the taxi receipt, trip details and ticket information, answering SL's follow-up questions, and requesting reconsideration (omprövning) of a decision.`,
      },
      {
        heading: "3. Payout",
        body: `Vidare may receive the compensation SL pays for these claims into Vidare's account. The compensation belongs to Vidare, because Vidare has already paid the taxi (up to ${cap} kr per occasion). Any compensation for a ride I paid for myself will be passed on to me in full within 5 banking days.`,
      },
      {
        heading: "4. What Vidare may not do",
        body: "This power of attorney does not cover anything else: Vidare may not buy tickets, change my SL account, file other claims, share my data for marketing, or act for me towards anyone other than SL.",
      },
      {
        heading: "5. Personal data",
        body: "To file claims Vidare processes my name, personal identity number, address, trip and ticket details and taxi receipts. The data is shared only with SL and the taxi partner, and is deleted when a claim is closed and the legal retention period has passed.",
      },
      {
        heading: "6. When SL says no",
        body: "If SL rejects a claim because I did not have a valid ticket or gave incorrect information, Vidare may charge the taxi cost to my registered card. If SL rejects a claim for any other reason, Vidare carries the cost. I will always be told the reason.",
      },
      {
        heading: "7. Validity and revocation",
        body: "This power of attorney is valid until I revoke it. I can revoke it at any time in the app, free of charge. Revocation does not affect claims already filed for rides Vidare has paid for.",
      },
    ],
  },
  sv: {
    title: "Fullmakt – förseningsersättning från SL",
    sections: [
      {
        heading: "1. Parter",
        body: "Jag, undertecknad (\"fullmaktsgivaren\", identifierad med BankID), ger Vidare AB (\"ombudet\") fullmakt enligt nedan.",
      },
      {
        heading: "2. Vad Vidare får göra",
        body: `Vidare får i mitt namn ansöka om förseningsersättning hos Region Stockholm / SL enligt lagen (2015:953) om kollektivtrafikresenärers rättigheter och SL:s resevillkor, för resor där Vidare har betalat alternativ transport (taxi) åt mig. Det omfattar att skicka in ansökan, taxikvitto, resuppgifter och biljettinformation, svara på SL:s följdfrågor och begära omprövning av ett beslut.`,
      },
      {
        heading: "3. Utbetalning",
        body: `Vidare får ta emot ersättningen som SL betalar för dessa ansökningar på Vidares konto. Ersättningen tillfaller Vidare eftersom Vidare redan har betalat taxin (upp till ${cap} kr per tillfälle). Ersättning för en resa som jag själv har betalat förs över till mig i sin helhet inom 5 bankdagar.`,
      },
      {
        heading: "4. Vad Vidare inte får göra",
        body: "Fullmakten gäller inget annat: Vidare får inte köpa biljetter, ändra mitt SL-konto, göra andra ansökningar, dela mina uppgifter för marknadsföring eller företräda mig mot någon annan än SL.",
      },
      {
        heading: "5. Personuppgifter",
        body: "För att ansöka behandlar Vidare mitt namn, personnummer, adress, res- och biljettuppgifter samt taxikvitton. Uppgifterna delas bara med SL och taxipartnern och raderas när ärendet är avslutat och den lagstadgade lagringstiden har gått ut.",
      },
      {
        heading: "6. Om SL säger nej",
        body: "Om SL avslår en ansökan för att jag saknade giltig biljett eller lämnade felaktiga uppgifter får Vidare debitera taxikostnaden på mitt registrerade kort. Om SL avslår av något annat skäl står Vidare för kostnaden. Jag får alltid veta skälet.",
      },
      {
        heading: "7. Giltighet och återkallelse",
        body: "Fullmakten gäller tills jag återkallar den. Jag kan återkalla den när som helst i appen, kostnadsfritt. Återkallelsen påverkar inte ansökningar som redan har skickats för resor som Vidare har betalat.",
      },
    ],
  },
} as const;

export function fullmaktPlainText(lang: "en" | "sv"): { title: string; text: string } {
  const doc = FULLMAKT[lang];
  return {
    title: doc.title,
    text: doc.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n") + `\n\nVersion ${FULLMAKT_VERSION}`,
  };
}
