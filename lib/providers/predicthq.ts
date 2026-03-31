/**
 * PredictHQ Events provider
 *
 * PredictHQ is a purpose-built event intelligence API with full support for
 * tech conferences, meetups, and community events.
 *
 * Free tier (Emu plan): https://www.predicthq.com/pricing
 * Docs: https://docs.predicthq.com/api/events/search-events
 */

import { TechEvent, FetchEventsParams, EventsPage } from "./types";

const BASE_URL = "https://api.predicthq.com/v1";

function getToken(): string | null {
  const key = process.env.PREDICTHQ_API_KEY ?? null;
  if (!key || key.startsWith("YOUR_")) return null;
  return key;
}

// ─── Normalise PredictHQ event → TechEvent ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseEvent(raw: any): TechEvent {
  // PredictHQ geo is [lon, lat] in GeoJSON format
  const [lon, lat] = (raw.geo?.geometry?.coordinates as [number, number]) ?? [0, 0];

  return {
    id: `phq_${raw.id as string}`,
    name: (raw.title as string) ?? "Untitled Event",
    startDateTime: (raw.start as string) ?? "",
    endDateTime: (raw.end as string) ?? undefined,
    venueName: (raw.entities?.[0]?.name as string) ?? (raw.geo?.address?.formatted_address ?? ""),
    address: (raw.geo?.address?.address as string) ?? "",
    city: (raw.geo?.address?.city as string) ?? (raw.location?.[1] ? String(lat) : ""),
    country: (raw.geo?.address?.country_code as string) ?? "",
    url: (raw.url as string) ?? `https://predicthq.com/events/${raw.id as string}`,
    contacts: [],
    socialLinks: [],
    images: [],
    rawProviderPayload: raw,
  };
}

// ─── Main fetch function ───────────────────────────────────────────────────────
export async function fetchPredictHQEvents(
  params: FetchEventsParams
): Promise<EventsPage> {
  const token = getToken();
  if (!token) {
    return { events: [], page: 0, totalPages: 0 };
  }

  const {
    lat,
    lng,
    radiusKm = 100,
    page = 0,
    size = 20,
    startDate,
    endDate,
  } = params;

  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 90);

  const rangeStart = startDate ?? now.toISOString().slice(0, 10);
  const rangeEnd = endDate ?? future.toISOString().slice(0, 10);

  const url = new URL(`${BASE_URL}/events/`);
  url.searchParams.set("category", "conferences,community,expos");
  url.searchParams.set("within", `${radiusKm}km@${lat},${lng}`);
  url.searchParams.set("start.gte", rangeStart);
  url.searchParams.set("start.lte", rangeEnd);
  url.searchParams.set("sort", "start");
  url.searchParams.set("limit", String(size));
  url.searchParams.set("offset", String(page * size));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 401) {
      console.warn("[PredictHQ] Invalid token — skipping provider.");
      return { events: [], page: 0, totalPages: 0 };
    }
    const body = await res.text().catch(() => "");
    throw new Error(`PredictHQ API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: TechEvent[] = ((data.results as any[]) ?? []).map(normaliseEvent);
  const total: number = (data.count as number) ?? 0;
  const totalPages = Math.ceil(total / size) || 1;

  return { events, page, totalPages };
}
