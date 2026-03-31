/**
 * Eventbrite Discovery provider
 *
 * Eventbrite is the primary source for tech meetups, conferences, and
 * workshops. Much better coverage than Ticketmaster for tech events.
 *
 * Docs: https://www.eventbrite.com/platform/api
 * Free token: https://www.eventbrite.com/platform/api#/introduction/authentication
 */

import { TechEvent, FetchEventsParams, EventsPage } from "./types";

const BASE_URL = "https://www.eventbriteapi.com/v3";

function getToken(): string | null {
  const key = process.env.EVENTBRITE_API_KEY ?? null;
  // Treat placeholder values as unconfigured
  if (!key || key.startsWith("YOUR_")) return null;
  return key;
}

// ─── Normalise Eventbrite event → TechEvent ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseEvent(raw: any): TechEvent {
  const venue = raw.venue;
  const images: string[] = raw.logo?.url ? [raw.logo.url as string] : [];

  const socialLinks: string[] = [];
  if (raw.organizer?.website) socialLinks.push(raw.organizer.website as string);

  return {
    id: `eb_${raw.id as string}`,
    name: (raw.name?.text as string) ?? "Untitled Event",
    startDateTime: (raw.start?.utc as string) ?? "",
    endDateTime: (raw.end?.utc as string) ?? undefined,
    venueName: (venue?.name as string) ?? (raw.online_event ? "Online Event" : "TBD"),
    address: (venue?.address?.address_1 as string) ?? "",
    city: (venue?.address?.city as string) ?? "",
    country: (venue?.address?.country as string) ?? "",
    url: (raw.url as string) ?? "",
    contacts: raw.organizer?.name ? [raw.organizer.name as string] : [],
    socialLinks,
    images,
    rawProviderPayload: raw,
  };
}

// ─── 90-day window from today ──────────────────────────────────────────────────
function next90DaysRange(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  return {
    start: now.toISOString().slice(0, 19) + "Z",
    end: end.toISOString().slice(0, 19) + "Z",
  };
}

// ─── Main fetch function ───────────────────────────────────────────────────────
export async function fetchEventbriteEvents(
  params: FetchEventsParams
): Promise<EventsPage> {
  const token = getToken();
  if (!token) {
    // Not configured — return empty page rather than hard failing
    return { events: [], page: 0, totalPages: 0 };
  }

  const {
    lat,
    lng,
    radiusKm = 100,
    page = 0,       // 0-indexed externally; Eventbrite uses 1-indexed
    size = 20,
    startDate,
    endDate,
  } = params;

  const range = next90DaysRange();
  const rangeStart = startDate ? `${startDate}T00:00:00Z` : range.start;
  const rangeEnd = endDate ? `${endDate}T23:59:59Z` : range.end;

  const url = new URL(`${BASE_URL}/events/search/`);
  // Private token must be passed as a query param, not a Bearer header
  url.searchParams.set("token", token);
  // Category 102 = "Science & Technology" on Eventbrite
  url.searchParams.set("categories", "102");
  url.searchParams.set("location.latitude", String(lat));
  url.searchParams.set("location.longitude", String(lng));
  url.searchParams.set("location.within", `${radiusKm}km`);
  url.searchParams.set("start_date.range_start", rangeStart);
  url.searchParams.set("start_date.range_end", rangeEnd);
  url.searchParams.set("expand", "venue,organizer,logo");
  url.searchParams.set("page", String(page + 1)); // convert to 1-indexed
  url.searchParams.set("page_size", String(size));
  url.searchParams.set("sort_by", "date");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    // 401 = bad/placeholder token — degrade silently instead of crashing
    if (res.status === 401) {
      console.warn("[Eventbrite] Invalid token — skipping provider.");
      return { events: [], page: 0, totalPages: 0 };
    }
    const body = await res.text().catch(() => "");
    throw new Error(`Eventbrite API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: TechEvent[] = ((data.events as any[]) ?? []).map(normaliseEvent);

  return {
    events,
    page,
    totalPages: (data.pagination?.page_count as number) ?? 1,
  };
}
