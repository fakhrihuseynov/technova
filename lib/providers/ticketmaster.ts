import { TechEvent, FetchEventsParams, EventsPage } from "./types";

const BASE_URL = "https://app.ticketmaster.com/discovery/v2";

function getApiKey(): string {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key || key.startsWith("YOUR_"))
    throw new Error("TICKETMASTER_API_KEY is not configured.");
  return key;
}

// ─── Normalise a raw Ticketmaster event object into TechEvent ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseEvent(raw: any): TechEvent {
  const venue = raw._embedded?.venues?.[0];

  const images: string[] = (raw.images ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((img: any) => img.url as string)
    .filter(Boolean);

  // Attempt to surface social / website links from the promoter block
  const socialLinks: string[] = [];
  if (raw.promoter?.url) socialLinks.push(raw.promoter.url);

  return {
    id: raw.id as string,
    name: raw.name as string,
    startDateTime:
      (raw.dates?.start?.dateTime as string | undefined) ??
      (raw.dates?.start?.localDate as string) ??
      "",
    endDateTime: raw.dates?.end?.dateTime as string | undefined,
    venueName: (venue?.name as string) ?? "Unknown Venue",
    address: (venue?.address?.line1 as string) ?? "",
    city: (venue?.city?.name as string) ?? "",
    country: (venue?.country?.name as string) ?? "",
    url: (raw.url as string) ?? "",
    contacts: [],
    socialLinks,
    images,
    rawProviderPayload: raw,
  };
}

// ─── 90-day window from today ──────────────────────────────────────────────────
function next90DaysRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  return { startDate: fmt(now), endDate: fmt(end) };
}

// ─── Main fetch function ───────────────────────────────────────────────────────
export async function fetchTechEvents(
  params: FetchEventsParams
): Promise<EventsPage> {
  const {
    lat,
    lng,
    radiusKm = 100,   // wider default — better for sparse regions
    page = 0,
    size = 20,
  } = params;

  const { startDate, endDate } = {
    startDate: params.startDate,
    endDate: params.endDate,
    ...(!params.startDate && !params.endDate ? next90DaysRange() : {}),
  };

  const url = new URL(`${BASE_URL}/events.json`);
  url.searchParams.set("apikey", getApiKey());
  url.searchParams.set("latlong", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusKm));
  url.searchParams.set("unit", "km");
  // No keyword filter — Ticketmaster's tech inventory is sparse.
  // Cast the net wide and rely on AI enrichment to surface relevance.
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));
  url.searchParams.set("sort", "date,asc");

  if (startDate) {
    url.searchParams.set("startDateTime", `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    url.searchParams.set("endDateTime", `${endDate}T23:59:59Z`);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ticketmaster API error ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: TechEvent[] = ((data._embedded?.events as any[]) ?? []).map(
    normaliseEvent
  );

  return {
    events,
    page: (data.page?.number as number) ?? 0,
    totalPages: (data.page?.totalPages as number) ?? 1,
  };
}
