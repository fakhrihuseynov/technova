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
  const cached = getCache<{ v: string | null }>(cacheKey);
  if (cached !== null) {
    return NextResponse.json({ image: cached.v });
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

    // Helper: resolve relative URLs
    function resolve(src: string | null): string | null {
      if (!src) return null;
      if (src.startsWith("http")) return src;
      try { return new URL(src, normalised).href; } catch { return null; }
    }

    // Helper: reject obviously bad images
    function isBadImage(src: string): boolean {
      const low = src.toLowerCase();
      return (
        low.includes("favicon") ||
        low.includes("/logo.") ||
        low.includes("logo-") ||
        low.includes("-logo") ||
        low.includes("placeholder") ||
        low.includes("blank.") ||
        low.endsWith(".svg")
      );
    }

    let image: string | null = null;

    // q() extracts capture group 1 — attributes may be quoted OR unquoted (valid HTML5)
    // Pattern: attr=["']?CAPTURED_VALUE  — the optional quotes are outside the group so
    // the captured value is always clean (no surrounding quotes).
    const q = (m: RegExpMatchArray | null) => m?.[1] ?? null;

    // 1) og:image — both attribute orderings, quoted + unquoted
    image ??= resolve(
      q(html.match(/<meta[^>]+property=["']?og:image["']?[^>]+content=["']?([^"'\s>]+)/i)) ??
      q(html.match(/<meta[^>]+content=["']?([^"'\s>]+)["']?[^>]+property=["']?og:image["']?/i)) ??
      null
    );

    // 2) twitter:image / twitter:image:src
    image ??= resolve(
      q(html.match(/<meta[^>]+name=["']?twitter:image(?::src)?["']?[^>]+content=["']?([^"'\s>]+)/i)) ??
      q(html.match(/<meta[^>]+content=["']?([^"'\s>]+)["']?[^>]+name=["']?twitter:image(?::src)?["']?/i)) ??
      null
    );

    // 3) <link rel="image_src">
    image ??= resolve(
      q(html.match(/<link[^>]+rel=["']?image_src["']?[^>]+href=["']?([^"'\s>]+)/i)) ??
      q(html.match(/<link[^>]+href=["']?([^"'\s>]+)["']?[^>]+rel=["']?image_src["']?/i)) ??
      null
    );

    // 4) JSON-LD — look for image field in structured data
    if (!image) {
      const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of ldMatches) {
        try {
          const obj = JSON.parse(m[1]);
          const candidates = [
            obj?.image, obj?.image?.url, obj?.thumbnailUrl,
            obj?.logo?.url, ...(obj?.image ?? []),
          ].flat().filter(Boolean);
          for (const c of candidates) {
            const r = resolve(typeof c === "string" ? c : c?.url ?? null);
            if (r && !isBadImage(r)) { image = r; break; }
          }
        } catch { /* invalid JSON */ }
        if (image) break;
      }
    }

    // 5) First large <img> in the page body (skip tiny icons)
    if (!image) {
      const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
      for (const m of imgMatches) {
        const src = resolve(m[1]);
        if (src && !isBadImage(src) && (src.match(/\.(jpe?g|png|webp)/i) || src.includes("images"))) {
          image = src;
          break;
        }
      }
    }

    // Final sanity: reject bad images
    if (image && isBadImage(image)) image = null;

    setCache(cacheKey, { v: image }, 24 * 60 * 60 * 1_000);
    return NextResponse.json({ image });
  } catch {
    setCache(cacheKey, { v: null }, 60 * 60 * 1_000); // cache failure for 1 h only
    return NextResponse.json({ image: null });
  }
}
