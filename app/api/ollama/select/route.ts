import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const model = body?.model;
    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "model required" }, { status: 400 });
    }

    const headers = new Headers();
    // Set cookie for selected model (HttpOnly so only server reads it).
    headers.append(
      "Set-Cookie",
      `OLLAMA_MODEL=${encodeURIComponent(model)}; Path=/; SameSite=Lax; HttpOnly`
    );

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
