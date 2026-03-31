import { NextRequest, NextResponse } from "next/server";
import { fetchTechEvents } from "@/lib/providers/ticketmaster";
import { getCache, setCache } from "@/lib/cache";
import type { EventsPage } from "@/lib/providers/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required and must be numbers." },
      { status: 400 }
    );
  }

  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const radiusKm = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("radius") ?? "50", 10))
  );
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const cacheKey = `events::${lat.toFixed(3)}::${lng.toFixed(3)}::${page}::${radiusKm}::${startDate ?? ""}::${endDate ?? ""}`;
  const cached = getCache<EventsPage>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const result = await fetchTechEvents({
      lat,
      lng,
      radiusKm,
      page,
      startDate,
      endDate,
    });

    // Cache for 5 minutes
    setCache(cacheKey, result, 5 * 60 * 1_000);

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[/api/events] Error fetching events:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch events.";
    // Surface key-config errors as 503 so the client shows a useful message
    const status = message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
