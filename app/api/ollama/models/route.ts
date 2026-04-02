import { NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/ollama/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const models = await listAvailableModels();
    // Read selected model from cookie if available
    const cookieHeader = (req as any).headers?.get?.("cookie") ?? "";
    const selected = cookieHeader.split(";").map((s: string) => s.trim()).find((s: string) => s.startsWith("OLLAMA_MODEL="))?.split("=")[1];
    return NextResponse.json({ models, selected: selected ? decodeURIComponent(selected) : null });
  } catch (err) {
    return NextResponse.json({ models: [], selected: null });
  }
}
