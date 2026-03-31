import { NextRequest, NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/cache";

export const runtime = "nodejs";

/**
 * GET /api/og?url=https://smashingconf.com/amsterdam-2026
 *
 * Fetches the conference page server-side and extracts the og:image meta tag.
 * Cached 24 h per URL to avoid hammering external sites.
 * Returns: { image: string | null }
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ image: null }, { status: 400 });
  }

  // Normalise – strip query strings that would make the cache key unstable
  let normalised: string;
  try {
    const parsed = new URL(url);
    normalised = `${parsed.origin}${parsed.pathname}`;
  } catch {
    return NextResponse.json({ image: null }, { status: 400 });
  }

  const cacheKey = `og::${normalised}`;
  const cached = getCache<string | null>(cacheKey);
  if (cached !== undefined) {
    return NextResponse.json({ image: cached });
  }

  try {
    const res = await fetch(normalised, {
      headers: {
        // Mimic a browser so sites don't block the request
        "User-Agent":
          "Mozilla/5.0 (compatible; TechNova/1.0; +https://technova.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Abort after 5 seconds — we don't want to hold up card rendering
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 0 }, // don't use Next's cache; we handle it ourselves
    });

    if (!res.ok) {
      setCache(cacheKey, null, 24 * 60 * 60 * 1_000);
      return NextResponse.json({ image: null });
    }

    const html = await res.text();

    // Extract og:image — also fall back to twitter:image
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    let image: string | null = ogMatch?.[1] ?? null;

    // Resolve relative URLs
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, normalised).href;
      } catch {
        image = null;
      }
    }

    // Reject overly generic placeholders
    if (image && (image.includes("favicon") || image.includes("logo.png"))) {
      image = null;
    }

    setCache(cacheKey, image, 24 * 60 * 60 * 1_000);
    return NextResponse.json({ image });
  } catch {
    setCache(cacheKey, null, 60 * 60 * 1_000); // cache failure for 1 h only
    return NextResponse.json({ image: null });
  }
}
