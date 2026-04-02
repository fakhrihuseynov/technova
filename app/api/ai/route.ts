import { NextRequest, NextResponse } from "next/server";
import { enrichEventWithAI } from "@/lib/ollama/client";
import { getCache, setCache } from "@/lib/cache";
import type { AIEnrichment } from "@/lib/providers/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { eventId?: string; eventName?: string; description?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { eventId, eventName, description } = body;

  if (!eventId || !eventName) {
    return NextResponse.json(
      { error: "eventId and eventName are required." },
      { status: 400 }
    );
  }

  // AI results are cached per event id (no TTL expiry — enrichment is stable)
  const cacheKey = `ai::${eventId}`;
  const cached = getCache<AIEnrichment>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    // Check for a per-user model selection stored as a cookie named
    // `OLLAMA_MODEL`. If present, pass it as an override to the enrichment
    // function so each user can pick their preferred model.
    const selectedModel = req.cookies.get("OLLAMA_MODEL")?.value;

    const enrichment = await enrichEventWithAI(
      eventName,
      description ?? "",
      selectedModel
    );

    // Cache AI result for 60 minutes
    setCache(cacheKey, enrichment, 60 * 60 * 1_000);

    return NextResponse.json(enrichment, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    console.error("[/api/ai] Ollama error:", err);
    // Return a graceful degraded response instead of 500
    const fallback: AIEnrichment = {
      summary: "AI enrichment is temporarily unavailable.",
      bestFor: [],
      tags: [],
      confidence: 0,
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
