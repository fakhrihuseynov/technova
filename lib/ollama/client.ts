import { AIEnrichment } from "../providers/types";

const OLLAMA_MODEL_ENV = process.env.OLLAMA_MODEL;

// ─── Cross-platform host resolution ────────────────────────────────────────────
// Priority:
//   1. OLLAMA_HOST env var  — explicit override always wins
//   2. host.docker.internal — Docker Desktop on macOS & Windows (auto DNS)
//   3. 172.17.0.1           — Docker default bridge gateway on Linux
//   4. localhost            — bare-metal / local dev fallback
const CANDIDATE_HOSTS: string[] = [
  ...(process.env.OLLAMA_HOST ? [process.env.OLLAMA_HOST] : []),
  "http://host.docker.internal:11434",
  "http://172.17.0.1:11434",
  "http://localhost:11434",
];

async function resolveOllamaHost(): Promise<string> {
  for (const host of CANDIDATE_HOSTS) {
    try {
      // Prefer hosts that expose the chat endpoint. Try an inexpensive OPTIONS
      // request first — many servers will respond to OPTIONS even if POST is
      // required for chat. Treat 200/204/405 as "exists". Fall back to the
      // older /api/tags probe for compatibility.
      try {
        const opt = await fetch(`${host}/api/chat`, {
          method: "OPTIONS",
          signal: AbortSignal.timeout(1_000),
        });
        if (opt.status === 200 || opt.status === 204 || opt.status === 405) {
          return host;
        }
      } catch {
        // ignore and try /api/tags next
      }

      const res = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(1_500),
      });
      if (res.ok) return host;
    } catch {
      // not reachable — try next
    }
  }
  // Nothing reachable; return first candidate so the caller gets a meaningful error
  return CANDIDATE_HOSTS[CANDIDATE_HOSTS.length - 1];
}

// Cache the resolved host for the lifetime of the process (one probe per cold start)
let _resolvedHost: string | null = null;
async function getOllamaHost(): Promise<string> {
  if (!_resolvedHost) _resolvedHost = await resolveOllamaHost();
  return _resolvedHost;
}

// Resolve a sensible model name from the Ollama server if the environment
// variable wasn't provided. Cache the result for the process lifetime.
let _resolvedModel: string | null = null;
async function getOllamaModel(host: string, override?: string): Promise<string> {
  if (override) {
    _resolvedModel = override;
    return override;
  }
  if (OLLAMA_MODEL_ENV) return OLLAMA_MODEL_ENV;
  if (_resolvedModel) return _resolvedModel;

  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) throw new Error("tags fetch failed");
    const data = await res.json();
    const models: Array<{ name?: string; model?: string }> = data.models ?? [];

    const names = models.map((m) => m.name ?? m.model ?? "").filter(Boolean);
    // Choose a deterministic model without hard-coded name preferences:
    // pick the first model alphabetically (stable, predictable), falling
    // back to the first returned name or the env var if present.
    const sorted = names.slice().sort((a, b) => a.localeCompare(b));
    const pick = sorted[0] || names[0] || OLLAMA_MODEL_ENV || "";

    _resolvedModel = pick;
    return _resolvedModel;
  } catch {
    return OLLAMA_MODEL_ENV ?? "";
  }
}

// Return an alphabetically sorted list of available model identifiers from the
// Ollama server. This is used by the settings UI.
export async function listAvailableModels(): Promise<string[]> {
  const host = await getOllamaHost();
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) return [];
    const data = await res.json();
    const models: Array<{ name?: string; model?: string }> = data.models ?? [];
    const names = models.map((m) => m.name ?? m.model ?? "").filter(Boolean);
    return names.sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

const SYSTEM_PROMPT = `You are a tech event analyst. 
Given a tech event name and any available context, respond with ONLY a valid JSON object — no markdown, no extra text.
Use exactly this shape:
{
  "summary": "<1–2 sentence summary of the event>",
  "bestFor": ["<audience1>", "<audience2>"],
  "tags": ["<topic1>", "<topic2>"],
  "confidence": <0.0..1.0>
}
Audiences examples: DevOps, Backend, Frontend, Data, AI/ML, Students, Founders, Product, Embedded, Security.
Tags should be short technology topics (e.g., Kubernetes, LLMs, Python, Cloud, Startup).`;

// ─── Call Ollama REST API ───────────────────────────────────────────────────────
export async function enrichEventWithAI(
  eventName: string,
  context: string,
  modelOverride?: string
): Promise<AIEnrichment> {
  const host = await getOllamaHost();
  const userMessage = `Event name: ${eventName}\nContext: ${context || "No additional context."}`;

  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: await getOllamaModel(host, modelOverride),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      stream: false,
      format: "json",
    }),
    // Generous timeout — local models may be slow
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error ${response.status}`);
  }

  const data = await response.json();
  const raw: string = (data.message?.content as string) ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "No summary available.",
      bestFor: Array.isArray(parsed.bestFor) ? parsed.bestFor : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
    };
  } catch {
    return {
      summary: "AI summary unavailable.",
      bestFor: [],
      tags: [],
      confidence: 0,
    };
  }
}
