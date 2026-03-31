import { AIEnrichment } from "../providers/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";

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
  context: string
): Promise<AIEnrichment> {
  const userMessage = `Event name: ${eventName}\nContext: ${context || "No additional context."}`;

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
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
