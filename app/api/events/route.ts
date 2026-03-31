import { NextRequest, NextResponse } from "next/server";
import { fetchConftechEvents } from "@/lib/providers/conftech";
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
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const cacheKey = `events::conftech::${lat.toFixed(3)}::${lng.toFixed(3)}::${page}::${startDate ?? ""}::${endDate ?? ""}`;
  const cached = getCache<EventsPage>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const result = await fetchConftechEvents({ lat, lng, page, startDate, endDate });
    setCache(cacheKey, result, 5 * 60 * 1_000); // 5-minute cache
    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    console.error("[/api/events] conftech error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch events.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

