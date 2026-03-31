import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Proxy Nominatim server-side to avoid CORS issues.
// Forward geocoding:  GET /api/geocode?q=Berlin
// Reverse geocoding: GET /api/geocode?lat=52.5&lng=13.4  -> { label: "Berlin, Germany" }
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q   = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // ── Reverse geocoding ────────────────────────────────────────────────────────
  if (lat && lng) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("zoom", "10"); // city-level precision
    url.searchParams.set("addressdetails", "1");

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "TechNova/1.0 (tech-events-app; contact@technova.app)",
        },
        next: { revalidate: 86400 },
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Reverse geocoding upstream error ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const addr = data.address ?? {};
      // Build a short, human-readable "City, Country" label
      const city    = addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? "";
      const country = addr.country ?? "";
      const label   = [city, country].filter(Boolean).join(", ") || data.display_name || "Your Location";

      return NextResponse.json({ label, raw: data });
    } catch (err) {
      console.error("[/api/geocode] Reverse error:", err);
      return NextResponse.json({ error: "Reverse geocoding failed." }, { status: 502 });
    }
  }

  // ── Forward geocoding ────────────────────────────────────────────────────────
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Provide either q or lat+lng." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "TechNova/1.0 (tech-events-app; contact@technova.app)",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Geocoding upstream error ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/geocode] Error:", err);
    return NextResponse.json({ error: "Geocoding failed." }, { status: 502 });
  }
}
