import type { Place } from "@/lib/core/types";

/** Mock address book. Public places only – no real personal addresses. */
export const PLACES: Place[] = [
  { id: "t-centralen", name: "T-Centralen", address: "Vasagatan, 111 20 Stockholm", county: "Stockholm", position: { lat: 59.3313, lng: 18.0598 } },
  { id: "gamla-stan", name: "Gamla stan", address: "Munkbroleden, 111 28 Stockholm", county: "Stockholm", position: { lat: 59.3231, lng: 18.0676 } },
  { id: "slussen", name: "Slussen", address: "Södermalmstorg, 116 45 Stockholm", county: "Stockholm", position: { lat: 59.3195, lng: 18.0722 } },
  { id: "odenplan", name: "Odenplan", address: "Odenplan, 113 22 Stockholm", county: "Stockholm", position: { lat: 59.3429, lng: 18.0496 } },
  { id: "fridhemsplan", name: "Fridhemsplan", address: "Fridhemsplan, 112 40 Stockholm", county: "Stockholm", position: { lat: 59.3322, lng: 18.0296 } },
  { id: "hornstull", name: "Hornstull", address: "Långholmsgatan, 117 33 Stockholm", county: "Stockholm", position: { lat: 59.3157, lng: 18.0339 } },
  { id: "liljeholmen", name: "Liljeholmen", address: "Liljeholmstorget, 117 61 Stockholm", county: "Stockholm", position: { lat: 59.3106, lng: 18.023 } },
  { id: "fruangen", name: "Fruängen", address: "Fruängsgången, 129 52 Hägersten", county: "Stockholm", position: { lat: 59.2856, lng: 17.965 } },
  { id: "norsborg", name: "Norsborg", address: "Skarpbrunnavägen, 145 63 Norsborg", county: "Stockholm", position: { lat: 59.2437, lng: 17.8145 } },
  { id: "ropsten", name: "Ropsten", address: "Hjorthagsvägen, 115 25 Stockholm", county: "Stockholm", position: { lat: 59.3573, lng: 18.1023 } },
  { id: "morby", name: "Mörby centrum", address: "Mörby centrum, 182 31 Danderyd", county: "Stockholm", position: { lat: 59.3984, lng: 18.0362 } },
  { id: "kth", name: "KTH / Tekniska högskolan", address: "Valhallavägen, 114 28 Stockholm", county: "Stockholm", position: { lat: 59.347, lng: 18.0726 } },
  { id: "kista", name: "Kista", address: "Kista galleria, 164 91 Kista", county: "Stockholm", position: { lat: 59.4032, lng: 17.9447 } },
  { id: "solna", name: "Solna centrum", address: "Solna torg, 171 45 Solna", county: "Stockholm", position: { lat: 59.3588, lng: 17.999 } },
  { id: "karolinska", name: "Karolinska sjukhuset", address: "Eugeniavägen, 171 64 Solna", county: "Stockholm", position: { lat: 59.35, lng: 18.0333 } },
  { id: "sthlm-sodra", name: "Stockholm Södra", address: "Rosenlundsgatan, 118 53 Stockholm", county: "Stockholm", position: { lat: 59.3143, lng: 18.062 } },
  { id: "gullmarsplan", name: "Gullmarsplan", address: "Gullmarsplan, 121 40 Johanneshov", county: "Stockholm", position: { lat: 59.2991, lng: 18.0808 } },
  { id: "skarpnack", name: "Skarpnäck", address: "Skarpnäcks torg, 128 33 Skarpnäck", county: "Stockholm", position: { lat: 59.2667, lng: 18.1333 } },
  { id: "hammarby", name: "Hammarby sjöstad", address: "Lugnets allé, 120 66 Stockholm", county: "Stockholm", position: { lat: 59.304, lng: 18.096 } },
  { id: "nacka", name: "Nacka Forum", address: "Forumvägen, 131 53 Nacka", county: "Stockholm", position: { lat: 59.31, lng: 18.1633 } },
  { id: "huddinge", name: "Huddinge station", address: "Stationsvägen, 141 30 Huddinge", county: "Stockholm", position: { lat: 59.2367, lng: 17.9817 } },
  { id: "flemingsberg", name: "Flemingsberg", address: "Hälsovägen, 141 52 Huddinge", county: "Stockholm", position: { lat: 59.2194, lng: 17.9466 } },
  { id: "tumba", name: "Tumba", address: "Tumba torg, 147 30 Tumba", county: "Stockholm", position: { lat: 59.1998, lng: 17.8339 } },
  { id: "sodertalje", name: "Södertälje centrum", address: "Stora torget, 151 73 Södertälje", county: "Stockholm", position: { lat: 59.1955, lng: 17.6253 } },
  { id: "marsta", name: "Märsta", address: "Stationsgatan, 195 30 Märsta", county: "Stockholm", position: { lat: 59.6276, lng: 17.8606 } },
  { id: "arlanda", name: "Arlanda C", address: "Arlanda flygplats, 190 45 Stockholm-Arlanda", county: "Stockholm", position: { lat: 59.6497, lng: 17.9286 } },
  { id: "norrtalje", name: "Norrtälje", address: "Stora torget, 761 30 Norrtälje", county: "Stockholm", position: { lat: 59.758, lng: 18.7049 } },
  { id: "knivsta", name: "Knivsta", address: "Centralvägen, 741 40 Knivsta", county: "Uppsala", position: { lat: 59.7249, lng: 17.788 } },
  { id: "uppsala-c", name: "Uppsala C", address: "Kungsgatan, 753 21 Uppsala", county: "Uppsala", position: { lat: 59.8586, lng: 17.6459 } },
];

export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function findPlace(id: string): Place | undefined {
  return PLACE_BY_ID.get(id);
}

export function findPlaceByName(name: string): Place | undefined {
  return PLACES.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLACES.slice(0, limit);
  return PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)).slice(0, limit);
}
