/**
 * Typed postMessage protocol between the showcase website (parent) and the app in the iframe.
 * Both sides validate with Zod and check event.origin before trusting a message.
 */
import { z } from "zod";

export const APP_SOURCE = "vidare-app" as const;
export const SITE_SOURCE = "vidare-site" as const;

const rideStatus = z.enum(["searching", "driverAssigned", "arriving", "inProgress", "completed", "cancelled"]);
const claimStatus = z.enum(["submitted", "underReview", "approved", "rejected", "paidOut"]);

/** App → site. */
export const AppEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), path: z.string() }),
  z.object({ type: z.literal("route"), path: z.string() }),
  z.object({
    type: z.literal("disruptionDetected"),
    disruptionId: z.string(),
    delayMinutes: z.number().optional(),
  }),
  z.object({
    type: z.literal("eligibilityChecked"),
    eligible: z.boolean(),
    route: z.enum(["taxi", "ticketRefund", "none"]),
    delayMinutes: z.number(),
  }),
  z.object({ type: z.literal("taxiOrdered"), rideId: z.string(), fareSEK: z.number() }),
  z.object({ type: z.literal("rideStatusChanged"), rideId: z.string(), status: rideStatus, progress: z.number().min(0).max(1) }),
  z.object({ type: z.literal("rideCompleted"), rideId: z.string(), claimId: z.string().nullable() }),
  z.object({ type: z.literal("claimStatusChanged"), claimId: z.string(), status: claimStatus, amountSEK: z.number() }),
  /** Pointer position inside the iframe, for the site's custom cursor. */
  z.object({ type: z.literal("pointer"), x: z.number(), y: z.number(), inside: z.boolean() }),
]);

/** Site → app. */
export const SiteMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("resetDemo") }),
  z.object({ type: z.literal("runJury") }),
  z.object({ type: z.literal("stopJury") }),
  z.object({ type: z.literal("cursor"), hidden: z.boolean() }),
]);

export type AppEvent = z.infer<typeof AppEventSchema>;
export type SiteMessage = z.infer<typeof SiteMessageSchema>;
export type Envelope<S extends string, T> = T & { source: S };

type MessageLike = { origin: string; data: unknown };

/** Returns the parsed app event, or null if the message isn't a trusted, well-formed app event. */
export function readAppEvent(event: MessageLike, expectedOrigin: string): AppEvent | null {
  if (event.origin !== expectedOrigin) return null;
  const data = event.data as { source?: unknown } | null;
  if (!data || typeof data !== "object" || data.source !== APP_SOURCE) return null;
  const parsed = AppEventSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Returns the parsed site message, or null if the message isn't a trusted, well-formed site message. */
export function readSiteMessage(event: MessageLike, expectedOrigin: string): SiteMessage | null {
  if (event.origin !== expectedOrigin) return null;
  const data = event.data as { source?: unknown } | null;
  if (!data || typeof data !== "object" || data.source !== SITE_SOURCE) return null;
  const parsed = SiteMessageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
