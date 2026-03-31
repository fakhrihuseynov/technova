/**
 * Confs.tech GitHub Provider
 *
 * Data source: https://github.com/tech-conferences/conference-data
 * Community-maintained list of tech conferences. No API key. No signup.
 * Updated regularly by the open-source community.
 */

import { TechEvent, FetchEventsParams, EventsPage } from "./types";

const RAW_BASE =
  "https://raw.githubusercontent.com/tech-conferences/conference-data/master/conferences";

// All available topic files for a given year
const TOPICS = [
  "accessibility", "android", "api", "css", "data", "devops", "dotnet",
  "general", "graphql", "ios", "iot", "java", "javascript", "kotlin",
  "leadership", "networking", "opensource", "performance", "php", "product",
  "python", "rust", "security", "sre", "testing", "typescript", "ux",
];

// ─── Raw shape from the GitHub JSON files ─────────────────────────────────────
interface RawConf {
  name: string;
  url: string;
  startDate: string;   // YYYY-MM-DD
  endDate?: string;
  city: string;
  country: string;
  online?: boolean;
  twitter?: string;
  bluesky?: string;
  mastodon?: string;
}

// ─── Normalise → TechEvent ─────────────────────────────────────────────────────
function normalise(raw: RawConf, topic: string): TechEvent {
  const socialLinks: string[] = [];
  if (raw.twitter) socialLinks.push(`https://twitter.com/${raw.twitter.replace(/^@/, "")}`);
  if (raw.bluesky) socialLinks.push(`https://bsky.app/profile/${raw.bluesky}`);

  // "Purely online" = no physical city/country in dataset
  // "Hybrid" = has a physical venue AND online: true
  // We only skip distance-filtering for purely-online events.
  const isPurelyOnline = !!raw.online && !raw.city;
  const isHybrid      = !!raw.online && !!raw.city;

  const city    = raw.city    ?? (raw.online ? "Online" : "TBA");
  const country = raw.country ?? (raw.online ? "Worldwide" : "TBA");

  let venueName: string;
  if (isPurelyOnline) venueName = "Online Event";
  else if (isHybrid)  venueName = `${city} (+ Online)`;
  else                venueName = city;

  // Dedup key: name + date (topic-agnostic) so cross-listed confs collapse to one
  const dedupId = `ct_${raw.name.replace(/\s+/g, "_")}_${raw.startDate}`;

  return {
    id: dedupId,
    name: raw.name,
    startDateTime: raw.startDate,
    endDateTime: raw.endDate,
    venueName,
    address: "",
    city,
    country,
    category: topic,
    url: raw.url,
    contacts: [],
    socialLinks,
    images: [],
    rawProviderPayload: { ...raw, _topic: topic, _purelyOnline: isPurelyOnline },
  };
}

// ─── Fetch one topic file ──────────────────────────────────────────────────────
async function fetchTopic(year: number, topic: string): Promise<RawConf[]> {
  const url = `${RAW_BASE}/${year}/${topic}.json`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1 h
  if (!res.ok) return [];
  try {
    return await res.json() as RawConf[];
  } catch {
    return [];
  }
}

// ─── Haversine distance km between two lat/lng pairs ─────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Country name → approximate centroid [lat, lng].
// Includes aliases used by confs.tech (e.g. "U.S.A.", "U.K.").
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  // Americas
  "United States": [37.09, -95.71], "U.S.A.": [37.09, -95.71],
  "Canada": [56.13, -106.35], "Mexico": [23.63, -102.55],
  "Brazil": [-14.24, -51.93], "Argentina": [-38.42, -63.62],
  "Chile": [-35.68, -71.54], "Colombia": [4.57, -74.30],
  // Europe
  "Germany": [51.17, 10.45], "France": [46.23, 2.21],
  "United Kingdom": [54.37, -2.0], "U.K.": [54.37, -2.0],
  "Spain": [40.46, -3.75], "Netherlands": [52.13, 5.29],
  "Poland": [51.92, 19.15], "Sweden": [60.13, 18.64],
  "Belgium": [50.50, 4.47], "Italy": [41.87, 12.57],
  "Switzerland": [46.82, 8.23], "Austria": [47.52, 14.55],
  "Czech Republic": [49.82, 15.47], "Denmark": [56.26, 9.50],
  "Finland": [64.47, 25.75], "Norway": [60.47, 8.47],
  "Portugal": [39.40, -8.22], "Greece": [39.07, 21.82],
  "Romania": [45.94, 24.97], "Hungary": [47.16, 19.50],
  "Slovakia": [48.67, 19.70], "Croatia": [45.10, 15.20],
  "Serbia": [44.02, 21.01], "Bulgaria": [42.73, 25.49],
  "Ukraine": [48.38, 31.17], "Russia": [61.52, 105.32],
  // Middle East / Caucasus
  "Turkey": [38.96, 35.24], "Azerbaijan": [40.14, 47.58],
  "Georgia": [42.32, 43.36], "Armenia": [40.07, 45.04],
  "Israel": [31.05, 34.85], "UAE": [23.42, 53.85],
  "Saudi Arabia": [23.89, 45.08],
  // Asia-Pacific
  "India": [20.59, 78.96], "Japan": [36.20, 138.25],
  "China": [35.86, 104.20], "South Korea": [35.91, 127.77],
  "Singapore": [1.35, 103.82], "Australia": [-25.27, 133.78],
  "New Zealand": [-40.90, 174.89], "Thailand": [15.87, 100.99],
  "Indonesia": [-0.79, 113.92], "Philippines": [12.88, 121.77],
  // Africa
  "South Africa": [-30.56, 22.94], "Nigeria": [9.08, 8.68],
  "Kenya": [-0.02, 37.91], "Egypt": [26.82, 30.80],
};

function distanceToConference(
  userLat: number, userLng: number, payload: RawConf & { _purelyOnline?: boolean }
): number {
  if (payload._purelyOnline) return 0; // purely online → always include
  const centroid = COUNTRY_CENTROIDS[payload.country];
  if (!centroid) return 50_000; // unknown country → exclude (push beyond any radius)
  return haversineKm(userLat, userLng, centroid[0], centroid[1]);
}

// Default search radius for conftech (km). Larger than typical proximity search
// because tech conferences are sparse geographically.
const DEFAULT_RADIUS_KM = 3000;

// ─── Main fetch function ───────────────────────────────────────────────────────
export async function fetchConftechEvents(
  params: FetchEventsParams
): Promise<EventsPage> {
  const { lat, lng, radiusKm = DEFAULT_RADIUS_KM, page = 0, size = 20, startDate, endDate } = params;

  const today = new Date();
  const filterStart = startDate ? new Date(startDate) : today;
  const filterEnd = endDate
    ? new Date(endDate)
    : new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()); // 6 months window

  // Determine which years to fetch (current + next if near year end)
  const years = [today.getFullYear()];
  if (today.getMonth() >= 10) years.push(today.getFullYear() + 1); // Nov/Dec: prefetch next year

  // Fetch all topic files in parallel
  const results = await Promise.allSettled(
    years.flatMap((year) => TOPICS.map((topic) => fetchTopic(year, topic).then((confs) =>
      confs.map((c) => normalise(c, topic))
    )))
  );

  // Merge all, deduplicate by id
  const seen = new Set<string>();
  const all: TechEvent[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const ev of r.value) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          all.push(ev);
        }
      }
    }
  }

  // Filter by date window
  const dateFiltered = all.filter((ev) => {
    const d = new Date(ev.startDateTime);
    return d >= filterStart && d <= filterEnd;
  });

  // Annotate with distance
  const annotated = dateFiltered.map((ev) => {
    const payload = ev.rawProviderPayload as RawConf & { _purelyOnline?: boolean };
    return {
      ev,
      dist: distanceToConference(lat, lng, payload),
      date: new Date(ev.startDateTime).getTime(),
      isPurelyOnline: !!payload._purelyOnline,
    };
  });

  // Pool: purely-online events always included; physical/hybrid filtered by radius
  const pool = annotated.filter((x) => x.isPurelyOnline || x.dist <= radiusKm);

  // Sort: purely-online first → nearest physical → soonest date
  pool.sort((a, b) => {
    if (a.isPurelyOnline !== b.isPurelyOnline) return a.isPurelyOnline ? -1 : 1;
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.date - b.date;
  });

  const total = pool.length;
  const totalPages = Math.ceil(total / size) || 1;
  const slice = pool.slice(page * size, (page + 1) * size).map((x) => x.ev);

  return { events: slice, page, totalPages };
}
