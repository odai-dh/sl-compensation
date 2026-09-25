import { z } from "zod";
import { handle } from "@/lib/server/http";
import { searchPlaces } from "@/lib/mock-data/places";
import { PlaceSchema } from "@/lib/schemas";

/** Mock address search (production: a geocoder such as Trafiklab's stop lookup). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return handle(z.array(PlaceSchema), async () => searchPlaces(q, 30));
}
